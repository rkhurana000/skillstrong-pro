// /app/api/explore/route.ts

const systemPrompt = `You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = `You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector.

**Your Persona:**
- Your tone is encouraging, clear, and geared towards students.
- Be concise. Use short paragraphs and markdown lists.
- Use emojis sparingly, only for main topics (e.g., 💰 Salary, 🔩 Skills).

**Your Core Logic:**
1.  **Analyze the Request:** First, determine the user's intent. Are they asking a general question, asking for a local search, or have they provided quiz results?
2.  **Handle Quiz Results:** If the user provides \`QUIZ_RESULTS\`, your SOLE task is to act as a career counselor. Your response MUST start with the exact phrase: "Based on your interests, here are a few career paths I recommend you explore:". Then, list 3 careers that match their quiz answers, with a one-sentence explanation for each. Your follow-ups MUST be specific to the careers you just recommended (e.g., "Tell me more about [Career A]").
3.  **Handle Local Searches:** If the user asks for local jobs/training AND provides a location, you will be given \`CONTEXT\` from a search. You MUST synthesize this context into a summary of 3-4 actual job openings with clickable markdown links. You are forbidden from telling the user to search elsewhere. If context is empty, say you couldn't find results.
4.  **Ask for Location:** If the user asks for local information but provides NO location, your only goal is to ask for their city, state, or ZIP code.
5.  **Default Behavior:** For any other general question, provide a helpful answer about manufacturing careers.
6.  **Always Provide Follow-ups:** Every response must include relevant follow-up choices.

**Output Format:** You MUST reply with a single JSON object with 'answer' and 'followups' keys.
`;

async function performSearch(query: string, req: NextRequest): Promise<any[]> { /* ... (same as before) ... */ }

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const provider = searchParams.get('provider') || 'openai'; // Get provider from URL
        const { messages, quiz_results } = await req.json();
        const latestUserMessage = messages[messages.length - 1]?.content || '';

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        let context = "";

        if (quiz_results) {
            context = `The user has provided these QUIZ_RESULTS: ${JSON.stringify(quiz_results)}. Analyze them now.`;
        } else {
            // ... (search logic is the same as before)
        }
        
        const fullMessages = [
            { role: 'system', content: systemPrompt },
            ...messages,
            ...(context ? [{ role: 'system', content: context }] : [])
        ];
        
        let content = '';

        if (provider === 'openai') {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o', messages: fullMessages, temperature: 0.3, response_format: { type: "json_object" },
            });
            content = response.choices[0].message?.content || '{}';
        } else { // Gemini
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const geminiMessages = [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: "Understood." }] }, ...messages.map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }))];
            
            const result = await model.generateContent({ contents: geminiMessages });
            let textResponse = result.response.text();
            
            const jsonMatch = textResponse.match(/```json\n([\s\S]*)\n```/);
            content = jsonMatch ? jsonMatch[1] : `{ "answer": "${textResponse.replace(/"/g, '\\"').replace(/\n/g, '\\n')}", "followups": [] }`;
        }

        if (!content) { throw new Error("Empty response from AI"); }
        
        const parsedContent = JSON.parse(content);

        if (parsedContent.followups) {
            parsedContent.followups.push("↩️ Explore other topics");
        }

        return NextResponse.json(parsedContent);

    } catch (error) {
        console.error("Error in /api/explore:", error);
        return NextResponse.json({ 
            answer: "Sorry, I encountered an error. Please try asking in a different way.",
            followups: ["↩️ Explore other topics"]
        }, { status: 500 });
    }
}
