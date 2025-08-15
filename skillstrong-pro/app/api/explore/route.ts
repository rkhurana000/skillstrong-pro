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

const SYSTEM = `
You are SkillStrong, an expert manufacturing career guide.

GOALS:
- Give concise, skimmable answers in clean Markdown.
- Use sections, short paragraphs, and bulleted lists.
- Include next steps (training, certifications, links-to-types-of-providers—not specific schools).
- Finish by proposing up to 6 helpful follow-up questions tailored to the conversation so far.

OUTPUT FORMAT:
Return ONLY strict JSON in this shape (no extra text):

{
  "answer_markdown": "string with markdown",
  "follow_ups": ["short question 1", "short question 2", "... up to 6"]
}
`.trim();

function buildOpenAIMessages(history: Msg[], question: string) {
  // map history into OpenAI message objects
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
  // Gemini takes an array of contents with roles 'user'/'model'
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

// robust JSON extractor (works if model adds code fences accidentally)
function safeParseJSON(text: string): { answer_markdown?: string; follow_ups?: string[] } {
  try {
    // try direct
    return JSON.parse(text);
  } catch {
    // try to find a JSON block
    const match = text.match(/\{[\s\S]*\}$/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* noop */
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

    const tryOpenAI = async () => {
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

      const content = resp.choices?.[0]?.message?.content || "{}";
      const data = safeParseJSON(content);
      return {
        providerUsed: "openai" as const,
        answerMarkdown: data.answer_markdown || "Sorry, I couldn't format the answer.",
        followUps: Array.isArray(data.follow_ups) ? data.follow_ups.slice(0, 6) : [],
      };
    };

    const tryGemini = async () => {
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
      const data = safeParseJSON(text);
      return {
        providerUsed: "gemini" as const,
        answerMarkdown: data.answer_markdown || "Sorry, I couldn't format the answer.",
        followUps: Array.isArray(data.follow_ups) ? data.follow_ups.slice(0, 6) : [],
      };
    };

    let out:
      | { providerUsed: "openai" | "gemini"; answerMarkdown: string; followUps: string[] }
      | null = null;

    if (provider === "openai") {
      out = await tryOpenAI();
    } else if (provider === "gemini") {
      out = await tryGemini();
    } else {
      // auto: prefer OpenAI, then fall back to Gemini
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
