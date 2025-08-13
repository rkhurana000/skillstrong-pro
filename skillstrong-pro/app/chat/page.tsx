'use client';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase'; // if you’re using the shim, '@/lib/supabaseClient'

type Guided = {
  answer: string;
  buttons?: { label?: string; action?: string; query?: string }[];
  nav?: { title?: string; url?: string }[];
  facts?: { k?: string; v?: string }[];
};

type Item = { type: 'assistant' | 'user' | 'results'; content: any };

function normalizeGuided(g: Guided): Guided {
  let answer = g.answer || '';
  const bullets: string[] = [];

  // 1) Move facts into bullets
  (g.facts || []).forEach((f) => {
    const line =
      f.k && f.v ? `- **${f.k}**: ${f.v}` :
      f.k ? `- ${f.k}` :
      f.v ? `- ${f.v}` : '';
    if (line) bullets.push(line);
  });

  // 2) Move “facty” buttons into bullets (numbers, $, %, or a colon)
  const remaining: NonNullable<Guided['buttons']> = [];
  (g.buttons || []).forEach((b) => {
    const lbl = (b?.label || '').trim();
    if (!lbl) return;
    if (/[0-9$%]/.test(lbl) || /:/.test(lbl)) {
      bullets.push(`- ${lbl}`);
    } else {
      remaining.push(b);
    }
  });

  if (bullets.length) {
    answer += `\n\n### Key facts\n\n` + bullets.join('\n');
  }

  return { ...g, answer, buttons: remaining, facts: [] };
}

