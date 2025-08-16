"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- Types must match the server ---
type Role = "user" | "assistant";
type Msg = { role: Role; content: string };
type FollowUp = { label: string; payload: string; choices?: string[] };
type ExploreResponse = { markdown: string; followUps: FollowUp[] };

// UI chips
function Chip({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm border transition ${
        selected
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white hover:bg-blue-50 border-neutral-300"
      }`}
    >
      {children}
    </button>
  );
}

// Pretty card for assistant answers
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-neutral-50/70 shadow-sm border border-neutral-200 p-4 md:p-6">
      {children}
    </div>
  );
}

const SKILLS = [
  "Welding",
  "CNC Machining",
  "Quality Control",
  "Automation & Robotics",
  "Supply Chain Management",
  "Maintenance & Repair",
  "Data Analysis",
  "Design & Engineering",
];

type Tab = "skills" | "salary" | "training";

/** Safely parse JSON from API with a tiny fallback (never throws) */
function coerceExploreJson(data: any): ExploreResponse | null {
  if (!data) return null;
  if (typeof data === "object" && data.markdown && data.followUps) return data;

  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      const m = data.match(/\{[\s\S]*\}$/m);
      if (m)
        try {
          return JSON.parse(m[0]);
        } catch {}
    }
  }
  return null;
}

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("skills");
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  // scroll to latest
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [
    messages.length,
    loading,
  ]);

  // initial greeting
  useEffect(() => {
    if (messages.length) return;
    setMessages([
      {
        role: "assistant",
        content:
          "Welcome! Pick a way to explore manufacturing careers, or select a chip to start.",
      },
    ]);
  }, [messages.length]);

  // Send a new turn to the API
  const send = async (userText: string) => {
    const newMsgs = [...messages, { role: "user" as Role, content: userText }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          messages: newMsgs,
        }),
      });

      const raw = await res.json();
      const parsed = coerceExploreJson(raw);

      if (!parsed) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry — I didn’t get a readable answer. Please try again.",
          },
        ]);
      } else {
        const md = parsed.markdown;
        const fu = parsed.followUps ?? [];

        // Append the assistant turn as markdown, then a synthetic “followUps” message
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: md },
          { role: "assistant", content: JSON.stringify({ followUps: fu }) },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error — please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Quick builders for the three tabs
  const primaryChips = useMemo(() => {
    if (tab === "skills")
      return SKILLS.map((s) => (
        <Chip key={s} onClick={() => send(`Explore by skill: ${s}`)}>
          {s}
        </Chip>
      ));

    if (tab === "salary")
      return ["<$40k", "$40–60k", "$60–80k+", "$80–100k+"].map((s) => (
        <Chip key={s} onClick={() => send(`Explore by salary: ${s}`)}>
          {s}
        </Chip>
      ));

    // training
    return ["< 3 months", "3–12 months", "1–2 years", "2+ years"].map((s) => (
      <Chip key={s} onClick={() => send(`Explore by training length: ${s}`)}>
        {s}
      </Chip>
    ));
  }, [tab]);

  // Render assistant follow-up bubbles (we stored them as a JSON string message)
  const renderFollowUps = (m: Msg, idx: number) => {
    if (m.role !== "assistant") return null;
    let payload: { followUps?: FollowUp[] } | null = null;
    try {
      payload = JSON.parse(m.content);
    } catch {
      return null;
    }
    if (!payload?.followUps?.length) return null;

    return (
      <div className="flex flex-wrap gap-3">
        {payload.followUps.map((f, i) => (
          <div key={`${idx}-${i}`} className="flex items-center gap-2">
            <Chip onClick={() => send(f.payload)}>{f.label}</Chip>
            {f.choices?.length ? (
              <div className="flex gap-2">
                {f.choices.map((c) => (
                  <Chip key={c} onClick={() => send(`${f.payload}: ${c}`)}>
                    {c}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">
          Manufacturing Career Explorer
        </h1>

        {/* quick provider toggle (no redeploy) */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-500">Model</span>
          <Chip
            selected={provider === "gemini"}
            onClick={() => setProvider("gemini")}
          >
            Gemini
          </Chip>
          <Chip
            selected={provider === "openai"}
            onClick={() => setProvider("openai")}
          >
            OpenAI
          </Chip>
        </div>
      </div>

      {/* mode tabs */}
      <div className="mt-6 border rounded-2xl p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <Chip selected={tab === "skills"} onClick={() => setTab("skills")}>
            Explore by skills
          </Chip>
          <Chip selected={tab === "salary"} onClick={() => setTab("salary")}>
            Explore by salary range
          </Chip>
          <Chip selected={tab === "training"} onClick={() => setTab("training")}>
            Explore by training length
          </Chip>
        </div>
        <div className="flex flex-wrap gap-2">{primaryChips}</div>
      </div>

      {/* Conversation */}
      <div className="mt-6 space-y-4">
        {messages.map((m, idx) => {
          // Follow-up bubble block we injected
          try {
            const maybeFU = JSON.parse(m.content);
            if (m.role === "assistant" && maybeFU?.followUps) {
              return (
                <div key={idx} className="flex justify-start">
                  {renderFollowUps(m, idx)}
                </div>
              );
            }
          } catch {}

          if (m.role === "user") {
            return (
              <div key={idx} className="flex justify-end">
                <div className="rounded-2xl bg-blue-100 px-4 py-3 text-sm">
                  {m.content}
                </div>
              </div>
            );
          }

          // assistant markdown
          return (
            <div key={idx} className="flex justify-start">
              <Card>
                  <ReactMarkdown remarkPlugins={[remarkGfm as any]}>{m.content}</ReactMarkdown>
              </Card>
            </div>
          );
        })}

        {loading && (
          <div className="text-sm text-neutral-500">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
