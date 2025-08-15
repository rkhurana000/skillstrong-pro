"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { role: "user" | "assistant"; content: string };
type Follow = { label: string; userQuery: string };

const pretty = (...cls: string[]) => cls.filter(Boolean).join(" ");

const Pill: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
> = ({ active, className, children, ...props }) => (
  <button
    {...props}
    className={pretty(
      "rounded-full border px-4 py-2 text-sm transition",
      active
        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
        : "border-slate-300 hover:bg-slate-50",
      className || ""
    )}
  >
    {children}
  </button>
);

const AnswerCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl bg-gradient-to-br from-white to-slate-50 shadow-sm ring-1 ring-black/5 p-5 md:p-6">
    {children}
  </div>
);

export default function ExplorePage() {
  // Model toggle without redeploy
  const [provider, setProvider] = useState<"gemini" | "openai">(
    (typeof window !== "undefined" &&
      (localStorage.getItem("modelProvider") as "gemini" | "openai")) ||
      "gemini"
  );
  useEffect(() => {
    localStorage.setItem("modelProvider", provider);
  }, [provider]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [followUps, setFollowUps] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const send = async (userText: string) => {
    const newMsgs = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs, provider }),
      });
      const data = (await res.json()) as {
        answerMarkdown: string;
        followUps: Follow[];
      };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answerMarkdown || "…" },
      ]);
      setFollowUps(Array.isArray(data.followUps) ? data.followUps : []);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — I hit a snag generating that. Please try again or switch models.",
        },
      ]);
      setFollowUps([
        { label: "Try again", userQuery: "Please try again" },
        { label: "Switch model", userQuery: "Switch to the other model" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ----- Top “mode” chips -----
  const [exploreMode, setExploreMode] = useState<
    "skills" | "salary" | "training" | null
  >(null);

  const topBar = (
    <div className="flex flex-wrap items-center gap-2">
      <Pill
        active={provider === "gemini"}
        onClick={() => setProvider("gemini")}
        title="Use Google's Gemini"
      >
        Model: Gemini
      </Pill>
      <Pill
        active={provider === "openai"}
        onClick={() => setProvider("openai")}
        title="Use OpenAI"
      >
        Model: OpenAI
      </Pill>
    </div>
  );

  const intro = (
    <div className="rounded-2xl bg-slate-100/60 p-4 md:p-6 ring-1 ring-black/5">
      <h2 className="text-xl md:text-2xl font-semibold">
        Welcome! How would you like to explore career paths in manufacturing?
      </h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Pill active={exploreMode === "skills"} onClick={() => setExploreMode("skills")}>
          Explore by skills
        </Pill>
        <Pill active={exploreMode === "salary"} onClick={() => setExploreMode("salary")}>
          Explore by salary range
        </Pill>
        <Pill
          active={exploreMode === "training"}
          onClick={() => setExploreMode("training")}
        >
          Explore by training length
        </Pill>
      </div>

      {/* Mode-specific starter chips */}
      <div className="mt-4 flex flex-wrap gap-3">
        {exploreMode === "skills" && (
          <>
            {[
              "Welding",
              "CNC Machining",
              "Quality Control",
              "Automation & Robotics",
              "Supply Chain",
              "Data Analysis",
            ].map((s) => (
              <Pill key={s} onClick={() => send(`Show careers for skill: ${s}`)}>
                {s}
              </Pill>
            ))}
          </>
        )}

        {exploreMode === "salary" && (
          <>
            {["<$40k", "$40–60k", "$60–80k+", "$80–100k+"].map((r) => (
              <Pill
                key={r}
                onClick={() => send(`What manufacturing roles fit the salary range ${r}?`)}
              >
                {r}
              </Pill>
            ))}
          </>
        )}

        {exploreMode === "training" && (
          <>
            {[
              "Less than 3 months",
              "3–12 months",
              "1–2 years (associate)",
              "4 years (bachelor)",
            ].map((t) => (
              <Pill
                key={t}
                onClick={() => send(`What training paths ~${t} lead to manufacturing jobs?`)}
              >
                {t}
              </Pill>
            ))}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Manufacturing Career Explorer</h1>
        {topBar}
      </div>

      {intro}

      {/* Chat transcript */}
      <div className="space-y-6">
        {messages.map((m, idx) =>
          m.role === "user" ? (
            <div key={idx} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl bg-blue-100 px-4 py-3 text-sm md:text-base">
                {m.content}
              </div>
            </div>
          ) : (
            <AnswerCard key={idx}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: (p) => <h1 className="text-xl md:text-2xl font-semibold mt-1 mb-3" {...p} />,
                  h2: (p) => <h2 className="text-lg md:text-xl font-semibold mt-2 mb-2" {...p} />,
                  h3: (p) => <h3 className="text-base md:text-lg font-semibold mt-2 mb-1.5" {...p} />,
                  p: (p) => <p className="leading-relaxed my-2" {...p} />,
                  ul: (p) => <ul className="list-disc ml-5 my-2 space-y-1.5" {...p} />,
                  ol: (p) => <ol className="list-decimal ml-5 my-2 space-y-1.5" {...p} />,
                  li: (p) => <li className="leading-relaxed" {...p} />,
                  table: (p) => (
                    <div className="overflow-x-auto my-3">
                      <table className="min-w-full text-sm border border-slate-200" {...p} />
                    </div>
                  ),
                  th: (p) => (
                    <th
                      className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium"
                      {...p}
                    />
                  ),
                  td: (p) => (
                    <td className="border border-slate-200 px-3 py-2 align-top" {...p} />
                  ),
                  code: (p) => (
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[90%]" {...p} />
                  ),
                }}
              >
                {m.content}
              </ReactMarkdown>
            </AnswerCard>
          )
        )}
      </div>

      {/* Dynamic follow-ups: always from the newest assistant turn */}
      {followUps.length > 0 && (
        <div className="rounded-2xl bg-slate-100/60 p-4 ring-1 ring-black/5">
          <div className="grid gap-3 sm:grid-cols-2">
            {followUps.map((f, i) => (
              <Pill
                key={i}
                className="justify-start text-left"
                onClick={() => send(f.userQuery)}
              >
                {f.label}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-sm text-slate-500">Generating…</div>
      )}

      <div ref={bottomRef} className="h-px" />
    </div>
  );
}