export default function ChatPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [zip, setZip] = useState('');
  const scRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) {
        window.location.href = '/auth';
        return;
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('zip')
        .eq('id', u.id)
        .single();
      setZip((prof as any)?.zip || '');
    });
  }, []);

  useEffect(() => {
    scRef.current?.scrollTo({ top: 9e9 });
  }, [items]);

  const starters = [
    { label: 'Explore by job types' },
    { label: 'Explore by salary range' },
    { label: 'Explore by training length' },
  ];
  const salaryChips = [{ label: '<$40k' }, { label: '$40–60k' }, { label: '$60–80k+' }];

  async function send(text: string) {
    setBusy(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, zip }),
    });
    const raw: Guided = await res.json();
    const guided = normalizeGuided(raw); // fold facts into the answer
    setItems((prev) => [...prev, { type: 'assistant', content: guided }]);
    setBusy(false);
  }

  async function onChipClick(btn: { label?: string; action?: string; query?: string }) {
    const label = btn.label || '';
    if (btn.action === 'research') {
      const q = btn.query || label;
      const url = `/api/research?action=search_web&q=${encodeURIComponent(q)}&zip=${encodeURIComponent(zip || '')}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems((prev) => [...prev, { type: 'results', content: data }]);
      return;
    }
    setItems((prev) => [...prev, { type: 'user', content: label }]);
    await send(label);
  }

  async function onSubmit() {
    if (!input.trim()) return;
    setItems((prev) => [...prev, { type: 'user', content: input }]);
    await send(input);
    setInput('');
  }

  return (
    <div className="main">
      <div className="topbar">Manufacturing Career Explorer</div>

      <div className="scroll" ref={scRef}>
        {/* Starter block */}
        {items.length === 0 && (
          <div className="answer" style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="answer-title">Welcome! How would you like to explore?</div>
            <div className="chips">
              {starters.map((c) => (
                <button key={c.label} className="chip" onClick={() => onChipClick(c)}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="answer-subtitle">Salary explorer</div>
            <div className="chips">
              {salaryChips.map((c) => (
                <button key={c.label} className="chip" onClick={() => onChipClick(c)}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="small" style={{ marginTop: 12 }}>
              ZIP for nearby results (set it in your <a href="/account">Account</a>)
              {zip ? <span className="chip chip-plain" style={{ marginLeft: 8 }}>{zip}</span> : null}
            </div>
          </div>
        )}

        {/* Conversation */}
        {items.map((it, idx) => (
          <div key={idx} style={{ maxWidth: 900, margin: '14px auto' }}>
            {it.type === 'user' && (
              <div style={{ textAlign: 'right' }}>
                <span className="chip chip-user">{it.content}</span>
              </div>
            )}
            {it.type === 'assistant' && (
              <AssistantBlock guided={it.content as Guided} onChip={onChipClick} />
            )}
            {it.type === 'results' && (
              <ResultsBlock
                data={it.content}
                onFollowup={(f) => {
                  setItems((prev) => [...prev, { type: 'user', content: f }]);
                  send(f);
                }}
              />
            )}
          </div>
        ))}

        {/* typing indicator */}
        {busy && (
          <div className="answer">
            <div className="dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      <div className="inputbar">
        <input
          className="input-xl"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          disabled={busy}
        />
      </div>
    </div>
  );
}

/** Assistant message with typewriter reveal + better sources & pill buttons */
function AssistantBlock({
  guided,
  onChip,
}: {
  guided: Guided;
  onChip: (b: any) => void;
}) {
  // Typewriter effect
  const [shown, setShown] = useState('');
  useEffect(() => {
    const full = guided.answer || '';
    let i = 0;
    const step = Math.max(2, Math.round(full.length / 800)); // ~0.8s–1.5s total
    const id = setInterval(() => {
      i = Math.min(full.length, i + step);
      setShown(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [guided.answer]);

  const btns = (guided.buttons || []).filter((b) => b && b.label);
  const hasSources = Array.isArray(guided.nav) && guided.nav.length > 0;

  return (
    <div className="answer">
      <div className={`answer-body ${shown.length ? 'fade-in' : ''}`}>
        <ReactMarkdown>{shown || ' '}</ReactMarkdown>
      </div>

      {hasSources && (
        <div className="sources">
          <div className="sources-title">Sources</div>
          <ol>
            {guided.nav!.map((n, i) => (
              <li key={i}>
                <a href={n.url} target="_blank" rel="noreferrer">
                  {n.title || n.url}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!!btns.length && (
        <div className="chips chips-lg">
          {btns.map((b, i) => (
            <button key={i} className="chip chip-action" onClick={() => onChip(b)}>
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultsBlock({
  data,
  onFollowup,
}: {
  data: any;
  onFollowup: (q: string) => void;
}) {
  // Internet RAG payload from /api/research
  if (data?.answer_markdown) {
    return (
      <div className="answer">
        <div className="answer-body">
          <ReactMarkdown>{data.answer_markdown}</ReactMarkdown>
        </div>

        {Array.isArray(data.images) && data.images.length > 0 && (
          <div className="image-grid">
            {data.images.map((im: any, i: number) => (
              <a key={i} href={im.url} target="_blank" rel="noreferrer" className="card">
                <img src={im.url} alt={im.caption || 'image'} />
                {im.caption && <div className="small">{im.caption}</div>}
              </a>
            ))}
          </div>
        )}

        {Array.isArray(data.citations) && data.citations.length > 0 && (
          <div className="sources">
            <div className="sources-title">Sources</div>
            <ol>
              {data.citations.map((c: any, i: number) => (
                <li key={i}>
                  <a href={c.url} target="_blank" rel="noreferrer">
                    {c.title || c.url}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {Array.isArray(data.followups) && data.followups.length > 0 && (
          <div className="chips chips-lg">
            {data.followups.map((f: string, i: number) => (
              <button key={i} className="chip chip-action" onClick={() => onFollowup(f)}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // fallback: raw links
  const items = Array.isArray(data?.items) ? data.items : [];
  if (!items.length) return null;
  return (
    <div className="answer">
      <div className="answer-title">Results</div>
      <div className="card-col">
        {items.map((it: any, idx: number) => (
          <a key={idx} href={it.url} target="_blank" rel="noreferrer" className="card">
            <div className="card-title">{it.title}</div>
            <div className="small">{it.snippet}</div>
            <div className="small url">{it.url}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
