// app/api/explore/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * We return strict JSON so the UI can render markdown + follow-up chips.
 *  {
 *    "answerMarkdown": string,
 *    "followUps": string[]  // max 6, short, clickable
 *  }
 */
const SYSTEM_PROMPT = `
You are SkillStrong's Manufacturing Career Coach.
Write concise, friendly guidance about U.S. manufacturing careers.
When a user gives a topic (e.g., "CNC Machining", "welding", "$40–60k", "6–12 months training"),
explain it clearly with headings, bullets, and short paragraphs in Markdown:
- A short intro
- Duties (bulleted)
- Training/Certifications (bulleted)
- Career outlook (1–2 short paragraphs)
- Typical salary perspective (concise, not specific to a city)
Keep it practical and avoid fluff.

ALWAYS reply as strict JSON:
{
  "answerMarkdown": "...markdown here...",
  "followUps": ["short clickable question 1", "... up to 6 total ..."]
}

The followUps must be short (<= 12 words), distinct, and relevant next questions.
Never include more than 6 follow up items.
Never include anything except the JSON object.
`;

type PostBody = {
  question: string;
};

function buildUserPrompt(question: string) {
  return `User: ${question}
Return only the JSON described above.`;
}

export async function POST(req: NextRequest) {
  try {
    const { question } = (await req.json()) as PostBody;
    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Missing 'question' in body." },
        { status: 400 }
      );
    }

    // Prefer OpenAI if available, otherwise try Gemini.
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const userPrompt = buildUserPrompt(question);

    if (openaiKey) {
      // Use OpenAI Chat Completions with JSON response
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return NextResponse.json(
          { error: `OpenAI error: ${text}` },
          { status: 500 }
        );
      }

      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || "{}";
      const json = JSON.parse(content);
      return NextResponse.json(json);
    }

    if (geminiKey) {
      // Use Gemini (v1beta REST). Ask for JSON output via responseMimeType
      const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const body = {
        contents: [
          { role: "user", parts: [{ text: userPrompt }] }
        ],
        systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      };

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) {
        const text = await resp.text();
        return NextResponse.json(
          { error: `Gemini error: ${text}` },
          { status: 500 }
        );
      }

      const data = await resp.json();
      // Gemini returns JSON-as-text inside candidates[0].content.parts[0].text
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const json = JSON.parse(text);
      return NextResponse.json(json);
    }

    return NextResponse.json(
      {
        error:
          "No LLM key found. Add OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in your Vercel env.",
      },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
