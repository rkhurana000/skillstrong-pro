// /app/api/explore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = `You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector.

**CRITICAL RULE:** If you are provided with 'CONTEXT' from a real-time search, you MUST base your answer on it. Your primary goal is to synthesize the search results into a helpful summary. List the top 3-4 job openings, including the job title and company. Format the job title as a clickable Markdown link using the URL from the search result. **DO NOT** under any circumstances tell the user to search on other websites like Indeed or LinkedIn; you ARE the search tool. If the context is empty, state that you couldn't find any results for that specific search.

**Core Directives:**
1.  **Be Concise & Scannable:** Use short paragraphs and proper Markdown lists.
2.  **Use Emojis Sparingly:** Use one emoji per heading (e.g., 💰 Salary, 🔩 Skills).
3.  **Handle Location:** If a user asks for local information (e.g., "jobs near me") but does not provide a location, your ONLY goal is to ask for their city, state, or ZIP code.
4.  **Always Provide Follow-ups:** Every response MUST include 3-5 actionable follow-up choices.
5.  **Quiz Recommendations:** When providing career recommendations based on a quiz, your follow-ups MUST be specific to the careers you recommended.

**OUTPUT FORMAT:**
You MUST reply with a single JSON object containing 'answer' and 'followups' keys.
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
        const { messages } = await req.json();
        const fullConversation = messages.map((msg: { role: string, content: string }) => `${msg.role}: ${msg.content}`).join('\n');
        const latestUserMessage = messages[messages.length - 1]?.content || '';

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Step 1: Analyze user's intent to see if a search is needed.
        const searchDecisionPrompt = `Does the latest user query require a real-time internet search for local jobs, apprenticeships, or training programs? Answer YES or NO. Query: "${latestUserMessage}"`;
        const decisionResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini', messages: [{ role: 'user', content: searchDecisionPrompt }], max_tokens: 3,
        });
        const decision = decisionResponse.choices[0].message?.content?.trim().toUpperCase();

        let context = "";
        if (decision === 'YES') {
            // Step 2: Extract a location from the entire conversation.
            const locationExtractionPrompt = `From the following conversation, extract the US city, state, or ZIP code mentioned for a job search. If no location is present, respond with "NONE".\n\nConversation:\n${fullConversation}`;
            const locationResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini', messages: [{ role: 'user', content: locationExtractionPrompt }], max_tokens: 20,
            });
            let location = locationResponse.choices[0].message?.content?.trim();

            if (location && location.toUpperCase() !== 'NONE') {
                // Step 3: If location exists, generate a targeted search query.
                const searchQueryGenPrompt = `Generate a concise Google search query for: "${latestUserMessage}" in the location "${location}".`;
                const queryGenResponse = await openai.chat.completions.create({
                    model: 'gpt-4o-mini', messages: [{ role: 'user', content: searchQueryGenPrompt }], max_tokens: 30,
                });
                const searchQuery = queryGenResponse.choices[0].message?.content?.trim();
                
                if (searchQuery) {
                    const searchResults = await performSearch(searchQuery, req);
                    if (searchResults.length > 0) {
                        context = `CONTEXT:\n${JSON.stringify(searchResults)}`;
                    } else {
                        context = `CONTEXT:\n[]`; // Explicitly state no results were found
                    }
                }
            }
        }
        
        const fullMessages = [
            { role: 'system', content: systemPrompt },
            ...messages,
            ...(context ? [{ role: 'system', content: context }] : [])
        ];
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: fullMessages,
            temperature: 0.3,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0].message?.content;
        if (!content) { throw new Error("Empty response from AI"); }
        
        const parsedContent = JSON.parse(content);

        if (parsedContent.followups && (parsedContent.followups.length > 0 || messages.length > 0)) {
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
