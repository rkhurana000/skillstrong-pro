// app/explore/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
// Tiny types shim to avoid CI type mismatches with remark/vfile versions
import remarkGfmImport from "remark-gfm";
const remarkGfm: any = remarkGfmImport;

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

const TABS = ["skills", "salary", "training"] as const;
type Tab = (typeof TABS)[number];

const SKILL_TAGS = [
  "Welding",
  "CNC Machining",
  "Quality Control",
  "Automation & Robotics",
  "Supply Chain Management",
  "Maintenance & Repair",
  "Data Analysis",
  "Design & Engineering",
];

const SALARY_BANDS = ["< $40k", "$40–60k", "$60–80k+", "$80–100k+"];

// Simple rounded button "chip"
function Chip({
  children,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function ExplorePage() {
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [tab, setTab] = useState<Tab>("skills");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [followups, setFollowups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the newest message/followups
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, followups, loading]);

  async function callLLM(userText: string) {
    const newMessages: Msg[] = [
      ...messages,
      { role: "user" as Role, content: userText },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(`/api/explore?provider=${provider}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-provider": provider,
        },
        body: JSON.stringify({
          intent: tab, // hint for better followups
          messages: newMessages, // keep chat context
        }),
      });

      if (!res.ok) {
        // Graceful error message if the route returns an error JSON
        let readable =
          "Sorry — I couldn’t get an answer. Please try again in a moment.";
        try {
          const err = await res.json();
          if (typeof err?.message === "string") readable = err.message;
        } catch {
          /* ignore */
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant" as Role, content: readable },
        ]);
        setFollowups([]);
        return;
      }

      const data = await res.json();
      const answer: string =
        typeof data?.answer === "string"
          ? data.answer
          : typeof data?.raw === "string"
          ? data.raw
          : "Here’s what I found.";
      const fu: string[] = Array.isArray(data?.followups) ? data.followups : [];

      setMessages((prev) => [
        ...prev,
        { role: "assistant" as Role, content: answer },
      ]);
      setFollowups(fu.slice(0, 6));
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as Role,
          content: "Sorry — I couldn’t reach the model. Please try again.",
        },
      ]);
      setFollowups([]);
    } finally {
      setLoading(false);
    }
  }

  // Quick helpers for the tab chips
  function handleSkillClick(skill: string) {
    callLLM(`Explore manufacturing career paths related to ${skill}.`);
  }
  function handleSalaryClick(band: string) {
    callLLM(`What manufacturing roles fit the salary range ${band}?`);
  }
  function handleTrainingClick() {
    callLLM("Suggest short manufacturing training programs and certifications.");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header & provider toggle */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold">
          Manufacturing Career Explorer
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">Model</span>
          <Chip onClick={() => setProvider("gemini")} active={provider === "gemini"}>
            Gemini
          </Chip>
          <Chip onClick={() => setProvider("openai")} active={provider === "openai"}>
            OpenAI
          </Chip>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <Chip key={t} onClick={() => setTab(t)} active={tab === t}>
            {t === "skills" && "Explore by skills"}
            {t === "salary" && "Explore by salary range"}
            {t === "training" && "Explore by training length"}
          </Chip>
        ))}
      </div>

      {/* Tab content: skill/salary/training chips */}
      <div className="mb-6 rounded-2xl border bg-zinc-50 px-4 py-4">
        {tab === "skills" && (
          <>
            <div className="mb-2 text-sm font-medium text-zinc-600">
              Explore by skills
            </div>
            <div className="flex flex-wrap gap-2">
              {SKILL_TAGS.map((s) => (
                <Chip key={s} onClick={() => handleSkillClick(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </>
        )}

        {tab === "salary" && (
          <div className="flex flex-wrap gap-2">
            {SALARY_BANDS.map((b) => (
              <Chip key={b} onClick={() => handleSalaryClick(b)}>
                {b}
              </Chip>
            ))}
          </div>
        )}

        {tab === "training" && (
          <div>
            <Chip onClick={handleTrainingClick}>Show short programs</Chip>
          </div>
        )}
      </div>

      {/* Conversation */}
      <div className="space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === "user" ? "bg-blue-50" : "bg-white border shadow-sm"
              }`}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-zinc max-w-none"
                >
                  {m.content}
                </ReactMarkdown>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm text-sm text-zinc-500">
              Thinking…
            </div>
          </div>
        )}

        {!loading && followups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {followups.map((f, i) => (
              <Chip key={i} onClick={() => callLLM(f)}>
                {f}
              </Chip>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
