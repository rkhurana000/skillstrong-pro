// /app/api/chat/route.ts
import {
  OpenAIStream,
  StreamingTextResponse,
  experimental_StreamData,
} from 'ai';
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

import {
  orchestratePreamble,
  generateFollowups,
  COACH_SYSTEM,
  Message,
} from '@/lib/orchestrator';

import { findFeaturedMatching } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function defaultFollowups(): string[] {
  return [
    'Find local apprenticeships',
    'Explore training programs',
    'Compare typical salaries (BLS)',
  ].slice(0, 3);
}

function quickStreamResponse(text: string): StreamingTextResponse {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new StreamingTextResponse(stream);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, location } = body;
  
  let messagesForLLM: Message[] = [];
  let lastUserRaw = '';
  let effectiveLocation: string | null = null;
  let internalRAG = '';

  try {
    // 1. Run all "pre-work" (RAG, context building, checks)
    const preambleResult = await orchestratePreamble({ messages, location });
    
    messagesForLLM = preambleResult.messagesForLLM;
    lastUserRaw = preambleResult.lastUserRaw;
    effectiveLocation = preambleResult.effectiveLocation;
    internalRAG = preambleResult.internalRAG;
    
    // 2. Handle guard conditions — must return streaming format for useChat
    if (preambleResult.domainGuarded) {
      return quickStreamResponse(
        'I focus on modern manufacturing careers. We can explore roles like CNC Machinist, Robotics Technician, Welding Programmer, Additive Manufacturing, Maintenance Tech, or Quality Control.'
      );
    }

    // 3. Prepare the final LLM call
    const systemMessages: Message[] = [
      { id: 'system_prompt', role: 'system', content: COACH_SYSTEM },
    ];
    if (effectiveLocation) {
      systemMessages.push({
        id: 'system_location',
        role: 'system',
        content: `User location: ${effectiveLocation}`,
      });
    }

    // 4. Create the OpenAI stream
    const responseStream = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [...systemMessages, ...messagesForLLM] as any, // Fix 1
      stream: true,
    });

    // 5. Initialize Vercel AI SDK StreamData
    const data = new experimental_StreamData();

    // 6. Convert the OpenAI stream to the Vercel AI SDK stream (v3 style)
    const stream = OpenAIStream(responseStream as any, {
      onFinal: async (completion) => {
        try {
          let finalAnswer = completion;

          // a. Find Featured Listings (fast Supabase query)
          try {
            const featured = await findFeaturedMatching(
              lastUserRaw,
              effectiveLocation ?? undefined
            );
            if (Array.isArray(featured) && featured.length > 0) {
              const locTxt = effectiveLocation ? ` near ${effectiveLocation}` : '';
              const lines = featured
                .map((f: any) => `- **${f.title}** — ${f.org} (${f.location})`)
                .join('\n');
              finalAnswer += `\n\n**Featured${locTxt}:**\n${lines}`;
            }
          } catch (err) {
            console.error('Error finding featured items:', err);
          }

          // b. Add "Next Steps"
          if (internalRAG) {
            finalAnswer = finalAnswer.replace(
              /(\n\n\*\*Next Steps:\*\*.*)/is,
              ''
            );
            finalAnswer += `\n\n**Next Steps**
You can also search for more opportunities on your own:
* [Search SkillStrong Programs](/programs/all)
* [Search SkillStrong Jobs](/jobs/all)
* [Search US Department of Education for programs](https://collegescorecard.ed.gov/)
* [Search for jobs on Indeed.com](https://www.indeed.com/)
* [Find training institutions (Workforce Almanac)](https://workforcealmanac.com/explore)
* [Search community colleges (College Navigator)](https://nces.ed.gov/collegenavigator/)`;
          }

          // c. Append data WITHOUT followups — client fetches them separately
          data.append(JSON.stringify({
            finalAnswer: finalAnswer,
            followups: [],
          }));
        } catch (err) {
          console.error('Error in onFinal:', err);
          data.append(JSON.stringify({
            finalAnswer: completion,
            followups: [],
          }));
        } finally {
          data.close();
        }
      },
      experimental_streamData: true,
    });

    // 7. Return the streaming response
    return new StreamingTextResponse(stream, {}, data);
    
  } catch (e: any) {
    if (e.message === 'LOCATION_REQUIRED') {
      return quickStreamResponse(
        'To find local results, please set your location using the **Set Location** button in the header.'
      );
    }

    console.error("Error in /api/chat route:", e);
    return quickStreamResponse(
      "Sorry, I couldn't process that request. Please try rephrasing your question about manufacturing careers."
    );
  }
}
