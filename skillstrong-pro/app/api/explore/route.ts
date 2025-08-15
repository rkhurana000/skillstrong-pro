// app/api/explore/route.ts
import { NextResponse } from "next/server";

type ChatTurn = { role: "user" | "assistant"; text: string };
type ExploreBody = {
  mode?: "skills" | "salary" | "training";
  selection?: string;
  question?: string;
  history?: ChatTurn[];
};

const PROVIDER = (process.env.PROVIDER || "gemini").toLowerCase();
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Small helper to ensure we never blow up the UI
function safeJson<T = any>(s: string): { ok: true; data: T } | { ok: false; text: string } {
  try {
    return { ok: true, data: JSON.parse(s) as T };
  } catch {
    return { ok: false, text: s };
  }
}

function buildSystemPrompt() {
  return `
You are a friendly manufacturing career guide. Always answer in clear, structured Markdown.
Keep answers concise but helpful, with short sections (Overview, Typical Duties, Training, Career Outlook, Salary).
End by suggesting 3–6 **clickable follow-up** ideas (concise, user-friendly), NOT numbered — just short phrases.
Do NOT include any private or sensitive data. If unsure, say so briefly.
`;
}

function buildUserPrompt(body: ExploreBody) {
  const { mode, selection, question } = body;
  // We always fold the UI selection + the user's visible question into one prompt.
  // If the user just clicked a chip and there is no question yet, we build a good one.
  if (question && question.trim()) {
    return question.trim();
  }

  if (mode === "skills") {
    return `Explain the career area "${selection}" in manufacturing: overview, typical duties, required or common training/certifications, career outlook, and salary. Keep it concise.`;
  }
  if (mode === "salary") {
    return `What manufacturing roles fit the salary range ${selection}? Give a short list with a one-line explanation each, plus notes on training/certs and career outlook.`;
  }
  if (mode === "training") {
    return `What manufacturing roles typically match training length ${selection}? Provide a short list with one-line role explanations, and note starting pathway.`;
  }
  // fallback
  return "Give me a brief, friendly overview of career paths in manufacturing.";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExploreBody;
    const system = buildSystemPrompt();
    const user = buildUserPrompt(body);

    // We ask for a JSON envelope so we can easily show follow-ups as buttons.
    // Shape we want back:
    // { answerMarkdown: string, followUps: string[] }
    const wantJsonShape = {
      answerMarkdown: "string",
      followUps: ["string"],
    };

    // Decide provider
    const provider =
      PROVIDER.includes("gemini") && GEMINI_KEY
        ? "gemini"
        : PROVIDER.includes("openai") && OPENAI_KEY
        ? "openai"
        : GEMINI_KEY
        ? "gemini"
        : OPENAI_KEY
        ? "openai"
        : null;

    if (!provider) {
      return NextResponse.json(
        { error: "No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    if (provider === "gemini") {
      // --- GEMINI PATH ---
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(GEMINI_KEY!);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      // Ask for JSON directly
      const prompt = `
${system}

Return JSON with:
- "answerMarkdown": string (the full markdown answer)
- "followUps": array of 3–6 short strings (friendly, clickable suggestions)
Do not include backticks. Do not include any extra keys.

User request:
${user}
      `.trim();

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 512, // Correct field name for Gemini
          temperature: 0.6,
          // Ask the model to return JSON:
          responseMimeType: "application/json",
        } as any,
      });

      const text = result.response?.text() ?? "";
      const parsed = safeJson<{ answerMarkdown: string; followUps?: string[] }>(text);
      if (parsed.ok) {
        const follow = (parsed.data.followUps || []).slice(0, 6);
        return NextResponse.json({
          provider: "gemini",
          answerMarkdown: parsed.data.answerMarkdown,
          followUps: follow,
        });
      } else {
        // Model returned plain text; we’ll just show it and synthesize follow-ups
        return NextResponse.json({
          provider: "gemini",
          answerMarkdown: parsed.text,
          followUps: [
            "Typical salary for this path?",
            "What certifications are useful?",
            "Common entry-level roles?",
          ],
        });
      }
    } else {
      // --- OPENAI PATH (Responses API) ---
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey: OPENAI_KEY! });

      const schema = {
        name: "ManufacturingAnswer",
        schema: {
          type: "object",
          properties: {
            answerMarkdown: { type: "string" },
            followUps: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 6,
            },
          },
          required: ["answerMarkdown", "followUps"],
          additionalProperties: false,
        },
        strict: true,
      };

      const r = await client.responses.create({
        model: OPENAI_MODEL,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_output_tokens: 512, // MUST be >= 16 for the Responses API
        temperature: 0.6,
        text: {
          format: {
            type: "json_schema",
            json_schema: schema,
          },
        },
      });

      const outText =
        (r as any).output_text ??
        (Array.isArray((r as any).output) && (r as any).output[0]?.content?.[0]?.text) ??
        "";

      const parsed = safeJson<{ answerMarkdown: string; followUps?: string[] }>(outText);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: "Could not parse model output.", raw: outText },
          { status: 500 }
        );
      }
      return NextResponse.json({
        provider: "openai",
        answerMarkdown: parsed.data.answerMarkdown,
        followUps: (parsed.data.followUps || []).slice(0, 6),
      });
    }
  } catch (err: any) {
    console.error("[/api/explore] error", err?.message || err);
    return NextResponse.json(
      { error: "Model call failed.", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
