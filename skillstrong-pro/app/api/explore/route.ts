// /app/api/explore/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemPrompt = [
  'You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector. Your goal is to guide users to a specific career path through an interactive, branching conversation.',
  '**Core Directives & Personality:**',
  '1.  **Be Concise & Scannable:** Use short paragraphs and proper Markdown lists (e.g., "* Item 1").',
  '2.  **Use Emojis Sparingly:** Only use one emoji per heading (e.g., "💰 Salary Expectations"). Do not use them in sentences or for list items.',
  '3.  **Strictly Manufacturing-Only:** If the user asks about anything outside of US manufacturing careers, you MUST politely decline and steer them back.',
  '**Conversational Flow Logic:**',
  '1.  **Always Provide Follow-ups:** Every single response, with no exceptions, MUST end with actionable follow-up choices for the user.',
  '2.  **Implement Quick-Reply Branching:** If you need to ask a clarifying question (e.g., about experience level), you MUST provide the answers as follow-ups (e.g., ["Yes, I have experience", "No, I am a beginner"]).',
  '3.  **Activate Internet Search (RAG):** When the system provides you with "CONTEXT" from a search, you MUST synthesize it in your answer. After summarizing the search results, your follow-ups should help the user refine or change their search. Good examples include: "Broaden search to the entire state", "Search for a different role in this city", or "Explore training for this role".',
  '**Output Format:** Your entire response MUST be a single string that starts with the Markdown answer and ends with a JSON block.',
].join('\n');

async function performSearch(query: string, req: NextRequest): Promise<any[]> {
  // ... (This function is unchanged)
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
    const provider = searchParams.get('provider') || 'gemini';
    const { messages } = await req.json();
    const latestUserMessage = messages[messages.length - 1]?.content || '';

    // ... (RAG search logic is unchanged)
    const searchDecisionPrompt = `Does the following user query require a real-time internet search for local job listings, apprenticeships, or training programs? Answer with only "YES" or "NO". Query: "${latestUserMessage}"`;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const decisionResponse = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: searchDecisionPrompt }], max_tokens: 2 });
    const decision = decisionResponse.choices[0].message?.content?.trim().toUpperCase();
    let finalPrompt = systemPrompt;
    let searchResultsContext = '';
    if (decision === 'YES') {
      const searchQueryGenPrompt = `Generate a concise Google search query based on this request: "${latestUserMessage}"`;
      const queryGenResponse = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: searchQueryGenPrompt }], max_tokens: 20 });
      const searchQuery = queryGenResponse.choices[0].message?.content?.trim();
      if (searchQuery) {
        const searchResults = await performSearch(searchQuery, req);
        if (searchResults.length > 0) {
          searchResultsContext = `\n\n---CONTEXT FROM REAL-TIME SEARCH---\n${JSON.stringify(searchResults, null, 2)}\n---END OF CONTEXT---`;
        }
      }
    }
    finalPrompt = systemPrompt.replace('**Core Directives & Personality:**', `**Core Directives & Personality:**${searchResultsContext}`);

    const fullMessages = [{ role: 'system', content: finalPrompt }, ...messages];
    let rawAnswer = '';

    // ... (LLM provider calls are unchanged)
    if (provider === 'openai') {
        const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: fullMessages, temperature: 0.2 });
        rawAnswer = response.choices[0].message?.content || '';
    } else {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: finalPrompt });
        const geminiHistory = messages.filter((msg: any) => msg.role !== 'system').map((msg: any) => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }]}));
        const chat = model.startChat({ history: geminiHistory, generationConfig: { temperature: 0.2 }});
        const result = await chat.sendMessage(latestUserMessage);
        rawAnswer = result.response.text();
    }
    
    // ... (Response parsing is unchanged)
    const jsonBlockMatch = rawAnswer.match(/```json\n([\s\S]*?)\n```/);
    let answer = rawAnswer;
    let followups: string[] = [];
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      answer = rawAnswer.substring(0, jsonBlockMatch.index).trim();
      try {
        const parsedJson = JSON.parse(jsonBlockMatch[1]);
        followups = parsedJson.followups || [];
      } catch (e) { console.error("Failed to parse follow-ups JSON:", e); }
    }
    if (answer.length === 0) {
        answer = "I'm not sure how to respond to that. Could you try asking in a different way?";
    }

    // --- NEW: ALWAYS ADD A RESET OPTION ---
    // This ensures the user is never stuck in a conversational dead end.
    if (followups.length > 0) {
        followups.push("↩️ Explore other topics");
    }

    return NextResponse.json({ answer, followups });

  } catch (error) {
    console.error("Error in /api/explore:", error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
