"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";

type Msg = {
  role: "user" | "assistant";
  text: string;
  followUps?: string[];
};

const SKILL_CHIPS = [
  "CNC Machining",
  "Welding",
  "Quality Control",
  "Automation & Robotics",
  "Maintenance & Repair",
  "Data Analysis",
  "Supply Chain Management",
  "Design & Engineering",
];

const SALARY_CHIPS = ["<$40k", "$40–60k", "$60–80k+", "$80–100k+"];

const TRAINING_CHIPS = [
  "< 6 months",
  "6–12 months",
  "1–2 years",
  "2–4 years",
  "Apprenticeship paths",
];

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={[
          "max-w-[850px] rounded-2xl px-5 py-4 shadow-sm",
          isUser
            ? "bg-blue-100 text-slate-900 rounded-tr-md"
            : "bg-slate-50 text-slate-900 rounded-tl-md",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function FollowUps({
  items,
  onPick,
}: {
  items?: string[];
  onPick: (q: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.slice(0, 6).map((q, i) => (
        <button
          key={i}
          onClick={() => onPick(q)}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

export default function ExplorePage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [mode, setMode] = useState<"skills" | "salary" | "training" | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Seed from ?chat=...
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("chat");
    if (q && q.trim()) {
      ask(q.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ask(question: string) {
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "LLM error");
      }
      const answerMarkdown = String(data?.answerMarkdown || "");
      const followUps: string[] = Array.isArray(data?.followUps)
        ? data.followUps.slice(0, 6)
        : [];
      setMessages((m) => [
        ...m,
        { role: "assistant", text: answerMarkdown, followUps },
      ]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            "Sorry — I hit a snag generating that. Please try again, or pick a different option.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const header = useMemo(
    () => (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Manufacturing Career Explorer
        </h1>
        <p className="mt-3 text-slate-600">
          Welcome! How would you like to explore career paths in manufacturing?
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setMode("skills")}
              className={`rounded-full px-4 py-2 border ${
                mode === "skills"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Explore by skills
            </button>
            <button
              onClick={() => setMode("salary")}
              className={`rounded-full px-4 py-2 border ${
                mode === "salary"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Explore by salary range
            </button>
            <button
              onClick={() => setMode("training")}
              className={`rounded-full px-4 py-2 border ${
                mode === "training"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Explore by training length
            </button>
          </div>

          {/* Chips for current mode */}
          {mode === "skills" && (
            <div className="mt-4 flex flex-wrap gap-3">
              {SKILL_CHIPS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(`Explain the skill area: ${s}`)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {mode === "salary" && (
            <div className="mt-4 flex flex-wrap gap-3">
              {SALARY_CHIPS.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    ask(`What manufacturing roles fit the salary range ${s}?`)
                  }
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {mode === "training" && (
            <div className="mt-4 flex flex-wrap gap-3">
              {TRAINING_CHIPS.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    ask(
                      `What manufacturing paths match training length ${s}?`
                    )
                  }
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    [mode]
  );

  return (
    <div className="w-full">
      {header}

      <div
        ref={containerRef}
        className="mx-auto mt-6 max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-24"
      >
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role}>
              {m.role === "assistant" ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.text}
                  </ReactMarkdown>
                  <FollowUps
                    items={m.followUps}
                    onPick={(q) => ask(q)}
                  />
                </>
              ) : (
                <div className="whitespace-pre-wrap">{m.text}</div>
              )}
            </Bubble>
          ))}

          {loading && (
            <div className="text-sm text-slate-500">Thinking…</div>
          )}
        </div>
      </div>
    </div>
  );
}
