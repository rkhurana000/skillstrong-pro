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

    // --- THIS IS THE FIX ---
    // A simpler, more direct prompt as you suggested.
    let titlePrompt = "";
    const locationPromptCheck = "To find local results, please set your location";

    if (assistantContent.includes(locationPromptCheck)) {
        // Handle the "set location" failure case specifically
        titlePrompt = `Create a short title (under 32 chars) for this user request. Do not use quotes.\n\nUser: "${userContent}"\n\nTitle:`;
    } else {
        // The standard prompt for a good Q&A pair
        titlePrompt = `Summarize this chat into a title under 32 characters. Do not use quotes.\n\nUser: "${userContent}"\nAssistant: "${assistantContent}..."\n\nTitle:`;
    }
    // --- END FIX ---

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: titlePrompt }],
      max_tokens: 20, // 32 chars is ~10 tokens, 20 is a safe buffer
      temperature: 0.2,
    });

    let title = response.choices[0].message?.content?.trim() || 'New Conversation';
    
    // Safety check to remove any accidental quotes
    title = title.replace(/"/g, ''); 

    if (!title || title.length > 35) { // Final fallback check
        title = 'New Conversation';
    }

    return NextResponse.json({ title });

  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json({ error: 'Failed to generate title.' }, { status: 500 });
  }
}
