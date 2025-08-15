// app/api/explore/route.ts
import { NextResponse } from "next/server";

// --- Helpers ---------------------------------------------------------------

type Msg = { role: "user" | "assistant" | "system"; content: string };

function buildSystemPrompt() {
  return `
You are SkillStrong's Manufacturing Career Guide for students. 
Answer ONLY about manufacturing careers, training, certifications, apprenticeships, and related topics.

Return JSON ONLY (no prose outside JSON).
Shape:
{
  "markdown": string,     // well-formatted Markdown answer with headings and bullets
  "followups": string[]   // 3–6 short, clickable follow-up questions
}

Rules:
- Keep tone friendly and concise.
- Use headings (###) and bullet lists where helpful.
- Include **no more than 6** follow-up questions.
- If the user asks for local results or schools/jobs, include a short note like:
  "_Tip: add your ZIP in Account for nearby results._"
`.trim();
}

function messagesToOpenAI(messages: Msg[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function messagesToGeminiText(messages: Msg[]) {
  // Gemini REST works great with one big prompt
  // Keep last few turns for brevity.
  const last = messages.slice(-8);
  const lines = last.map((m) => {
    const tag = m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System";
    return `${tag}: ${m.content}`;
  });
  return lines.join("\n\n");
}

function stripCodeFences(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function coerceToAnswer(obj: any) {
  // Ensure we always have a usable shape
  const markdown =
    typeof obj?.markdown === "string"
      ? obj.markdown
      : typeof obj === "string"
      ? obj
      : "Sorry — I couldn’t format that answer.";
  const followups = Array.isArray(obj?.followups)
    ? obj.followups.filter((x: any) => typeof x === "string").slice(0, 6)
    : [];
  return { markdown, followups };
}

// --- Providers -------------------------------------------------------------

async function callOpenAI(messages: Msg[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const sys = buildSystemPrompt();

  // Use the chat.completions endpoint with json_object forcing.
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: sys }, ...messagesToOpenAI(messages)],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
    "";

  // Try to parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    parsed = { markdown: String(raw || ""), followups: [] };
  }
  return coerceToAnswer(parsed);
}

async function callGemini(messages: Msg[]) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY / GEMINI_API_KEY");

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const sys = buildSystemPrompt();
  const userText = messagesToGeminiText(messages);

  const body = {
    contents: [
      { role: "user", parts: [{ text: `${sys}\n\n${userText}\n\nReturn JSON only.` }] },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      // This tells Gemini to return JSON as plain text (no code fences)
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  let parsed: any;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    parsed = { markdown: String(raw || ""), followups: [] };
  }
  return coerceToAnswer(parsed);
}

// --- Route -----------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
    const providerInReq = (body?.provider || "").toString().toLowerCase();
    const providerEnv = (process.env.PROVIDER || "").toLowerCase();
    const provider: "openai" | "gemini" =
      providerInReq === "openai" || providerEnv === "openai" ? "openai" : "gemini";

    const answer =
      provider === "openai" ? await callOpenAI(messages) : await callGemini(messages);

    return NextResponse.json({ ok: true, answer }, { status: 200 });
  } catch (err: any) {
    console.error("EXPLORE API ERROR:", err?.message || err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to generate.",
        // fallback object so UI can still render something
        answer: {
          markdown:
            "Sorry — I couldn’t generate a readable answer. Please try again or switch the model.",
          followups: ["Try again", "Switch to a different model"],
        },
      },
      { status: 200 }
    );
  }
}
