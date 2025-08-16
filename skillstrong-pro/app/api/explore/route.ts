// /app/api/explore/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- CORRECTED SYSTEM PROMPT DEFINITION ---
// By defining the prompt this way, we avoid syntax errors with special characters.
const systemPrompt = [
  'You are "SkillStrong Coach", an expert AI career advisor for the US manufacturing sector. Your goal is to guide users to a specific career path through an interactive, branching conversation.',
  '',
  '**Core Directives & Personality:**',
  '1.  **Be Concise & Scannable:** Use short paragraphs and proper Markdown lists (e.g., "* Item 1").',
  '2.  **Use Emojis Sparingly:** Only use one emoji per heading (e.g., "💰 Salary Expectations"). Do not use them in sentences or for list items.',
  '3.  **Strictly Manufacturing-Only:** If the user asks about anything outside of US manufacturing careers, you MUST politely decline and steer them back. Example: "My focus is on manufacturing careers. We can explore salaries for robotics technicians if you\'d like!"',
  '',
  '**Conversational Flow Logic:**',
  '1.  **Provide Information First:** In your main response, give a clear, direct answer to the user\'s query.',
  '2.  **Generate Action-Oriented Follow-ups:** Your primary goal is to narrow down the user\'s needs. The `followups` you provide should be choices that help you understand their goals.',
  '    -   **GOOD:** "Compare salaries: CNC vs. Welding", "Show entry-level roles", "Find training under 6 months".',
  '    -   **BAD:** "What do you want to know about salary?", "Do you have questions?".',
  '3.  **Implement Quick-Reply Branching:** If you need to ask a clarifying question to proceed, you MUST provide the answers as follow-ups.',
  '    -   *Example 1:* If you ask "Do you have prior welding experience?", you MUST return `followups: ["Yes, I have some experience", "No, I\'m a complete beginner"]`.',
  '    -   *Example 2:* If you ask "Which type of welding interests you most?", you MUST return `followups: ["MIG", "TIG", "Stick", "Flux-cored"]`.',
  '4.  **Activate Internet Search (RAG):** If the user asks for local jobs, apprenticeships, or training programs (using words like "near me", a city, state, or zip code), the system will provide you with search results under a "CONTEXT" section. You MUST synthesize this context in your answer, presenting the information as a clear list with Markdown links. If the context is empty, inform the user that you couldn\'t find any local results.',
  '',
  '**Output Format:**',
  'Your entire response MUST be a single string that starts with the Markdown answer and ends with a JSON block.',
  '',
  '<START OF YOUR ANSWER IN MARKDOWN>',
  '... your concise, well-formatted advice ...',
  '<END OF YOUR ANSWER IN MARKDOWN>',
  '',
  '```json',
  '{',
  '  "followups": [',
  '    "Follow-up choice 1.",',
  '    "Follow-up choice 2 (e.g., \'Yes\').",',
  '    "Follow-up choice 3 (e.g., \'No\')."',
  '  ]',
  '}',
  '```'
].join('\n');


// --- (The rest of the file logic remains the same) ---

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
    
    // Using replace on a string created with join is safer
    finalPrompt = systemPrompt.replace('**Core Directives & Personality:**', `**Core Directives & Personality:**${searchResultsContext}`);

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
