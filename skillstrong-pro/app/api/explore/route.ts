/* app/api/explore/route.ts */

import { NextResponse } from "next/server";

// Lazy imports so the wrong SDK isn’t bundled if not used
async function withOpenAI() {
  const { default: OpenAI } = await import("openai");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

async function withGemini() {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

type ExploreBody = { question?: string };

// Choose provider from env
function pickProvider() {
  const wanted = (process.env.PROVIDER || "").toLowerCase();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  if (wanted === "openai" && hasOpenAI) return "openai" as const;
  if (wanted === "gemini" && hasGemini) return "gemini" as const;

  // Fallbacks
  if (hasOpenAI) return "openai" as const;
  if (hasGemini) return "gemini" as const;

  return null;
}

const SYSTEM_STYLE = `
You are a friendly manufacturing career guide for the U.S.

Return your answer as Markdown that is EASY TO SCAN:
- Use short sections with **H2 headings** (##).
- Use bulleted lists with blank lines between sections.
- For each role, prefer the format:

### Role Name
- **Duties:** …
- **Training:** …
- **Career Outlook:** …
- **Common Employers:** …
- **Salary:** …

Keep answers concise and practical. Avoid filler and apologies.
`;

const JSON_INSTRUCTIONS = `
RESPONSE FORMAT (IMPORTANT):
Return **only** a JSON object in a triple-backtick \`json\` code fence:

\`\`\`json
{
  "markdown": "<your Markdown answer>",
  "followUps": ["<clickable follow-up 1>", "... up to 6 total"]
}
\`\`\`

Rules:
- "markdown": the full answer in Markdown, using headings and bullet lists with blank lines between sections.
- "followUps": 3–6 short, specific questions the user might ask next (no more than 6).
- Nothing outside the JSON code fence.
`;

function extractFirstJSONBlock(text: string): { markdown?: string; followUps?: string[] } | null {
  // Prefer fenced JSON
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  // Try to parse the first {...} block
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      // fallthrough
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExploreBody;
    const question = (body?.question || "").trim();

    if (!question) {
      return NextResponse.json(
        { error: "Missing 'question'." },
        { status: 400 }
      );
    }

    const provider = pickProvider();
    if (!provider) {
      return NextResponse.json(
        { error: "No AI provider configured. Add OPENAI_API_KEY or GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    let raw = "";

    if (provider === "openai") {
      const openai = await withOpenAI();
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.6,
        max_tokens: 900,
        messages: [
          { role: "system", content: SYSTEM_STYLE + "\n\n" + JSON_INSTRUCTIONS },
          { role: "user", content: question },
        ],
      });

      raw = completion.choices[0]?.message?.content ?? "";
    } else {
      // gemini
      const genAI = await withGemini();
      const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 900, // must be >= 16 to satisfy their minimum
          temperature: 0.6,
        },
      });

      const result = await model.generateContent([
        SYSTEM_STYLE + "\n\n" + JSON_INSTRUCTIONS + "\n\nUser question:\n" + question,
      ]);

      raw = result.response.text();
    }

    const parsed = extractFirstJSONBlock(raw);
    if (!parsed?.markdown) {
      // soft fallback: send whatever we got as plain markdown
      return NextResponse.json({
        answerMarkdown:
          raw ||
          "Sorry — I couldn’t parse the model response. Please try another option.",
        followUps: [],
      });
    }

    const answerMarkdown = String(parsed.markdown || "");
    const followUps = Array.isArray(parsed.followUps)
      ? parsed.followUps.filter((s) => typeof s === "string").slice(0, 6)
      : [];

    return NextResponse.json({ answerMarkdown, followUps });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Unexpected error generating the response. Please try again.",
      },
      { status: 500 }
    );
  }
}
