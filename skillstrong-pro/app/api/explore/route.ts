// /app/api/explore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = `You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector.

**Your Persona:**
- Your tone is encouraging, clear, and geared towards students.
- Provide informative and detailed answers, using headings and markdown lists to keep the content scannable.
- Use emojis sparingly, for main topics only (e.g., 💰 Salary, 🔩 Skills).

**Your Core Logic:**
1.  **Handle Quiz Results:** If the user provides \`QUIZ_RESULTS\`, your SOLE task is to act as a career counselor. Start your response with "Based on your interests...". Your follow-ups MUST be specific to the careers you just recommended.
2.  **Handle Local Searches:** If you are given \`CONTEXT\` from a search, you MUST synthesize it into a summary of actual job openings with clickable links. You are forbidden from telling the user to search elsewhere. If context is empty, state that you couldn't find results.
3.  **Ask for Location:** If a user asks for local information but NO location is provided in the context, your only goal is to ask them to type their city, state, or ZIP code into the input bar. Your answer should be "To find local results, I need to know your location. Please type your city, state, or ZIP code." and your follow-ups should be empty.

**Output Format:** You MUST reply with a single JSON object with 'answer' and 'followups' keys. For Gemini, your ENTIRE output must be ONLY the raw JSON object, with no other text or markdown formatting.
`;

async function performSearch(query: string, req: NextRequest): Promise<any[]> {
    const searchApiUrl = new URL('/api/search', req.url);
    try {
        const response = await fetch(searchApiUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to call internal search API:", error);
        return [];
    }
}

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const provider = searchParams.get('provider') || 'openai';
        const { messages, quiz_results, location } = await req.json();
        const latestUserMessage = messages[messages.length - 1]?.content || '';

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        let context = "";

        if (quiz_results) {
            context = `CONTEXT: The user has provided these QUIZ_RESULTS: ${JSON.stringify(quiz_results)}. Analyze them now.`;
        } else {
            const searchDecisionPrompt = `Does the user's latest message ask for local jobs, apprenticeships, or training programs? Answer ONLY with YES or NO. Message: "${latestUserMessage}"`;
            const decisionResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini', messages: [{ role: 'user', content: searchDecisionPrompt }], max_tokens: 3,
            });
            const decision = decisionResponse.choices[0].message?.content?.trim().toUpperCase();

            if (decision === 'YES') {
                if (location) {
                    const searchQueryGenPrompt = `Generate a concise Google search query for: "${latestUserMessage}" in the location "${location}".`;
                    const queryGenResponse = await openai.chat.completions.create({
                        model: 'gpt-4o-mini', messages: [{ role: 'user', content: searchQueryGenPrompt }], max_tokens: 30,
                    });
                    const searchQuery = queryGenResponse.choices[0].message?.content?.trim();
                    if (searchQuery) {
                        const searchResults = await performSearch(searchQuery, req);
                        context = `CONTEXT:\n${JSON.stringify(searchResults.length > 0 ? searchResults : "No results found.")}`;
                    }
                } else {
                    // If a search is needed but no location is known, let the prompt handle asking for it.
                    context = `CONTEXT: The user's location is unknown.`;
                }
            }
        }
        
        const fullMessages = [
            { role: 'system', content: systemPrompt },
            ...messages,
            ...(context ? [{ role: 'system', content: context }] : [])
        ];
        
        let content = '';

        if (provider === 'openai') {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o', // Using the upgraded GPT-4o model
                messages: fullMessages,
                temperature: 0.3,
                response_format: { type: "json_object" },
            });
            content = response.choices[0].message?.content || '{}';
        } else { // Gemini
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const chat = model.startChat({ history: fullMessages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })) });
            
            const result = await chat.sendMessage(systemPrompt + "\n" + latestUserMessage);
            const textResponse = result.response.text();
            
            try {
                // Attempt to parse the entire response as JSON first
                JSON.parse(textResponse);
                content = textResponse;
            } catch (e) {
                // If it fails, try to extract a JSON object from the text
                const jsonMatch = textResponse.match(/{[\s\S]*}/);
                if (jsonMatch) {
                    content = jsonMatch[0];
                } else {
                    // Final fallback
                    const escapedAnswer = textResponse.replace(/"/g, '\\"').replace(/\n/g, '\\n');
                    content = `{ "answer": "${escapedAnswer}", "followups": [] }`;
                }
            }
        }
        
        const parsedContent = JSON.parse(content);

        if (parsedContent.followups && (parsedContent.followups.length > 0 || messages.length > 0)) {
            parsedContent.followups.push("↩️ Explore other topics");
        }

        return NextResponse.json(parsedContent);

    } catch (error) {
        console.error("Error in /api/explore:", error);
        return NextResponse.json({ 
            answer: "Sorry, I encountered an error. Please try again.",
            followups: ["↩️ Explore other topics"]
        }, { status: 500 });
    }
}
