/* app/explore/page.tsx */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";

type Provider = "openai" | "gemini" | "auto";
type ChipFU = { label: string; type?: "chip"; options?: never };
type ChoiceFU = { label: string; type: "single-choice"; options: string[] };
type FollowUp = ChipFU | ChoiceFU;

type Msg = {
  role: "user" | "assistant";
  text: string;
  followUps?: FollowUp[];
};

// avoid TS peer/version mismatches
const REMARK_PLUGINS: any[] = [remarkGfm as any];

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
const SALARY_CHIPS = ["<$40k", "$40–60k", "$60–80k+", "$80–100k+" ];
const TRAINING_CHIPS = ["< 6 months", "6–12 months", "1–2 years", "2–4 years", "Apprenticeship paths"];

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={[
          "max-w-[900px] rounded-2xl px-5 py-4 shadow-sm",
          isUser
            ? "bg-blue-100 text-slate-900 rounded-tr-md"
            : "bg-slate-50 text-slate-900 rounded-tl-md border border-slate-200",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function FollowUps({
  items,
  onChip,
  onChoice,
}: {
  items?: FollowUp[];
  onChip: (label: string) => void;
  onChoice: (label: string, option: string) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items?.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.slice(0, 6).map((fu, idx) => {
        const isChoice = fu.type === "single-choice" && Array.isArray((fu as ChoiceFU).options);
        const isOpen = openIndex === idx;

        if (isChoice) {
          const choice = fu as ChoiceFU;
          return (
            <div key={idx} className="inline-flex flex-col gap-2">
              <button
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
              >
                {choice.label}
              </button>
              {isOpen && (
                <div className="flex flex-wrap gap-2">
                  {choice.options.slice(0, 8).map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setOpenIndex(null);
                        onChoice(choice.label, opt);
                      }}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // simple chip
        const chip = fu as ChipFU;
        return (
          <button
            key={idx}
            onClick={() => onChip(chip.label)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ExplorePage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [mode, setMode] = useState<"skills" | "salary" | "training" | null>(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<Provider>("auto");
  const [providerUsed, setProviderUsed] = useState<"openai" | "gemini" | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // restore provider preference
  useEffect(() => {
    const saved = localStorage.getItem("llmProvider") as Provider | null;
    if (saved) setProvider(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("llmProvider", provider);
  }, [provider]);

  // auto-scroll to latest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // seed from ?chat=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("chat");
    if (q && q.trim()) ask(q.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function callLLM(question: string, historyForServer: Msg[]) {
    const res = await fetch(
      `/api/explore${provider === "auto" ? "" : `?provider=${provider}`}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, provider, history: historyForServer }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "LLM error");
    const answerMarkdown = String(data?.answerMarkdown || "");
    const rawFU = Array.isArray(data?.followUps) ? data.followUps : [];
    // Defensive cast
    const followUps: FollowUp[] = rawFU.map((f: any) =>
      typeof f === "object" ? f : { label: String(f || ""), type: "chip" }
    );
    setProviderUsed(
      data?.providerUsed === "openai" || data?.providerUsed === "gemini"
        ? data.providerUsed
        : null
    );
    return { answerMarkdown, followUps };
  }

  async function ask(question: string) {
    const historyForServer = [...messages]; // full prior context

    // show user's message immediately
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);

    try {
      const { answerMarkdown, followUps } = await callLLM(question, historyForServer);
      setMessages((m) => [...m, { role: "assistant", text: answerMarkdown, followUps }]);
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

  // Follow-up handlers
  function onChip(label: string) {
    ask(label);
  }
  function onChoice(label: string, option: string) {
    // Create a concise selection message so the model sees the choice in context
    const selection = `Selection — ${label}: ${option}`;
    ask(selection);
  }

  const header = useMemo(
    () => (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Manufacturing Career Explorer
            </h1>
            <p className="mt-2 text-slate-600">
              Click a topic, choose an option, or ask anything about careers, training, and apprenticeships in manufacturing.
            </p>
          </div>

          {/* Provider selector (no redeploy needed) */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-slate-500">Model:</span>
            <div className="inline-flex rounded-full border border-slate-300 bg-white p-1">
              {(["auto", "openai", "gemini"] as Provider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={[
                    "px-3 py-1 text-sm rounded-full transition",
                    provider === p
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {p === "auto" ? "Auto" : p === "openai" ? "OpenAI" : "Gemini"}
                </button>
              ))}
            </div>
          </div>
        </div>

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

          {/* Chips per mode */}
          {mode === "skills" && (
            <div className="mt-4 flex flex-wrap gap-3">
              {SKILL_CHIPS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(`Explore skill area: ${s}`)}
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
                  onClick={() => ask(`What manufacturing roles fit the salary range ${s}?`)}
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
                  onClick={() => ask(`What manufacturing paths match training length ${s}?`)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {providerUsed && (
          <div className="mt-2 text-xs text-slate-500">
            Last response from: <span className="font-semibold">{providerUsed}</span>
          </div>
        )}
      </div>
    ),
    [mode, provider, providerUsed, messages]
  );

  return (
    <div className="w-full">
      {header}

      <div className="mx-auto mt-6 max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role}>
              {m.role === "assistant" ? (
                <>
                  <ReactMarkdown
                    remarkPlugins={REMARK_PLUGINS}
                    components={{
                      h2: (p) => <h2 className="text-xl sm:text-2xl font-semibold mt-4 mb-2" {...p} />,
                      h3: (p) => <h3 className="text-lg font-semibold mt-3 mb-1" {...p} />,
                      p: (p) => <p className="mt-2 leading-relaxed" {...p} />,
                      ul: (p) => <ul className="list-disc ml-6 space-y-1 mt-2" {...p} />,
                      ol: (p) => <ol className="list-decimal ml-6 space-y-1 mt-2" {...p} />,
                      li: (p) => <li className="ml-1" {...p} />,
                      hr: () => <hr className="my-4 border-slate-200" />,
                      strong: (p) => <strong className="font-semibold" {...p} />,
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>

                  <FollowUps
                    items={m.followUps}
                    onChip={(label) => onChip(label)}
                    onChoice={(label, option) => onChoice(label, option)}
                  />
                </>
              ) : (
                <div className="whitespace-pre-wrap">{m.text}</div>
              )}
            </Bubble>
          ))}

          {loading && <div className="text-sm text-slate-500">Thinking…</div>}

          {/* Auto-scroll sentinel */}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
