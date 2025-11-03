// /app/api/title/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length < 2) {
      return NextResponse.json({ error: 'Not enough messages.' }, { status: 400 });
    }

    // --- FIX: Truncate the long assistant message ---
    const userContent = messages[0].content;
    // Take the first 300 characters of the assistant's reply for context
    const assistantContent = messages[1].content.substring(0, 300); 

    const titlePrompt = `Based on this conversation, create a concise and descriptive title of 5 words or less. Do not use quotation marks.\n\nUser: "${userContent}"\nAssistant: "${assistantContent}..."\n\nTitle:`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Using gpt-4o for better performance
      messages: [{ role: 'user', content: titlePrompt }],
      max_tokens: 20,
      temperature: 0.2,
    });

    let title = response.choices[0].message?.content?.trim() || 'New Conversation';
    
    // Safety check to remove any accidental quotes
    title = title.replace(/"/g, ''); 

    if (!title) {
        title = 'New Conversation'; // Final fallback
    }

    return NextResponse.json({ title });

  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json({ error: 'Failed to generate title.' }, { status: 500 });
  }
}
