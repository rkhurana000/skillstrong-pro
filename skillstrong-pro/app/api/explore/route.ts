// app/api/explore/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Provider = "openai" | "gemini" | "auto";
type Msg = { role: "user" | "assistant"; text: string };

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/**
 * System directions:
 * - Manufacturing-only scope
 * - Output strict JSON with answer + structured follow_ups
 * - Use single-choice follow-ups when you need user input
 */
const SYSTEM = `
You are SkillStrong, an expert manufacturing career guide for students.

SCOPE & TONE:
- Only advise within manufacturing careers, training/certifications, schools/program types (no specific school names), apprenticeships, jobs, safety, soft skills, and readiness.
- Be practical, encouraging, concise. Use clean Markdown with short sections, bullets, and clear next steps.

FOLLOW-UPS:
- If you want user input, do NOT ask open-ended questions. Instead, propose a single-choice follow-up with options the user can click.
- Keep at most 6 follow-ups, tailored to the conversation.
- Examples of single-choice follow-ups:
  - {"label":"Do you have prior welding experience?","type":"single-choice","options":["Yes","No"]}
  - {"label":"Which welding type interests you?","type":"single-choice","options":["MIG (GMAW)","TIG (GTAW)","Stick (SMAW)","Flux-Cored (FCAW)"]}
  - {"label":"Preferred training length?","type":"single-choice","options":["< 6 months","6–12 months","1–2 years","2–4 years","Apprenticeship"]}
- You can also include simple suggestion chips that don't need an answer:
  - {"label":"Show entry-level quality control paths","type":"chip"}
  - {"label":"Explain CNC operator vs. machinist","type":"chip"}

OUTPUT FORMAT:
Return STRICT JSON (no prose) in this exact shape:
{
  "answer_markdown": "string, Markdown answer for the student",
  "follow_ups": [
    // EITHER simple chips:
    { "label": "string", "type": "chip" },
    // OR single-choice follow-ups:
    { "label": "string", "type": "single-choice", "options": ["A","B","C"] }
  ]
}
`.trim();

function buildOpenAIMessages(history: Msg[], question: string) {
  const h = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.text,
  }));
  return [
    { role: "system", content: SYSTEM },
    ...h,
    { role: "user", content: question },
  ] as Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

function buildGeminiContents(history: Msg[], question: string) {
  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));
  contents.unshift({
    role: "user",
    parts: [{ text: `SYSTEM INSTRUCTION:\n${SYSTEM}` }],
  });
  contents.push({ role: "user", parts: [{ text: question }] });
  return contents;
}

type APIOut = {
  providerUsed: "openai" | "gemini";
  answerMarkdown: string;
  followUps: Array<
    | { label: string; type?: "chip"; options?: never }
    | { label: string; type: "single-choice"; options: string[] }
  >;
};

// robust JSON extractor (survives accidental code fences)
function safeParseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}$/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* ignore */
      }
    }
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question, history = [], provider = "auto" } = (await req.json()) as {
      question: string;
      history?: Msg[];
      provider?: Provider;
    };

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing 'question' string." }, { status: 400 });
    }

    const tryOpenAI = async (): Promise<APIOut> => {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error("OPENAI_API_KEY missing");
      const openai = new OpenAI({ apiKey: key });

      const messages = buildOpenAIMessages(history, question);
      const resp = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.6,
        response_format: { type: "json_object" },
        max_tokens: 900,
      });

      const raw = resp.choices?.[0]?.message?.content || "{}";
      const data = safeParseJSON(raw) || {};
      let followUps = Array.isArray(data.follow_ups) ? data.follow_ups : [];

      // Normalize: allow plain strings => chip objects
      followUps = followUps.map((f: any) =>
        typeof f === "string" ? { label: f, type: "chip" } : f
      );

      return {
        providerUsed: "openai",
        answerMarkdown: data.answer_markdown || "Sorry, I couldn't format the answer.",
        followUps,
      };
    };

    const tryGemini = async (): Promise<APIOut> => {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("GEMINI_API_KEY missing");
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM,
      });

      const contents = buildGeminiContents(history, question);
      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
        },
      });
      const text = result.response.text() || "{}";
      const data = safeParseJSON(text) || {};
      let followUps = Array.isArray(data.follow_ups) ? data.follow_ups : [];

      followUps = followUps.map((f: any) =>
        typeof f === "string" ? { label: f, type: "chip" } : f
      );

      return {
        providerUsed: "gemini",
        answerMarkdown: data.answer_markdown || "Sorry, I couldn't format the answer.",
        followUps,
      };
    };

    let out: APIOut | null = null;

    if (provider === "openai") out = await tryOpenAI();
    else if (provider === "gemini") out = await tryGemini();
    else {
      try {
        out = await tryOpenAI();
      } catch {
        out = await tryGemini();
      }
    }

    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "LLM call failed" },
      { status: 500 }
    );
  }
}
