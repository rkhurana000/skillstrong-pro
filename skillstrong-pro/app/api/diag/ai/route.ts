import { NextResponse } from "next/server";

export const runtime = "nodejs";        // use Node runtime
export const dynamic = "force-dynamic"; // don't cache

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "1";

  const openaiKey = process.env.OPENAI_API_KEY || "";
  const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // Try a few common env var names for Gemini
  const geminiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_LANGUAGE_API_KEY ||
    "";
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const results: any = {
    env: {
      hasOpenAIKey: Boolean(openaiKey),
      openaiModel,
      hasGeminiKey: Boolean(geminiKey),
      geminiModel,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    },
    openai: null,
    gemini: null,
  };

  // ---- OpenAI probe ----
  if (!openaiKey) {
    results.openai = { ok: false, error: "OPENAI_API_KEY missing" };
  } else {
    try {
      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: openaiModel,
          input: [{ role: "user", content: "ping" }],
          max_output_tokens: 1,
        }),
      });

      let body: any = null;
      try {
        body = await r.json();
      } catch {
        body = await r.text();
      }

      results.openai = verbose
        ? { ok: r.ok, status: r.status, body }
        : { ok: r.ok, status: r.status, message: body?.error?.message ?? "OK" };
    } catch (e: any) {
      results.openai = { ok: false, error: String(e) };
    }
  }

  // ---- Gemini probe ----
  if (!geminiKey) {
    results.gemini = { ok: false, error: "GEMINI_API_KEY (or GOOGLE_API_KEY) missing" };
  } else {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          geminiModel
        )}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        }
      );

      let body: any = null;
      try {
        body = await r.json();
      } catch {
        body = await r.text();
      }

      results.gemini = verbose
        ? { ok: r.ok, status: r.status, body }
        : {
            ok: r.ok,
            status: r.status,
            message:
              body?.error?.message ??
              body?.candidates?.[0]?.content?.parts?.[0]?.text ??
              "OK",
          };
    } catch (e: any) {
      results.gemini = { ok: false, error: String(e) };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
