// app/api/explore/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // or "nodejs" if you prefer

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Body = { prompt: string; history?: Msg[]; mode?: string };

const SYSTEM_PROMPT =
  "You are a helpful guide for U.S. manufacturing careers. Be concise, friendly, and practical. Use short sections with bullets when helpful.";

function pickProvider() {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "";
}

export async function POST(req: NextRequest) {
  const { prompt, history = [], mode } = (await req.json()) as Body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const provider = (process.env.AI_PROVIDER || pickProvider()).toLowerCase();

  try {
    if (provider === "openai") {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
            { role: "user", content: prompt },
          ],
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        return NextResponse.json(
          { error: data?.error?.message || "OpenAI error" },
          { status: 500 }
        );
      }

      const text = data?.choices?.[0]?.message?.content ?? "";
      return NextResponse.json({ text });
    }

    if (provider === "gemini") {
      const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

      // Convert OpenAI-style messages to Gemini "contents"
      const contents = [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        ...history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: prompt }] },
      ];

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        return NextResponse.json(
          { error: data?.error?.message || "Gemini error" },
          { status: 500 }
        );
      }

      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text || "")
          .join("") ?? "";
      return NextResponse.json({ text });
    }

    return NextResponse.json(
      {
        error:
          "No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY (and optionally AI_PROVIDER) in Vercel.",
      },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
