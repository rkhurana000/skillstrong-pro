import { NextRequest, NextResponse } from "next/server";

// ---- Shared types with the client ----
type Role = "user" | "assistant";
export type Msg = { role: Role; content: string };
export type FollowUp = { label: string; payload: string; choices?: string[] };
export type ExploreResponse = { markdown: string; followUps: FollowUp[] };

// ---- Helpers ----
const SYSTEM_INSTRUCTIONS = `
You are SkillStrong's manufacturing career coach for US students.
Stay strictly in manufacturing topics (careers, training, certs, apprenticeships, local programs, entry-level jobs).
Return answers as concise, friendly Markdown (short headings, bullets, callouts).
Always include up to 6 useful follow-up actions.

IMPORTANT for OpenAI: always CALL the tool "return_explore" exactly once with your final JSON.
Do not print extra text when you call the tool.
If a follow-up implies a choice (Yes/No or MIG/TIG/Stick), include a "choices" array for quick pick chips.
`;

const JSON_SCHEMA = {
  // We reuse the same JSON schema for both providers
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["markdown", "followUps"],
    properties: {
      markdown: {
        type: "string",
        description:
          "A well-formatted Markdown answer (headings, bullets, short callouts). No code fences.",
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
            payload: { type: "string" },
            choices: { type: "array", items: { type: "string" } },
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

function safeParse(text: string): ExploreResponse | null {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}$/m);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

// ---- Route ----
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider, // "openai" | "gemini"
      model,
      messages,
    }: { provider?: "openai" | "gemini"; model?: string; messages: Msg[] } =
      body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return badRequest("Missing 'messages' array.");
    }

    const prov =
      provider ??
      (process.env.PROVIDER as "openai" | "gemini" | undefined) ??
      "gemini";

    // ---------- OPENAI via Chat Completions + tools ----------
    if (prov === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return badRequest("OPENAI_API_KEY is not set.");

      const { OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey });

      const openaiModel = model || process.env.OPENAI_MODEL || "gpt-4o-mini";

      const chat = await client.chat.completions.create({
        model: openaiModel,
        temperature: 0.6,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTIONS },
          // pass full history so follow-ups keep context
          ...messages.map((m) => ({ role: m.role, content: m.content })) as any,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_explore",
              description:
                "Return the final JSON payload to render (markdown + up to 6 followUps).",
              // OpenAI tool schema expects JSON Schema v7-ish; our object is compatible.
              parameters: JSON_SCHEMA.schema as any,
            },
          },
        ],
        // Force the model to call our tool with the structured output
        tool_choice: { type: "function", function: { name: "return_explore" } },
        max_tokens: 900,
      } as any); // cast for older SDK typings

      const choice = chat.choices?.[0];
      const toolCall = choice?.message?.tool_calls?.[0];

      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments) as ExploreResponse;
          return NextResponse.json(parsed);
        } catch (e) {
          // fallback: try to parse normal content if tool args parsing fails
        }
      }

      // Fallback: try to parse raw text (older models may put JSON in content)
      const txt = choice?.message?.content ?? "";
      const parsed = safeParse(txt);
      if (!parsed) return badRequest("OpenAI: could not parse JSON.", chat);
      return NextResponse.json(parsed);
    }

    // ---------- GEMINI ----------
    if (prov === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return badRequest("GEMINI_API_KEY is not set.");

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const mdl = model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const gemModel = genAI.getGenerativeModel({ model: mdl });

      const prompt = [
        SYSTEM_INSTRUCTIONS,
        "",
        "History:",
        JSON.stringify(messages),
        "",
        "Return JSON ONLY exactly matching the schema (no code fences).",
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
