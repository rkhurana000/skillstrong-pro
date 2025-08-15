// app/api/explore/route.ts
import { NextRequest, NextResponse } from "next/server";

// --- Runtime ---
// OpenAI's Node SDK needs the Node runtime, not "edge".
export const runtime = "nodejs";

// --- Optional: keep the route cached off ---
export const dynamic = "force-dynamic";

// --- Env helpers ---
const PROVIDER = (process.env.PROVIDER || "gemini").toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// We import conditionally so the build doesn't fail if one SDK is missing.
let OpenAI: any = null;
let GoogleGenerativeAI: any = null;

if (PROVIDER === "openai") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  OpenAI = require("openai").default;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI;
}

// --- Types for request/response ---
type Mode = "skills" | "salary" | "training" | "freeform";

interface ExploreRequest {
  mode?: Mode;
  selection?: string;      // e.g. "CNC Machining", "$60–80k+", "12–24 months"
  question?: string;       // freeform question if user typed something
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}

interface ExploreResponse {
  ok: boolean;
  answerMarkdown?: string;
  followUps?: string[];
  error?: string;
}

// --- Shared prompt builder ---
function buildSystemPrompt(payload: ExploreRequest) {
  const mode = payload.mode || "freeform";
  const selection = payload.selection || "";
  const typed = payload.question || "";

  const modeInstruction =
    mode === "skills"
      ? `User is exploring by SKILLS. Their current selection is: "${selection}".`
      : mode === "salary"
      ? `User is exploring by SALARY. Their current selection is: "${selection}".`
      : mode === "training"
      ? `User is exploring by TRAINING LENGTH. Their current selection is: "${selection}".`
      : `User asked a FREEFORM question: "${typed}".`;

  const historyText =
    payload.history && payload.history.length
      ? `Conversation so far:\n${payload.history
          .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
          .join("\n")}`
      : "No prior conversation.";

  return `
You are a friendly manufacturing-careers coach. Write concise, helpful answers in GitHub-Flavored Markdown.
Focus on real U.S. manufacturing roles (e.g., CNC Machinist, Quality Tech, Welder, Mechatronics Tech, etc.).
When it helps, show bullet lists with emoji section labels like:
- **🛠️ Duties**
- **🎓 Training**
- **📈 Career Outlook**
- **💼 Common Employers**
- **💵 Salary**
Keep paragraphs short.

${modeInstruction}

${historyText}

You MUST return JSON that matches this schema exactly:
{
  "answerMarkdown": string,            // Rich Markdown with lists and short paragraphs
  "followUps": string[]                // Up to 6 short suggested follow-up questions
}
Rules:
- "followUps" MUST have between 1 and 6 items.
- Each follow-up should be a short, natural question the user can click next.
- Do not include backticks or code fences around the JSON.
`;
}

// --- Default follow-ups if parsing fails ---
function defaultFollowUps(mode: Mode, selection: string): string[] {
  if (mode === "skills") {
    return [
      `What does a beginner need to get started with ${selection}?`,
      `Which certifications help in ${selection}?`,
      `What are entry-level roles related to ${selection}?`,
      `How does pay progress with ${selection}?`,
    ];
  }
  if (mode === "salary") {
    return [
      "What roles commonly fall in this salary range?",
      "What skills can help me reach the upper end of this range?",
      "What training paths lead to this range?",
      "How does pay vary by state?",
    ];
  }
  if (mode === "training") {
    return [
      "Which programs fit this training length?",
      "Are there apprenticeships for this path?",
      "What does the day-to-day look like after this training?",
      "What roles hire graduates from such programs?",
    ];
  }
  return [
    "What training or certifications would you recommend?",
    "What are nearby programs I can consider?",
    "What’s the typical day like in that role?",
    "How can I transition from another field?",
  ];
}

// --- JSON parsing helpers (tolerant) ---
function tryExtractJson(text: string): { answerMarkdown: string; followUps: string[] } | null {
  // Remove code fences if the model accidentally adds them
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  // Try direct JSON.parse first
  try {
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj.answerMarkdown === "string" && Array.isArray(obj.followUps)) {
      // Cap at 6
      obj.followUps = obj.followUps.slice(0, 6);
      return obj;
    }
  } catch {
    // ignore and try a looser extract below
  }

  // Try to find the first balanced JSON object in the text
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = cleaned.slice(start, end + 1);
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj.answerMarkdown === "string" && Array.isArray(obj.followUps)) {
        obj.followUps = obj.followUps.slice(0, 6);
        return obj;
      }
    } catch {
      // swallow
    }
  }
  return null;
}

// --- OpenAI (Responses API) ---
async function callOpenAI(payload: ExploreRequest): Promise<ExploreResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "Missing OPENAI_API_KEY" };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const jsonSchema = {
    name: "explore_answer",
    schema: {
      type: "object",
      properties: {
        answerMarkdown: { type: "string" },
        followUps: {
          type: "array",
          items: { type: "string" },
          maxItems: 6,
        },
      },
      required: ["answerMarkdown", "followUps"],
      additionalProperties: false,
    },
    strict: true,
  };

  const input = buildSystemPrompt(payload);

  const resp = await client.responses.create({
    model: OPENAI_MODEL,               // e.g., 'gpt-4o-mini'
    input,                             // single string with all context
    temperature: 0.4,
    max_output_tokens: 700,            // MUST be >= 16 (you saw that 400 earlier)
    response_format: {                 // <-- CORRECT key & shape
      type: "json_schema",
      json_schema: jsonSchema,
    },
  });

  // The SDK gives a convenience field for combined text
  const text: string = (resp as any).output_text ?? "";

  const parsed = tryExtractJson(text);
  if (parsed) {
    return { ok: true, ...parsed };
  }

  // Fallback if parsing failed
  return {
    ok: true,
    answerMarkdown:
      "I couldn’t format that perfectly, but here’s a quick overview. Try asking another follow-up!",
    followUps: defaultFollowUps(payload.mode || "freeform", payload.selection || ""),
  };
}

// --- Gemini ---
async function callGemini(payload: ExploreRequest): Promise<ExploreResponse> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    return { ok: false, error: "Missing GEMINI_API_KEY (or GOOGLE_API_KEY)" };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const input = buildSystemPrompt(payload);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
    generationConfig: {
      maxOutputTokens: 700, // similar budget to OpenAI call
      temperature: 0.4,
    },
  });

  const text = result.response.text() ?? "";
  const parsed = tryExtractJson(text);
  if (parsed) {
    return { ok: true, ...parsed };
  }

  return {
    ok: true,
    answerMarkdown:
      "Here’s a brief overview based on your selection. You can ask another question to go deeper.",
    followUps: defaultFollowUps(payload.mode || "freeform", payload.selection || ""),
  };
}

// --- Route handler ---
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as ExploreRequest;

    let out: ExploreResponse;
    if (PROVIDER === "openai") {
      out = await callOpenAI(payload);
    } else {
      out = await callGemini(payload);
    }

    return NextResponse.json(out);
  } catch (err: any) {
    console.error("EXPLORE route error:", err?.message || err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sorry — I hit a snag generating that. Please try again, or pick a different option.",
      } satisfies ExploreResponse,
      { status: 500 }
    );
  }
}
