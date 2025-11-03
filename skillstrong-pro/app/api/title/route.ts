// /app/api/title/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length < 2) {
      return NextResponse.json({ error: 'Not enough messages.' }, { status: 400 });
    }

    const userContent = messages[0].content;
    const assistantContent = messages[1].content.substring(0, 300); 

    // --- FIX: Check for the location prompt ---
    const locationPromptCheck = "To find local results, please set your location";
    let titlePrompt = "";

    if (assistantContent.includes(locationPromptCheck)) {
        // If the bot just asked for location, base title ONLY on the user's query
        titlePrompt = `Based on this user request, create a concise and descriptive title of 5 words or less. Do not use quotation marks.\n\nUser: "${userContent}"\n\nTitle:`;
    } else {
        // Otherwise, use both for context
        titlePrompt = `Based on this conversation, create a concise and descriptive title of 5 words or less. Do not use quotation marks.\n\nUser: "${userContent}"\nAssistant: "${assistantContent}..."\n\nTitle:`;
    }
    // --- END FIX ---

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', 
      messages: [{ role: 'user', content: titlePrompt }],
      max_tokens: 20,
      temperature: 0.2,
    });

    let title = response.choices[0].message?.content?.trim() || 'New Conversation';
    
    title = title.replace(/"/g, ''); 

    if (!title) {
        title = 'New Conversation';
    }

    return NextResponse.json({ title });

  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json({ error: 'Failed to generate title.' }, { status: 500 });
  }
}
