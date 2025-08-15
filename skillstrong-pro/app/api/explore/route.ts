// app/api/explore/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

const PROVIDER_ENV = (process.env.PROVIDER || "gemini").toLowerCase() as
  | "openai"
  | "gemini";

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// Single system prompt that enforces JSON shape + depth for *every* turn
const SYSTEM = `
You are SkillStrong, a friendly manufacturing career guide for students.
Always answer **only** about manufacturing, training, certifications,
apprenticeships, jobs, safety, and related topics.

Output must be a **strict JSON object**:

{
  "answerMarkdown": string,      // concise, skimmable Markdown:
                                 // - short sentences
                                 // - emoji section headers (e.g., "🛠️ Duties")
                                 // - bullet lists
                                 // - optional small tables
  "followUps": [                 // ALWAYS provide 3–6 fresh follow-ups for the NEXT turn
    { "label": string, "userQuery": string }
  ]
}

Rules for followUps:
- 3 to 6 items, every turn (even if the user clicked a follow-up).
- Keep them context-aware (deeper next steps, not repeats).
- Labels must be tap-friendly, not questions to fill in. If a step needs input,
  encode common selections in the label: e.g., "Yes (I have welding experience)",
  "No (I’m brand new)", "Show MIG/TIG/Stick options", etc.
- userQuery must be a clear question/command we can send back to you.

Style rules for answerMarkdown:
- Use emoji section headers like "🧰 Overview", "🎓 Training", "💼 Jobs".
- Prefer bullets over paragraphs; keep it scannable for Gen Z.
- For lists of options, show them as bullets.
- If helpful, include a small 2–4 column Markdown table.
`;

function okFollowUps(raw: any): { label: string; userQuery: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({
      label: String(f?.label || "").slice(0, 140),
      userQuery: String(f?.userQuery || "").slice(0, 280),
    }))
    .filter((f) => f.label && f.userQuery)
    .slice(0, 6);
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
    const providerOverride = (body?.provider || "").toLowerCase() as
      | "openai"
      | "gemini"
      | "";

    const provider = (providerOverride || PROVIDER_ENV) as "openai" | "gemini";

    // Clamp history to last ~10 exchanges to keep payload small
    const history = messages.slice(-20);

    if (provider === "openai") {
      if (!OPENAI_KEY) {
        return NextResponse.json(
          {
            error: "Missing OPENAI_API_KEY",
          },
          { status: 500 }
        );
      }

      const client = new OpenAI({ apiKey: OPENAI_KEY });

      // Use chat.completions with JSON mode for broad SDK compatibility
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.6,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = safeJson(raw) || {};
      const answerMarkdown = String(parsed.answerMarkdown || "").trim();
      const followUps = okFollowUps(parsed.followUps);

      if (!answerMarkdown) {
        return NextResponse.json(
          {
            answerMarkdown:
              "Sorry — I hit a snag generating that. Please try again or switch models.",
            followUps: [
              {
                label: "Try again",
                userQuery:
                  "Please regenerate that answer about manufacturing careers.",
              },
              {
                label: "Switch to Gemini",
                userQuery:
                  "Use the Gemini model and show me the same information.",
              },
            ],
            providerUsed: "openai",
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { answerMarkdown, followUps, providerUsed: "openai" },
        { status: 200 }
      );
    }

    // ---------- Gemini ----------
    if (!GEMINI_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);

    // System instruction supported via safety/system field on the model:
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM,
    });

    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();
    const parsed = safeJson(text) || {};
    const answerMarkdown = String(parsed.answerMarkdown || "").trim();
    const followUps = okFollowUps(parsed.followUps);

    if (!answerMarkdown) {
      return NextResponse.json(
        {
          answerMarkdown:
            "Sorry — I hit a snag generating that. Please try again or switch models.",
          followUps: [
            { label: "Try again", userQuery: "Regenerate that answer." },
            {
              label: "Switch to OpenAI",
              userQuery:
                "Use the OpenAI model and show me the same information.",
            },
          ],
          providerUsed: "gemini",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { answerMarkdown, followUps, providerUsed: "gemini" },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        answerMarkdown:
          "Sorry — an unexpected error occurred. Please try again.",
        followUps: [{ label: "Try again", userQuery: "Please try again." }],
      },
      { status: 200 }
    );
  }
}
