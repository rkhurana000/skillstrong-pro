/* app/api/explore/route.ts */

import { NextResponse } from "next/server";

type ExploreBody = {
  question?: string;
  provider?: "openai" | "gemini" | "auto";
};

// Lazy imports so we don’t bundle unused SDKs
async function withOpenAI() {
  const { default: OpenAI } = await import("openai");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

async function withGemini() {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

function pickProviderExplicit(p?: string | null) {
  if (!p) return null;
  const v = p.toLowerCase();
  if (v === "openai" || v === "gemini") return v as "openai" | "gemini";
  return null;
}

function pickProviderFallback() {
  const configuredOpenAI = !!process.env.OPENAI_API_KEY;
  const configuredGemini = !!process.env.GEMINI_API_KEY;

  // If PROVIDER is set, honor it (but still only if that key exists)
  const wanted = (process.env.PROVIDER || "").toLowerCase();
  if (wanted === "openai" && configuredOpenAI) return "openai" as const;
  if (wanted === "gemini" && configuredGemini) return "gemini" as const;

  // Otherwise, prefer OpenAI if present, else Gemini
  if (configuredOpenAI) return "openai" as const;
  if (configuredGemini) return "gemini" as const;

  return null;
}

const SYSTEM_STYLE = `
You are a friendly manufacturing career guide for the U.S.

Return your answer as Markdown that is EASY TO SCAN:
- Use **H2 headings** (##) for sections like “CNC Machinist”, “Quality Technician”, etc.
- For each role, include a compact bullet list with blank lines between sections:
  - **Duties:** …
  - **Training:** …
  - **Career Outlook:** …
  - **Common Employers:** …
  - **Salary:** …

Keep answers practical and concise.
`;

const JSON_INSTRUCTIONS = `
RESPONSE FORMAT (IMPORTANT):
Return **only** a JSON object inside a triple-backtick \`json\` code fence:

\`\`\`json
{
  "markdown": "<your Markdown answer>",
  "followUps": ["<short clickable follow-up>", "... up to 6"]
}
\`\`\`

Rules:
- "markdown": full Markdown with headings and bulleted sections, add blank lines between sections for readability.
- "followUps": 3–6 short, specific questions the user might ask next (max 6).
- No text outside the JSON code fence.
`;

function extractFirstJSONBlock(text: string): { markdown?: string; followUps?: string[] } | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    let body: ExploreBody = {};
    try {
      body = (await req.json()) as ExploreBody;
    } catch {
      // ignore (e.g., empty body)
    }

    const url = new URL(req.url);
    const qsProvider = url.searchParams.get("provider");
    const explicit =
      pickProviderExplicit(body.provider) || pickProviderExplicit(qsProvider);

    // If explicit provider requested, use it (only if its key exists)
    let provider: "openai" | "gemini" | null = null;
    if (explicit) {
      if (explicit === "openai" && process.env.OPENAI_API_KEY) provider = "openai";
      if (explicit === "gemini" && process.env.GEMINI_API_KEY) provider = "gemini";
      if (!provider) {
        return NextResponse.json(
          { error: `Provider "${explicit}" selected but no API key configured.` },
          { status: 400 },
        );
      }
    } else {
      provider = pickProviderFallback();
    }

    if (!provider) {
      return NextResponse.json(
        { error: "No AI provider configured. Add OPENAI_API_KEY or GEMINI_API_KEY." },
        { status: 500 },
      );
    }

    const question = (body.question || "").trim();
    if (!question) {
      return NextResponse.json({ error: "Missing 'question'." }, { status: 400 });
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
          maxOutputTokens: 900, // must be >= 16
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
      return NextResponse.json({
        answerMarkdown:
          raw ||
          "Sorry — I couldn’t parse the model response. Please try another option.",
        followUps: [],
        providerUsed: provider,
      });
    }

    const answerMarkdown = String(parsed.markdown || "");
    const followUps = Array.isArray(parsed.followUps)
      ? parsed.followUps.filter((s) => typeof s === "string").slice(0, 6)
      : [];

    return NextResponse.json({ answerMarkdown, followUps, providerUsed: provider });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error. Please try again." },
      { status: 500 },
    );
  }
}
