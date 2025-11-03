// /app/api/chat/route.ts
import {
  StreamingTextResponse,
  experimental_StreamData,
  streamText, // <--- Use streamText
} from 'ai';
import { OpenAI } from '@ai-sdk/openai'; // <--- Use the SDK's OpenAI client
import { NextRequest, NextResponse } from 'next/server';

// Import our refactored orchestrator functions
import {
  orchestratePreamble,
  generateFollowups,
  COACH_SYSTEM,
  Message,
} from '@/lib/orchestrator';

// Import findFeaturedMatching from its correct source file
import { findFeaturedMatching } from '@/lib/marketplace';

export const runtime = 'nodejs'; // Must be nodejs for supabaseAdmin
export const dynamic = 'force-dynamic';

// Initialize the SDK's OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Helper to provide default followups on error
function defaultFollowups(): string[] {
  return [
    'Find local apprenticeships',
    'Explore training programs',
    'Compare typical salaries (BLS)',
  ].slice(0, 3);
}

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
      domainGuarded,
    } } = await orchestratePreamble({ messages, location });

    // 2. Handle guard conditions
    if (domainGuarded) {
      return NextResponse.json({
        answer:
          'I focus on modern manufacturing careers. We can explore roles like CNC Machinist, Robotics Technician, Welding Programmer, Additive Manufacturing, Maintenance Tech, or Quality Control.',
        followups: defaultFollowups(),
      });
    }

    // 3. Prepare the final LLM call
    // Combine system prompts into one string for streamText
    const systemPrompt = [
      COACH_SYSTEM,
      effectiveLocation ? `User location: ${effectiveLocation}` : ''
    ].join('\n');


    // 4. Initialize Vercel AI SDK StreamData
    const data = new experimental_StreamData();

    // 5. Call streamText
    const result = await streamText({
      model: openai('gpt-4o'), // Use the SDK's client
      system: systemPrompt,
      messages: messagesForLLM,
      onFinish: async (result) => {
        // This logic runs *after* the stream is done
        const completion = result.text; // Get the full text

        // a. Find Featured Listings
        let answerWithFeatured = completion;
        try {
          const featured = await findFeaturedMatching(
            lastUserRaw,
            effectiveLocation
          );
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
        if (internalRAG) {
          finalAnswerWithSteps = finalAnswerWithSteps.replace(
            /(\n\n\*\*Next Steps:\*\*.*)/is,
            ''
          );
          finalAnswerWithSteps += `\n\n**Next Steps**
You can also search for more opportunities on your own:
* [Search SkillStrong Programs](/programs/all)
* [Search SkillStrong Jobs](/jobs/all)
* [Search US Department of Education for programs](https://collegescorecard.ed.gov/)
* [Search for jobs on Indeed.com](https://www.indeed.com/)`;
        }

        // c. Generate Followups
        const followups = await generateFollowups(
          lastUserRaw,
          finalAnswerWithSteps,
          effectiveLocation
        );

        // d. Append final data to the StreamData
        data.append({
          finalAnswer: finalAnswerWithSteps,
          followups: followups,
        });

        // e. Close the StreamData
        data.close();
      },
      experimental_streamData: true, // Tell it to use the data stream
    });

    // 7. Return the streaming response
    return result.toDataStreamResponse(data);
    
  } catch (e: any) {
    if (e.message === 'LOCATION_REQUIRED') {
      // Handle the specific "location missing" error
      return NextResponse.json({
        answer:
          'To find local results, please set your location using the button in the header.',
        followups: [],
      });
    }

    console.error("Error in /api/chat route:", e);
    return NextResponse.json(
      { answer: "Sorry, I couldn't process that.", followups: [] },
      { status: 500 }
    );
  }
}
