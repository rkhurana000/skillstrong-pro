'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
// Vercel sometimes has a vfile type mismatch with remark-gfm; cast to any.
import remarkGfm from 'remark-gfm';

type ModelProvider = 'gemini' | 'openai';
type Role = 'user' | 'assistant';

type ChatMessage = {
  role: Role;
  content: string;
  followups?: string[];
};

const MARKDOWN_PLUGINS = [remarkGfm as unknown as any];

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur p-4 md:p-6">
      {children}
    </div>
  );
}

function AnswerCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-6 shadow-sm">
      {children}
    </div>
  );
}

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
      className={[
        'px-4 py-2 rounded-full border text-sm md:text-base transition',
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white hover:bg-slate-50 border-slate-200',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function FollowUps({
  items,
  onPick,
}: {
  items?: string[];
  onPick: (text: string) => void;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.slice(0, 6).map((q, i) => (
        <button
          key={`${q}-${i}`}
          onClick={() => onPick(q)}
          className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

// Safely pull a readable answer out of whatever shape the API returns
function pickContent(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;

  // common keys we might use
  const candidates: any[] = [
    raw.content,
    raw.answer,
    raw.text,
    raw.message,
    raw.markdown,
    raw.output_text,
    raw.output,
    raw.result?.text,
    raw.result?.output,
    raw.choices?.[0]?.message?.content, // OpenAI classic
    Array.isArray(raw.candidates)
      ? raw.candidates
          ?.map((c: any) =>
            Array.isArray(c?.content?.parts)
              ? c.content.parts.map((p: any) => p?.text || '').join('\n\n')
              : c?.content?.parts?.text || ''
          )
          .join('\n\n')
      : undefined, // Gemini
  ].filter(Boolean);

  const first = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  if (typeof first === 'string') return first;

  // as a last resort, show nothing (UI will print a polite apology)
  return '';
}

function pickFollowups(raw: any): string[] {
  if (!raw) return [];
  const direct =
    raw.followups ??
    raw.followUps ??
    raw.suggestions ??
    raw.next ??
    raw.nextSteps ??
    raw.suggested_questions;
  if (Array.isArray(direct)) return direct.filter(Boolean).slice(0, 6);

  // If the API passes a single text blob that includes "FOLLOWUPS: [...]"
  const fromText = pickContent(raw);
  const m = fromText.match(/FOLLOWUPS:\s*(\[[\s\S]*?\])/i);
  if (m) {
    try {
      const arr = JSON.parse(m[1]);
      if (Array.isArray(arr)) return arr.filter(Boolean).slice(0, 6);
    } catch {
      /* ignore */
    }
  }
  return [];
}

export default function ExplorePage() {
  // —— UI state
  const [mode, setMode] = useState<'skills' | 'salary' | 'training'>('skills');
  const [provider, setProvider] = useState<ModelProvider>('gemini');

  // —— chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // auto-scroll to the latest message
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  // seeds
  const salaryBuckets = ['$40–60k', '$60–80k+', '$80–100k+'];
  const skillBuckets = [
    'Welding',
    'CNC Machining',
    'Quality Control',
    'Automation & Robotics',
    'Supply Chain Management',
    'Maintenance & Repair',
    'Data Analysis',
    'Design & Engineering',
  ];
  const trainingBuckets = ['< 3 months', '3–12 months', '1–2 years'];

  const headerText = useMemo(() => {
    if (mode === 'skills') return 'Explore by skills';
    if (mode === 'salary') return 'Explore by salary range';
    return 'Explore by training length';
  }, [mode]);

  async function send(userText: string) {
    if (!userText.trim()) return;

    const next = [...messages, { role: 'user' as const, content: userText }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,       // Gemini/OpenAI without redeploy
          messages: next, // full context
          intent: mode,   // skills/salary/training
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Request failed');
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const raw = await res.json();

      const content = pickContent(raw);
      const followups = pickFollowups(raw);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            typeof content === 'string' && content.trim().length > 0
              ? content
              : 'Sorry — I didn’t get a readable answer. Please try again.',
          followups: Array.isArray(followups) ? followups.slice(0, 6) : [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry — I hit a snag generating that. Please try again, or pick a different option.',
          followups: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleSeed = (label: string) => {
    // Turn a chip into a natural prompt
    if (mode === 'salary') {
      send(`What manufacturing roles fit the salary range ${label}?`);
    } else if (mode === 'skills') {
      send(`Show me manufacturing career paths related to ${label}.`);
    } else {
      send(`Manufacturing careers with training length ${label}.`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-semibold">
          Manufacturing Career Explorer
        </h1>

        {/* Model switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Model</span>
          <div className="inline-flex rounded-full border border-slate-200 overflow-hidden">
            <button
              className={[
                'px-3 py-1 text-sm',
                provider === 'gemini' ? 'bg-slate-900 text-white' : 'bg-white',
              ].join(' ')}
              onClick={() => setProvider('gemini')}
            >
              Gemini
            </button>
            <button
              className={[
                'px-3 py-1 text-sm border-l border-slate-200',
                provider === 'openai' ? 'bg-slate-900 text-white' : 'bg-white',
              ].join(' ')}
              onClick={() => setProvider('openai')}
            >
              OpenAI
            </button>
          </div>
        </div>
      </div>

      {/* Mode + seeds */}
      <div className="mt-6">
        <SectionCard>
          <div className="flex flex-wrap gap-2">
            <Chip active={mode === 'skills'} onClick={() => setMode('skills')}>
              Explore by skills
            </Chip>
            <Chip active={mode === 'salary'} onClick={() => setMode('salary')}>
              Explore by salary range
            </Chip>
            <Chip
              active={mode === 'training'}
              onClick={() => setMode('training')}
            >
              Explore by training length
            </Chip>
          </div>

          <div className="mt-4 text-slate-600 font-medium">{headerText}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(mode === 'salary'
              ? salaryBuckets
              : mode === 'skills'
              ? skillBuckets
              : trainingBuckets
            ).map((label) => (
              <Chip key={label} onClick={() => handleSeed(label)}>
                {label}
              </Chip>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Conversation */}
      <div className="mt-6 space-y-4">
        {messages.map((m, idx) =>
          m.role === 'user' ? (
            <div key={idx} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-blue-50 text-slate-900 px-4 py-3">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={idx} className="flex justify-start">
              <div className="max-w-[95%] w-full">
                <AnswerCard>
                  <ReactMarkdown
                    remarkPlugins={MARKDOWN_PLUGINS}
                    components={{
                      h1: (p) => (
                        <h1
                          className="text-xl md:text-2xl font-semibold mt-1 mb-3"
                          {...p}
                        />
                      ),
                      h2: (p) => (
                        <h2
                          className="text-lg md:text-xl font-semibold mt-2 mb-2"
                          {...p}
                        />
                      ),
                      p: (p) => <p className="leading-7 mb-3" {...p} />,
                      li: (p) => <li className="mb-1" {...p} />,
                      ul: (p) => <ul className="list-disc pl-5 mb-3" {...p} />,
                      ol: (p) => (
                        <ol className="list-decimal pl-5 mb-3" {...p} />
                      ),
                      table: (p) => (
                        <div className="overflow-x-auto">
                          <table
                            className="min-w-full text-sm border border-slate-200 my-3"
                            {...p}
                          />
                        </div>
                      ),
                      th: (p) => (
                        <th className="border px-3 py-2 bg-slate-100" {...p} />
                      ),
                      td: (p) => <td className="border px-3 py-2" {...p} />,
                      code: (p) => (
                        <code
                          className="rounded bg-slate-100 px-1 py-0.5"
                          {...p}
                        />
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>

                  <FollowUps items={m.followups} onPick={(q) => send(q)} />
                </AnswerCard>
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-slate-500">
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
