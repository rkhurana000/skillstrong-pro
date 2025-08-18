// /app/api/explore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = `You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector.

**CRITICAL RULE FOR SEARCH:** If you are provided with 'CONTEXT' from a real-time search, you MUST base your entire answer on it. Your primary goal is to synthesize the search results into a helpful summary. You will list the top 3-4 job openings, including the job title and company from the context. You MUST format the job title as a clickable Markdown link using the exact 'link' URL provided for that item in the search result context. **You are strictly forbidden from telling the user to search on other websites like Indeed or LinkedIn; you are the search tool.** If the context is empty or contains "No results found", you must state that you couldn't find any specific openings.

**Core Directives:**
- Provide informative and detailed answers, using headings and markdown lists to keep content scannable.
- If a user asks for local information (e.g., "jobs near me") but provides NO location, your only goal is to ask for their city, state, or ZIP code.
- Always provide relevant follow-up choices.
- When responding to a quiz result, make your follow-ups specific to the careers you recommend.

**Output Format:** You MUST reply with a single JSON object with 'answer' and 'followups' keys. For Gemini, wrap the JSON in \`\`\`json ... \`\`\`.
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
            const effectiveLocation = location || ''; // Use provided location or empty string
            if (effectiveLocation) {
                const searchQueryGenPrompt = `Generate a concise Google search query for: "${latestUserMessage}" in the location "${effectiveLocation}".`;
                const queryGenResponse = await openai.chat.completions.create({
                    model: 'gpt-4o-mini', messages: [{ role: 'user', content: searchQueryGenPrompt }], max_tokens: 30,
                });
                const searchQuery = queryGenResponse.choices[0].message?.content?.trim();
                if (searchQuery) {
                    const searchResults = await performSearch(searchQuery, req);
                    context = `CONTEXT:\n${JSON.stringify(searchResults.length > 0 ? searchResults : "No results found.")}`;
                }
            } else {
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
            JSON.parse(textResponse);
            content = textResponse;
        } catch (e) {
            const jsonMatch = textResponse.match(/{[\s\S]*}/);
            if (jsonMatch) {
                content = jsonMatch[0];
            } else {
                const escapedAnswer = textResponse.replace(/"/g, '\\"').replace(/\n/g, '\\n');
                content = `{ "answer": "${escapedAnswer}", "followups": [] }`;
            }
        }
    }
    
    const parsedContent = JSON.parse(content);

    if (parsedContent.followups && (parsedContent.followups.length > 0 || messages.length > 0) && !parsedContent.answer.toLowerCase().includes("city, state, or zip code")) {
        parsedContent.followups.push("↩️ Explore other topics");
    }

    return NextResponse.json(parsedContent);
}
