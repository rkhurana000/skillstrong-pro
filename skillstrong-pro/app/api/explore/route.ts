// app/api/explore/route.ts
import { NextRequest } from 'next/server';

type Provider = 'gemini' | 'openai';

type UIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const SYSTEM_PROMPT = `
You are SkillStrong, a friendly manufacturing-careers guide for students.
- Keep answers short, skimmable, positive. Use markdown headings, lists and emoji sparingly.
- Always focus on manufacturing only (roles, training, certifications, apprenticeships, schools, local jobs).
- End every response with a line: FOLLOWUPS: [ "short question 1", "short question 2", ... ] (max 6).
- If a follow-up is a yes/no or a choice, phrase it so it's clickable (e.g., "Do you have experience? (Yes/No)").
`;

function toOpenAIMessages(history: UIMessage[]) {
  // prepend system at the top
  const head = [{ role: 'system', content: SYSTEM_PROMPT }];
  const rest = history.map((m) => ({ role: m.role, content: m.content }));
  return [...head, ...rest] as any[];
}

function toGeminiContents(history: UIMessage[]) {
  // Convert the same conversation to Gemini content parts
  // The first "system" instruction is folded into the first user turn.
  const mergedFirstUser = [
    {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }],
    },
  ];
  const rest = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  return [...mergedFirstUser, ...rest];
}

function parseFollowupsFromText(text: string): string[] {
  const m = text.match(/FOLLOWUPS:\s*(\[[\s\S]*?\])/i);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[1]);
    return Array.isArray(arr) ? arr.filter(Boolean).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function stripFollowupsBlock(text: string): string {
  return text.replace(/FOLLOWUPS:\s*\[[\s\S]*?\]\s*$/i, '').trim();
}

// We’ll prefer the body provider; fall back to env PROVIDER; default gemini
function pickProvider(bodyProvider: Provider | undefined): Provider {
  const envProv =
    (process.env.PROVIDER as Provider | undefined) ?? ('gemini' as Provider);
  return (bodyProvider ?? envProv) === 'openai' ? 'openai' : 'gemini';
}

export async function POST(req: NextRequest) {
  try {
    const { provider: bodyProv, messages, intent } = (await req.json()) as {
      provider?: Provider;
      messages: UIMessage[];
      intent?: string;
    };

    const provider = pickProvider(bodyProv);

    // Add a tiny intent hint to the last user message
    const finalHistory: UIMessage[] = Array.isArray(messages) ? [...messages] : [];
    if (finalHistory.length && intent) {
      finalHistory.push({
        role: 'user',
        content: `(Context: user is exploring by ${intent})`,
      });
    }

    let markdown = '';
    let followups: string[] = [];

    if (provider === 'openai') {
      // OPENAI
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return Response.json(
          { error: 'Missing OPENAI_API_KEY' },
          { status: 500 }
        );
      }
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.4,
        max_tokens: 800,
        messages: toOpenAIMessages(finalHistory),
      });

      const text =
        completion.choices?.[0]?.message?.content?.trim() || 'Sorry, no answer.';
      followups = parseFollowupsFromText(text);
      markdown = stripFollowupsBlock(text);
    } else {
      // GEMINI
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return Response.json(
          { error: 'Missing GOOGLE_API_KEY / GEMINI_API_KEY' },
          { status: 500 }
        );
      }
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genai = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const model = genai.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 800, // keep it safe (not 1!)
          temperature: 0.4,
        },
      });

      const result = await model.generateContent({
        contents: toGeminiContents(finalHistory),
      });

      const text =
        result.response?.text?.() ||
        result.response?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text || '')
          .join('\n\n') ||
        'Sorry, no answer.';
      followups = parseFollowupsFromText(text);
      markdown = stripFollowupsBlock(text);
    }

    return Response.json({
      content: markdown,
      followups,
    });
  } catch (err) {
    return Response.json(
      {
        error: 'Server error',
        details:
          err instanceof Error ? err.message : 'Unknown error while exploring',
      },
      { status: 500 }
    );
  }
}
