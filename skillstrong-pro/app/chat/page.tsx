'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
// If your client file is named differently, change this import:
import { supabase } from '@/lib/supabaseClient';

type Guided = {
  answer: string;
  buttons?: { label?: string; action?: string; query?: string }[];
  nav?: { title?: string; url?: string }[];
  facts?: { k?: string; v?: string }[];
};

type Item = { type: 'assistant' | 'user' | 'results'; content: any };

/** Move “facts” and fact-like buttons into the Markdown answer as a bulleted section */
function normalizeGuided(g: Guided): Guided {
  let answer = g.answer || '';
  const bullets: string[] = [];

  // facts -> bullets
  (g.facts || []).forEach((f) => {
    const line =
      f.k && f.v ? `- **${f.k}**: ${f.v}` :
      f.k ? `- ${f.k}` :
      f.v ? `- ${f.v}` : '';
    if (line) bullets.push(line);
  });

  // buttons that look like facts (numbers, $, %, or ":") -> bullets
  const remaining: NonNullable<Guided['buttons']> = [];
  (g.buttons || []).forEach((b) => {
    const lbl = (b?.label || '').trim();
    if (!lbl) return;
    if (/[0-9$%]/.test(lbl) || /:/.test(lbl)) bullets.push(`- ${lbl}`);
    else remaining.push(b);
  });

  if (bullets.length) answer += `\n\n### Key facts\n\n${bullets.join('\n')}`;

  return { ...g, answer, buttons: remaining, facts: [] };
}

export default function ChatPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [zip, setZip] = useState('');
  const scRef = useRef<HTMLDivElement>(null);

  // Load user + ZIP (for geo-aware search)
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

  // autoscroll on new messages
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
    const guided = normalizeGuided(raw);
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
    <div className="chat">
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

        {/* Conversation stream */}
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

        {/* typing dots */}
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

      {/* Chat-only CSS (scoped by `.chat` so it won't affect the rest of the site) */}
      <style jsx global>{`
        .chat{min-height:100vh;display:flex;flex-direction:column}
        .chat .topbar{position:sticky;top:0;background:#fff;border-bottom:1px solid #e8ecf3;padding:14px 20px;font-weight:700;z-index:10}
        .chat .scroll{flex:1;overflow:auto;padding:20px 14px}
        .chat .inputbar{border-top:1px solid #e8ecf3;background:#fff;padding:12px 16px}
        .chat .input-xl{width:100%;font-size:16px;border:1px solid #e3e8ef;border-radius:24px;padding:14px 16px;outline:none}
        .chat .input-xl:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(43,100,248,.15)}

        .chat .answer{background:#fff;border:1px solid #edf0f6;border-radius:18px;padding:18px 20px;margin:10px auto}
        .chat .answer-title{font-weight:700;margin-bottom:8px}
        .chat .answer-subtitle{margin:12px 0 6px;color:var(--muted);font-weight:600}
        .chat .answer-body{font-size:16px}
        .chat .answer-body h3{margin:14px 0 8px}
        .chat .answer-body ul{padding-left:20px}
        .chat .fade-in{animation:fade .18s ease-in}
        @keyframes fade{from{opacity:.3}to{opacity:1}}

        .chat .sources{margin-top:8px}
        .chat .sources-title{font-weight:700;margin-bottom:4px}
        .chat .sources ol{margin:6px 0 0 20px}
        .chat .sources a{color:var(--accent);text-decoration:none}
        .chat .sources a:hover{text-decoration:underline}

        .chat .chips{display:flex;gap:10px;flex-wrap:wrap}
        .chat .chips-lg .chip{font-size:16px;padding:12px 18px}
        .chat .chip{appearance:none;border:none;background:var(--chip);color:var(--ink);border:1px solid var(--chipBorder);padding:10px 14px;border-radius:999px;cursor:pointer;transition:.15s box-shadow,.15s transform}
        .chat .chip:hover{box-shadow:0 6px 14px rgba(43,100,248,.12);transform:translateY(-1px)}
        .chat .chip:active{transform:translateY(0)}
        .chat .chip-user{background:#e8f0fe;border-color:#cfe0ff}
        .chat .chip-plain{background:#eef2f6;border-color:#e1e7ef;cursor:default}

        .chat .card-col{display:grid;gap:12px}
        .chat .card{display:block;background:#fff;border:1px solid #edf0f6;border-radius:14px;padding:12px 14px;color:inherit;text-decoration:none}
        .chat .card:hover{border-color:#dfe6f4}
        .chat .card-title{font-weight:700;margin-bottom:4px}
        .chat .card img{width:100%;border-radius:12px}
        .chat .url{color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

        .chat .small{color:var(--muted);font-size:13px}

        .chat .dots{display:inline-flex;gap:6px;padding:4px 10px}
        .chat .dots span{width:8px;height:8px;border-radius:999px;background:#cbd5e1;animation:bounce 1.2s infinite}
        .chat .dots span:nth-child(2){animation-delay:.15s}
        .chat .dots span:nth-child(3){animation-delay:.3s}
        @keyframes bounce{0%,80%,100%{opacity:.2;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}

        .chat .image-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:8px 0}
      `}</style>
    </div>
  );
}

/** Assistant message with typewriter reveal + sources + action chips */
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
    const step = Math.max(2, Math.round(full.length / 800)); // ~1s
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
