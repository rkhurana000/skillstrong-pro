// /app/api/explore/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// The new, robust system prompt for guardrails and persona
const systemPrompt = `You are "SkillStrong Coach", an expert AI career advisor specializing exclusively in the US manufacturing sector. Your tone is encouraging, clear, and geared towards students and young adults (Gen-Z).

**Your Core Directives:**
1.  **Stay Focused:** Your knowledge is strictly limited to manufacturing careers: roles, skills, salaries, training paths, and job-finding strategies within the US.
2.  **Use Emojis:** Make your responses engaging and scannable by using relevant emojis. For example: 🔩 for skills, 💰 for salary, 🎓 for training, 🏢 for companies, and ✅ for list items.
3.  **Reject Off-Topic Queries:** If asked about anything outside manufacturing, politely decline and steer the conversation back. Example: "That's outside my expertise in manufacturing careers. Shall we explore CNC programming salaries instead?"
4.  **Use Search Results:** When provided with "CONTEXT", you MUST synthesize them in your answer to provide current, relevant links and information for local jobs, apprenticeships, or training. Cite the links naturally using Markdown.
5.  **Provide Actionable Follow-ups:** EVERY response must end with 3 to 5 relevant follow-up questions to guide the user.

**Output Format:**
Your entire response MUST be a single string that starts with the Markdown answer and ends with a JSON block. Do not add any text after the JSON block.

<START OF YOUR ANSWER IN MARKDOWN>
... your helpful, manufacturing-focused advice...
<END OF YOUR ANSWER IN MARKDOWN>

\`\`\`json
{
  "followups": [
    "Follow-up question 1.",
    "Follow-up question 2.",
    "Follow-up question 3."
  ]
}
\`\`\`
`;

// ... (The rest of the file remains the same as before)

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
    const provider = searchParams.get('provider') || 'gemini';
    const { messages } = await req.json();
    const latestUserMessage = messages[messages.length - 1]?.content || '';

    const searchDecisionPrompt = `Does the following user query require a real-time internet search for local job listings, apprenticeships, or training programs? Answer with only "YES" or "NO". Query: "${latestUserMessage}"`;
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const decisionResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: searchDecisionPrompt }],
        max_tokens: 2,
    });
    const decision = decisionResponse.choices[0].message?.content?.trim().toUpperCase();

    let finalPrompt = systemPrompt;
    let searchResultsContext = '';

    if (decision === 'YES') {
      const searchQueryGenPrompt = `Generate a concise Google search query to find local manufacturing jobs, training, or apprenticeships based on this user request. Return only the search query. Request: "${latestUserMessage}"`;
      const queryGenResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: searchQueryGenPrompt }],
          max_tokens: 20,
      });
      const searchQuery = queryGenResponse.choices[0].message?.content?.trim();

      if (searchQuery) {
        const searchResults = await performSearch(searchQuery, req);
        if (searchResults.length > 0) {
          searchResultsContext = `\n\n---CONTEXT FROM REAL-TIME SEARCH---\nHere are some relevant search results to use in your answer:\n${JSON.stringify(searchResults, null, 2)}\n---END OF CONTEXT---`;
        }
      }
    }
    
    finalPrompt = systemPrompt.replace('**Your Core Directives:**', `**Your Core Directives:**${searchResultsContext}`);

    const fullMessages = [{ role: 'system', content: finalPrompt }, ...messages];
    let rawAnswer = '';

    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: fullMessages,
      });
      rawAnswer = response.choices[0].message?.content || '';
    } else { // Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: finalPrompt });
      const geminiHistory = messages
        .filter((msg: { role: string }) => msg.role !== 'system')
        .map((msg: { role: string, content: string }) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));
        
      const chat = model.startChat({ history: geminiHistory });
      const result = await chat.sendMessage(latestUserMessage);
      rawAnswer = result.response.text();
    }

    const jsonBlockMatch = rawAnswer.match(/```json\n([\s\S]*?)\n```/);
    let answer = rawAnswer;
    let followups: string[] = [];

    if (jsonBlockMatch && jsonBlockMatch[1]) {
      answer = rawAnswer.substring(0, jsonBlockMatch.index).trim();
      try {
        const parsedJson = JSON.parse(jsonBlockMatch[1]);
        followups = parsedJson.followups || [];
      } catch (e) {
        console.error("Failed to parse follow-ups JSON:", e);
      }
    }
    
    if (answer.length === 0) {
        answer = "I'm not sure how to respond to that. Could you try asking in a different way?";
        followups = ["What are common manufacturing jobs?", "How do I start a career in welding?"];
    }

    return NextResponse.json({ answer, followups });

  } catch (error) {
    console.error("Error in /api/explore:", error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
