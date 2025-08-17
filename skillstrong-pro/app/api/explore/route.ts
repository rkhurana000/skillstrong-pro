// /app/api/explore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Simplified and more robust prompt
const systemPrompt = `You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector.
Your goal is to be a helpful and encouraging guide.

1.  **Be Concise & Scannable:** Use short paragraphs and markdown lists.
2.  **Use Emojis Sparingly:** Use one emoji for main topics (e.g., 💰 Salary, 🔩 Skills).
3.  **Stay on Topic:** Strictly focus on US manufacturing careers.
4.  **Always Provide Follow-ups:** Every response MUST include 3-5 actionable follow-up choices.
5.  **Branching Questions:** If you need to ask a clarifying question, provide the answers as follow-ups (e.g., ["Yes", "No"]).
6.  **Use Search Context:** If provided with CONTEXT from a search, you MUST use it to answer questions about local jobs or training.
7.  **Quiz Recommendations:** When providing career recommendations based on a quiz, your follow-ups MUST be specific to the careers you recommended. For example, if you recommend "Machinist" and "Welder", your follow-ups should include "Tell me more about being a Machinist" and "Compare salaries for these roles".

**OUTPUT FORMAT:**
You MUST reply with a single JSON object. The 'answer' key should contain your markdown response, and the 'followups' key should contain an array of strings.
Example:
{
  "answer": "Hello! Here is some information...",
  "followups": ["Tell me more about salaries.", "What are the required skills?"]
}
`;



// ... (Rest of the file is largely the same but simplified for stability)
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
        const latestUserMessage = messages[messages.length - 1]?.content || '';

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const searchDecisionPrompt = `Does this query require a real-time internet search for local jobs, apprenticeships, or training programs? Answer YES or NO. Query: "${latestUserMessage}"`;
        const decisionResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: searchDecisionPrompt }],
            max_tokens: 3,
        });
        const decision = decisionResponse.choices[0].message?.content?.trim().toUpperCase();

        let context = "";
        if (decision === 'YES') {
            const searchQueryGenPrompt = `Generate a concise Google search query for this request: "${latestUserMessage}"`;
            const queryGenResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: searchQueryGenPrompt }],
                max_tokens: 20,
            });
            const searchQuery = queryGenResponse.choices[0].message?.content?.trim();
            if (searchQuery) {
                const searchResults = await performSearch(searchQuery, req);
                if (searchResults.length > 0) {
                    context = `Here is some CONTEXT from a real-time search:\n${JSON.stringify(searchResults)}`;
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
        if (!content) {
            throw new Error("Empty response from AI");
        }
        
        // Parse the JSON object from the response
        const parsedContent = JSON.parse(content);

        // Add the "Explore other topics" button
        if (parsedContent.followups && parsedContent.followups.length > 0) {
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
