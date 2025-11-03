// /app/api/chat/route.ts
import { 
  OpenAIStream, 
  StreamingTextResponse, 
  experimental_StreamData 
} from 'ai';
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

// Import our refactored orchestrator functions
import {
  orchestratePreamble,
  generateFollowups,
  findFeaturedMatching,
  COACH_SYSTEM,
  Message,
} from '@/lib/orchestrator';

export const runtime = 'nodejs'; // Must be nodejs for supabaseAdmin
export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, location } = body;

  try {
    // 1. Run all "pre-work" (RAG, context building, checks)
    const { 
      messagesForLLM, 
      lastUserRaw, 
      effectiveLocation, 
      internalRAG,
      domainGuarded 
    } = await orchestratePreamble({ messages, location });

    // 2. Handle guard conditions
    if (domainGuarded) {
      return NextResponse.json({ 
        answer: 'I focus on modern manufacturing careers. We can explore roles like CNC Machinist, Robotics Technician, Welding Programmer, Additive Manufacturing, Maintenance Tech, or Quality Control.',
        followups: ['Explore CNC Machinist careers', 'Find local apprenticeships', 'Compare typical salaries (BLS)']
      });
    }

    // 3. Prepare the final LLM call
    const systemMessages: Message[] = [
      { role: 'system', content: COACH_SYSTEM },
    ];
    if (effectiveLocation) {
      systemMessages.push({ role: 'system', content: `User location: ${effectiveLocation}` });
    }

    // 4. Create the stream
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [...systemMessages, ...messagesForLLM],
      stream: true,
    });

    // 5. Initialize Vercel AI SDK StreamData
    const data = new experimental_StreamData();
    
    // 6. Create the stream, with post-work in onFinal
    const stream = OpenAIStream(response, {
      onFinal: async (completion) => {
        // Now that the stream is done, `completion` is the full answer.
        // Run the "post-work".

        // a. Find Featured Listings
        let answerWithFeatured = completion;
        try {
          const featured = await findFeaturedMatching(lastUserRaw, effectiveLocation);
          if (Array.isArray(featured) && featured.length > 0) {
            const locTxt = effectiveLocation ? ` near ${effectiveLocation}` : '';
            const lines = featured
              .map((f: any) => `- **${f.title}** — ${f.org} (${f.location})`)
              .join('\n');
            answerWithFeatured += `\n\n**Featured${locTxt}:**\n${lines}`;
          }
        } catch (err) {
          console.error('Error finding featured items:', err);
        }

        // b. Add "Next Steps"
        let finalAnswerWithSteps = answerWithFeatured;
        if (internalRAG) { // Check if we triggered the internal search
          finalAnswerWithSteps = finalAnswerWithSteps.replace(/(\n\n\*\*Next Steps:\*\*.*)/is, '');
          finalAnswerWithSteps += `\n\n**Next Steps**
You can also search for more opportunities on your own:
* [Search SkillStrong Programs](/programs/all)
* [Search SkillStrong Jobs](/jobs/all)
* [Search US Department of Education for programs](https://collegescorecard.ed.gov/)
* [Search for jobs on Indeed.com](https://www.indeed.com/)`;
        }
        
        // c. Generate Followups
        const followups = await generateFollowups(lastUserRaw, finalAnswerWithSteps, effectiveLocation);

        // d. Append followups and final answer (with featured/steps) to the data stream
        data.append({
          finalAnswer: finalAnswerWithSteps, // Send the *full* final answer
          followups: followups,
        });

        // e. Close the data stream
        data.close();
      },
      // Append the data stream to the main response
      experimental_streamData: true,
    });

    // 7. Return the streaming response
    return new StreamingTextResponse(stream, {}, data);

  } catch (e: any) {
    if (e.message === "LOCATION_REQUIRED") {
      // Handle the specific "location missing" error
      return NextResponse.json({ 
        answer: 'To find local results, please set your location using the button in the header.',
        followups: []
      });
    }
    
    console.error("Error in /api/chat route:", e);
    return NextResponse.json(
      { answer: "Sorry, I couldn't process that.", followups: [] },
      { status: 500 }
    );
  }
}
