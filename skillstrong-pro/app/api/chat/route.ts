// /app/api/chat/route.ts
import {
  StreamingTextResponse,
  experimental_StreamData,
} from 'ai';
import OpenAI from 'openai';
// We also need the OpenAI chunk type
import type { ChatCompletionChunk } from 'openai/resources/chat/completions'; 
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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    } = await orchestratePreamble({ messages, location });

    // 2. Handle guard conditions
    if (domainGuarded) {
      return NextResponse.json({
        answer:
          'I focus on modern manufacturing careers. We can explore roles like CNC Machinist, Robotics Technician, Welding Programmer, Additive Manufacturing, Maintenance Tech, or Quality Control.',
        followups: defaultFollowups(),
      });
    }

    // 3. Prepare the final LLM call
    const systemMessages: Message[] = [
      { role: 'system', content: COACH_SYSTEM },
    ];
    if (effectiveLocation) {
      systemMessages.push({
        role: 'system',
        content: `User location: ${effectiveLocation}`,
      });
    }

    // 4. Create the OpenAI stream
    const responseStream = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [...systemMessages, ...messagesForLLM],
      stream: true,
    });

    // 5. Initialize Vercel AI SDK StreamData
    const data = new experimental_StreamData();

    // 6. Manually create the stream and handle post-processing
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullResponse = '';

        // 1. Stream the AI response chunks
        for await (const chunk of responseStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullResponse += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }

        // 2. Now that streaming is done, run post-processing
        try {
          // a. Find Featured Listings
          let answerWithFeatured = fullResponse;
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

          // b. Add "Next Steps"
          let finalAnswerWithSteps = answerWithFeatured;
          if (internalRAG) {
            // Check if we triggered the internal search
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
        } catch (postError) {
          console.error("Error during stream post-processing:", postError);
          // Still append *something* so the client knows we're done
          data.append({
            finalAnswer: fullResponse, // Send whatever we had
            followups: defaultFollowups(), // Use defaults
          });
        } finally {
          // 3. Close both the StreamData and the ReadableStream controller
          data.close();
          controller.close();
        }
      },
    });

    // 7. Return the streaming response
    return new StreamingTextResponse(stream, {}, data);
    
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
