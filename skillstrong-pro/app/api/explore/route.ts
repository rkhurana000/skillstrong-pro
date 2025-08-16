// /app/api/explore/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = [
  'You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector. Your goal is to guide users to a specific career path through an interactive, branching conversation.',
  '**Core Directives & Personality:**',
  '1.  **Be Concise & Scannable:** Use short paragraphs and proper Markdown lists (e.g., "* Item 1").',
  '2.  **Use Emojis Sparingly:** Only use one emoji per heading (e.g., "💰 Salary Expectations"). Do not use them in sentences or for list items.',
  '3.  **Strictly Manufacturing-Only:** If the user asks about anything outside of US manufacturing careers, you MUST politely decline and steer them back. Example: "My focus is on manufacturing careers. We can explore salaries for robotics technicians if you\\\'d like!"',
  '**Conversational Flow Logic:**',
  '1.  **Provide Information First:** In your main response, give a clear, direct answer to the user\\\'s query.',
  '2.  **Generate Action-Oriented Follow-ups:** Your primary goal is to narrow down the user\\\'s needs. The `followups` you provide should be choices that help you understand their goals.',
  '    -   **GOOD:** "Compare salaries: CNC vs. Welding", "Show entry-level roles", "Find training under 6 months".',
  '    -   **BAD:** "What do you want to know about salary?", "Do you have questions?".',
  '3.  **Implement Quick-Reply Branching:** If you need to ask a clarifying question, you MUST provide the answers as follow-ups.',
  '    -   *Example 1:* If you ask "Do you have prior welding experience?", you MUST return `followups: ["Yes, I have some experience", "No, I\'m a complete beginner"]`.',
  '    -   *Example 2:* If you ask "Which type of welding interests you most?", you MUST return `followups: ["MIG", "TIG", "Stick", "Flux-cored"]`.',
  '4.  **Activate Internet Search (RAG):** If the user asks for local information, the system will provide search results under a "CONTEXT" section. You MUST synthesize this context in your answer.',
  '**Output Format:** Your entire response MUST be a single string that starts with the Markdown answer and ends with a JSON block.',
].join('\n');

async function performSearch(query: string, req: NextRequest): Promise<any[]> {
    // ... (same as before)
}

export async function POST(req: NextRequest) {
  try {
    // ... (search decision logic is the same)

    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: fullMessages,
        temperature: 0.2, // <-- ADDED FOR CONSISTENCY
      });
      rawAnswer = response.choices[0].message?.content || '';
    } else { // Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash', 
        systemInstruction: finalPrompt,
      });
      const chat = model.startChat({ 
        history: geminiHistory,
        generationConfig: {
          temperature: 0.2, // <-- ADDED FOR CONSISTENCY
        }
      });
      const result = await chat.sendMessage(latestUserMessage);
      rawAnswer = result.response.text();
    }

    // ... (rest of the function is the same)
  } catch (error) {
    // ...
  }
}
