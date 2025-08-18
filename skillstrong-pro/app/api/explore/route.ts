// /app/api/explore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = `You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector.

**Your Persona:**
- Your tone is encouraging and clear.
- Provide informative and detailed answers, using headings and markdown lists.
- Use emojis sparingly for main topics only.

**Your Core Logic:**
1.  **Handle Quiz Results:** If \`QUIZ_RESULTS\` are provided, your SOLE task is to provide personalized career recommendations based on them. Your follow-ups MUST be specific to the careers you recommend.
2.  **Handle Local Searches:** If you are given \`CONTEXT\` from a search, you MUST synthesize it into a summary of actual job openings with clickable links. You are forbidden from telling the user to search elsewhere. If context is empty, state that you couldn't find any specific openings and suggest broader search terms as a helpful next step.
3.  **Ask for Location:** If a search is requested but the user's location is unknown (passed as 'CONTEXT: Location Unknown'), your ONLY response must be to ask the user to set their location using the controls in the app. Your answer should be "To find local results, please set your location using the button in the footer." and the followups array must be empty.

**Output Format:** You MUST reply with a single JSON object with 'answer' and 'followups' keys. For Gemini, your ENTIRE output must be ONLY the raw JSON object.
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
            const searchKeywords = ['near me', 'in my area', 'jobs', 'openings', 'apprenticeships', 'local'];
            const lowerCaseMessage = latestUserMessage.toLowerCase();
            const isLocalSearch = searchKeywords.some(keyword => lowerCaseMessage.includes(keyword)) || /\b\d{5}\b|\b[A-Z]{2}\b/i.test(latestUserMessage);

            if (isLocalSearch) {
                if (location) {
                    const searchQueryGenPrompt = `Generate a concise Google search query for: "${latestUserMessage}" in the location "${location}".`;
                    const queryGenResponse = await openai.chat.completions.create({
                        model: 'gpt-4o', messages: [{ role: 'user', content: searchQueryGenPrompt }], max_tokens: 30,
                    });
                    const searchQuery = queryGenResponse.choices[0].message?.content?.trim();
                    if (searchQuery) {
                        const searchResults = await performSearch(searchQuery, req);
                        context = `CONTEXT:\n${JSON.stringify(searchResults.length > 0 ? searchResults : "No results found.")}`;
                    }
                } else {
                    context = `CONTEXT: Location Unknown`;
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
                model: 'gpt-4o',
                messages: fullMessages,
                temperature: 0.3,
                response_format: { type: "json_object" },
            });
            content = response.choices[0].message?.content || '{}';
        } else { // Gemini
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const chat = model.startChat({
                history: fullMessages.filter(m => m.role !== 'system' && m.role !== 'user').map(m => ({ role: 'model', parts: [{ text: m.content }] })),
                generationConfig: { temperature: 0.4 }
            });
            const result = await chat.sendMessage(systemPrompt + "\n\n" + fullMessages.filter(m => m.role === 'user').map(m => m.content).join("\n"));
            const textResponse = result.response.text();
            
            try {
                content = textResponse.match(/{[\s\S]*}/)![0];
                JSON.parse(content);
            } catch (e) {
                const escapedAnswer = textResponse.replace(/"/g, '\\"').replace(/\n/g, '\\n');
                content = `{ "answer": "${escapedAnswer}", "followups": [] }`;
            }
        }
        
        const parsedContent = JSON.parse(content);
        if (parsedContent.followups && (parsedContent.followups.length > 0 || messages.length > 0) && !parsedContent.answer.toLowerCase().includes("please set your location")) {
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
