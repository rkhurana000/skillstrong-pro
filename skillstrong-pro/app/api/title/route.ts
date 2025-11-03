// /app/api/title/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // --- DEBUG: Log the incoming messages ---
    console.log("[/api/title] Received messages:", JSON.stringify(messages, null, 2));

    if (!messages || messages.length < 2) {
      console.error("[/api/title] Error: Not enough messages.");
      return NextResponse.json({ error: 'Not enough messages.' }, { status: 400 });
    }

    const userContent = messages[0].content;
    // Truncate assistant content just in case it's massive
    const assistantContent = messages[1].content.substring(0, 500); 

    // --- FIX: Simple, direct prompt as requested ---
    const titlePrompt = `Summarize this chat into a title under 32 characters. Do not use quotes.\n\nUser: "${userContent}"\nAssistant: "${assistantContent}..."\n\nTitle:`;
    
    // --- DEBUG: Log the prompt being sent to OpenAI ---
    console.log("[/api/title] Generating title with prompt:", titlePrompt);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: titlePrompt }],
      max_tokens: 20, // 32 chars is ~10 tokens, 20 is a safe buffer
      temperature: 0.1, // Lowered temperature for more predictable titles
    });

    let title = response.choices[0].message?.content?.trim() || 'New Conversation';
    
    // Safety check to remove any accidental quotes
    title = title.replace(/"/g, ''); 

    if (!title || title.length > 40) { // Fallback for empty or too-long titles
        title = 'New Conversation';
    }

    // --- DEBUG: Log the final title ---
    console.log("[/api/title] Generated title:", title);

    return NextResponse.json({ title });

  } catch (error) {
    console.error("[/api/title] Error generating title:", error);
    return NextResponse.json({ error: 'Failed to generate title.' }, { status: 500 });
  }
}
