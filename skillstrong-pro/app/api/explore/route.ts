// app/api/explore/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * ENV expected:
 *  - PROVIDER = "openai" | "gemini" (default: gemini)
 *  - OPENAI_API_KEY (if using OpenAI)
 *  - GEMINI_API_KEY (if using Gemini)
 *  - OPENAI_MODEL (optional, default gpt-4o-mini)
 *  - GEMINI_MODEL (optional, default gemini-1.5-flash)
 */

type Msg = { role: "user" | "assistant"; content: string };

const DEFAULT_PROVIDER =
  (process.env.PROVIDER as "openai" | "gemini") || "gemini";

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const openai =
  process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const genAI =
  process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// System guardrails – keeps the domain focused on manufacturing & students.
const SYSTEM_INSTRUCTIONS = `
You are SkillStrong, a concise career guide for **manufacturing** students.
- Keep answers short, skimmable, and structured (headings, bullet lists).
- Stay in manufacturing context: jobs, skills, training, certifications, apprenticeships, schools.
- At the end, suggest up to 6 relevant follow-up questions as short, clickable prompts (no more than ~10 words each).
- If user input looks like a choice (yes/no, MIG/TIG, etc.), act on it and continue the flow.
- Return JSON with keys: "answer" (markdown string) and "followups" (string[] up to 6).
`;

function extractJsonFromText(text: string) {
  // Try to find a fenced JSON block first
  const fence = text.match(/```json([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : text.trim();
  try {
    const obj = JSON.parse(candidate);
    if (obj && typeof obj === "object" && ("answer" in obj || "followups" in obj)) {
      return obj;
    }
  } catch {
    // ignore
  }
  return null;
}

function fallbackFollowups(intentHint?: string): string[] {
  // lightweight heuristic – safe defaults
  const common = [
    "Show nearby training programs",
    "What entry-level jobs fit me?",
    "Apprenticeship options near me",
    "Certifications to start with",
    "What skills should I learn first?",
    "Typical pay & growth outlook",
  ];
  if (!intentHint) return common.slice(0, 4);
  if (intentHint === "skills")
    return ["Skills to begin with", "Beginner projects", "Recommended tools", "Safety basics"];
  if (intentHint === "salary")
    return ["Jobs in this salary band", "How to move up", "Certs to boost pay", "Cities with demand"];
  if (intentHint === "training")
    return ["Short programs", "Community colleges", "Online courses", "How to fund training"];
  return common.slice(0, 6);
}

async function askOpenAI(messages: Msg[], intentHint?: string) {
  if (!openai) throw new Error("OpenAI not configured");
  const sys: Msg = { role: "user", content: `SYSTEM:\n${SYSTEM_INSTRUCTIONS}` };

  // Use chat.completions for maximum compatibility
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.6,
    messages: [
      { role: "system", content: "You are a helpful manufacturing career guide." },
      // Inject system instructions as a user content block (works better across models)
      sys,
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content:
          "Reply ONLY as JSON: {\"answer\": \"<markdown>\", \"followups\": [\"...\"]}.\n" +
          "No prose outside JSON. Make followups <= 6 items.",
      },
    ],
  });

  const text =
    completion.choices?.[0]?.message?.content?.toString() ||
    "";

  const parsed = extractJsonFromText(text);
  if (parsed) return { answer: parsed.answer || "", followups: parsed.followups || [], raw: text };

  // Fallback: return raw text, and synthesize followups
  return {
    answer: text || "Here’s what I found.",
    followups: fallbackFollowups(intentHint),
    raw: text,
  };
}

async function askGemini(messages: Msg[], intentHint?: string) {
  if (!genAI) throw new Error("Gemini not configured");
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = [
    SYSTEM_INSTRUCTIONS,
    "",
    "Conversation:",
    ...messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`),
    "",
    "Reply ONLY as JSON:",
    `{"answer":"<markdown>","followups":["..."]}`,
    "No prose outside JSON. Max 6 followups.",
  ].join("\n");

  const resp = await model.generateContent(prompt);
  const text = resp.response?.text?.() || "";

  const parsed = extractJsonFromText(text);
  if (parsed) return { answer: parsed.answer || "", followups: parsed.followups || [], raw: text };

  return {
    answer: text || "Here’s what I found.",
    followups: fallbackFollowups(intentHint),
    raw: text,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages: Msg[] = Array.isArray(body.messages) ? body.messages : [];
    const providerQuery = (req.nextUrl.searchParams.get("provider") || "").toLowerCase();
    const providerHeader = (req.headers.get("x-provider") || "").toLowerCase();
    const provider = (providerQuery || providerHeader || DEFAULT_PROVIDER) as "openai" | "gemini";
    const intent: string | undefined = body.intent; // "skills" | "salary" | "training" | etc.

    let result: { answer: string; followups: string[]; raw?: string };

    if (provider === "openai") {
      result = await askOpenAI(messages, intent);
    } else {
      result = await askGemini(messages, intent);
    }

    // Normalize & guarantee shape
    const payload = {
      provider,
      answer: result.answer || (result.raw ?? "I couldn’t produce an answer."),
      followups: Array.isArray(result.followups) ? result.followups.slice(0, 6) : [],
      raw: result.raw,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "LLM_CALL_FAILED",
        message: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
