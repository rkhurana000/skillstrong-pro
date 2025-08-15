import { NextRequest, NextResponse } from "next/server";

// -------- Types shared with the client --------
type Role = "user" | "assistant";
export type Msg = { role: Role; content: string };
export type FollowUp = { label: string; payload: string; choices?: string[] };
export type ExploreResponse = { markdown: string; followUps: FollowUp[] };

// -------- Helpers --------
const SYSTEM_INSTRUCTIONS = `
You are SkillStrong's manufacturing career coach for US students.
Stay strictly in manufacturing topics (careers, training, certs, apprenticeships, local programs, entry-level jobs).
Return answers as concise, friendly Markdown (use short headings, bullets, callouts).
Always include up to 6 useful follow-up actions.

IMPORTANT: You MUST return valid JSON that matches the schema exactly.
Do not include extra fields or commentary. Avoid code fences.
When a follow-up is a question, phrase it as a clickable option (short and actionable).
If a follow-up implies a choice (e.g., Yes/No or MIG/TIG/Stick), include a "choices" array.
`;

const JSON_SCHEMA = {
  name: "skillstrong_explore",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["markdown", "followUps"],
    properties: {
      markdown: {
        type: "string",
        description:
          "A well-formatted Markdown answer (headings, bullets, short callouts). No frontmatter, no code fences.",
      },
      followUps: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "payload"],
          properties: {
            label: { type: "string" },
            payload: {
              type: "string",
              description:
                "A short instruction the app will send back to continue the flow (e.g., 'Show local apprenticeships', 'Yes', 'TIG').",
            },
            choices: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional list of choices if this follow-up expects a quick pick (e.g., ['Yes','No'] or welding types).",
            },
          },
        },
      },
    },
  },
  strict: true,
} as const;

function badRequest(msg: string, extra?: any) {
  return NextResponse.json({ error: msg, extra }, { status: 400 });
}

// -------- Route --------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider, // "openai" | "gemini"
      model,    // optional override
      messages, // Msg[]
    }: {
      provider?: "openai" | "gemini";
      model?: string;
      messages: Msg[];
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return badRequest("Missing 'messages' array.");
    }

    const prov =
      provider ??
      (process.env.PROVIDER as "openai" | "gemini" | undefined) ??
      "gemini";

    if (prov === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return badRequest("OPENAI_API_KEY is not set.");
      const { OpenAI } = await import("openai");

      const client = new OpenAI({ apiKey });

      // Use Responses API with strict JSON schema
      const res = await client.responses.create({
        model: model || process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.6,
        max_output_tokens: 900,
        response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
        input: [
          { role: "system", content: SYSTEM_INSTRUCTIONS },
          {
            role: "user",
            // Send history so model keeps context
            content: JSON.stringify({
              history: messages,
              instruction:
                "Respond with JSON ONLY that matches the schema. Do not add backticks.",
            }),
          },
        ],
      });

      // SDK convenience to get text from the response
      const text = (res as any).output_text as string | undefined;
      if (!text) {
        return badRequest("OpenAI returned empty output_text.", res);
      }

      const parsed = safeParse(text);
      if (!parsed) return badRequest("OpenAI returned non-JSON.", text);

      return NextResponse.json(parsed);
    }

    // -------- GEMINI --------
    if (prov === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return badRequest("GEMINI_API_KEY is not set.");
      const { GoogleGenerativeAI } = await import("@google/generative-ai");

      const genAI = new GoogleGenerativeAI(apiKey);
      const mdl = model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const gemModel = genAI.getGenerativeModel({ model: mdl });

      // Ask Gemini to return raw JSON (no code fences)
      const prompt = [
        SYSTEM_INSTRUCTIONS,
        "",
        "History:",
        JSON.stringify(messages),
        "",
        "Return JSON ONLY (no backticks) exactly matching the schema.",
      ].join("\n");

      const result = await gemModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
        } as any,
      });

      const text = result.response?.text();
      if (!text) return badRequest("Gemini returned empty text.", result);

      const parsed = safeParse(text);
      if (!parsed) return badRequest("Gemini returned non-JSON.", text);

      return NextResponse.json(parsed);
    }

    return badRequest("Unknown provider.");
  } catch (err: any) {
    console.error("Explore API error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

// -------- Robust parser (handles plain JSON or JSON inside fences) --------
function safeParse(text: string): ExploreResponse | null {
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract a JSON block if model wrapped it
    const m = text.match(/\{[\s\S]*\}$/m);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}
