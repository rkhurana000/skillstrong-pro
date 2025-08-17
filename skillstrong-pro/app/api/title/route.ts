// /app/api/title/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length < 2) {
      return NextResponse.json({ error: 'Not enough messages.' }, { status: 400 });
    }

    const titlePrompt = `Based on this conversation, create a concise and descriptive title of 5 words or less. Do not use quotation marks.\n\nUser: "${messages[0].content}"\nAssistant: "${messages[1].content}"\n\nTitle:`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: titlePrompt }],
      max_tokens: 20,
      temperature: 0.2,
    });

    const title = response.choices[0].message?.content?.trim() || 'New Chat';
    return NextResponse.json({ title });

  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json({ error: 'Failed to generate title.' }, { status: 500 });
  }
}
