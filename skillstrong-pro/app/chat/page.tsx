'use client';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Guided = {
  answer: string;
  buttons?: { label?: string; action?: string; query?: string }[];
  nav?: { title?: string; url?: string }[];
  facts?: { k?: string; v?: string }[];
};

type Item = { type: 'assistant' | 'user' | 'results'; content: any };

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
        .select('*')
        .eq('id', u.id)
        .single();
      setZip((prof as any)?.zip || '');
    });
  }, []);

  useEffect(() => {
    scRef.current?.scrollTo({ top: 999999 });
  }, [items]);

  const starters = [
    { label: 'Explore by job types' },
    { label: 'Explore by salary range' },
    { label: 'Explore by training length' },
  ];

  const salaryChips = [
    { label: '<$40k' },
    { label: '$40–60k' },
    { label: '$60–80k+' },
  ];

  async function send(text: string) {
    setBusy(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, zip }),
    });
    const guided: Guided = await res.json();
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
    if (btn.action === 'search_jobs' || btn.action === 'search_training' || btn.action === 'search_web') {
      const q = btn.query || label;
      const url = `/api/search?action=${encodeURIComponent(btn.action)}&q=${encodeURIComponent(q)}&zip=${encodeURIComponent(zip || '')}`;
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
        {items.length === 0 && (
          <>
            <div className="answer" style={{ maxWidth: 860, margin: '0 auto' }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>How would you like to explore?</div>
              <div className="chips">
                {starters.map((c) => (
                  <div key={c.label} className="chip" onClick={() => onChipClick(c)}>
                    {c.label}
                  </div>
                ))}
              </div>
              <div style={{ height: 12 }} />
              <div className="small">Salary explorer</div>
              <div className="chips">
                {salaryChips.map((c) => (
                  <div key={c.label} className="chip" onClick={() => onChipClick(c)}>
                    {c.label}
                  </div>
                ))}
              </div>
              <div style={{ height: 16 }} />
              <div className="small">ZIP for nearby results (set it in your <a href="/account">Account</a>)</div>
              {zip && <div className="chip">{zip}</div>}
            </div>
          </>
        )}

        {items.map((it, idx) => (
          <div key={idx} style={{ maxWidth: 900, margin: '14px auto' }}>
            {it.type === 'user' && (
              <div style={{ textAlign: 'right' }}>
                <div className="chip" style={{ background: '#e8f0fe', borderColor: '#cfe0ff', display: 'inline-block' }}>
                  {it.content}
                </div>
              </div>
            )}
            {it.type === 'assistant' && <AssistantBlock guided={it.content as Guided} onChip={onChipClick} />}
            {it.type === 'results' && <ResultsBlock data={it.content} />}
          </div>
        ))}
      </div>
      <div className="inputbar">
        <input
          className="input-xl"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
          disabled={busy}
        />
      </div>
    </div>
  );
}

function AssistantBlock({ guided, onChip }:{ guided: Guided, onChip:(b:any)=>void }){
  const btns = (guided.buttons || []).filter(b => b && b.label);
  const facts = (guided.facts || []).filter(f => f && (f.k || f.v));
  return (
    <div className="answer">
      <div style={{ marginBottom: 12 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{guided.answer}</ReactMarkdown>
      </div>
      {!!facts.length && (
        <div className="chips" style={{ marginBottom: 8 }}>
          {facts.map((f,i) => <div key={i} className="chip">{f.k ? `${f.k}: ` : ''}{f.v || ''}</div>)}
        </div>
      )}
      {!!btns.length && (
        <div className="chips">
          {btns.map((b,i) => <div key={i} className="chip" onClick={()=>onChip(b)}>{b.label}</div>)}
        </div>
      )}
    </div>
  );
}

function ResultsBlock({ data }:{ data:any }) {
  // Internet RAG payload
  if (data?.answer_markdown) {
    return (
      <div className="answer">
        <div style={{ marginBottom: 12 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.answer_markdown}</ReactMarkdown>
        </div>
        {Array.isArray(data.images) && data.images.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:10, marginBottom:10 }}>
            {data.images.map((im:any, i:number) => (
              <a key={i} href={im.url} target="_blank" rel="noreferrer" className="card">
                {/* keep <img> simple to avoid Next image domain config */}
                <img src={im.url} alt={im.caption||'image'} style={{ width:'100%', borderRadius:12 }} />
                {im.caption && <div className="small" style={{marginTop:6}}>{im.caption}</div>}
              </a>
            ))}
          </div>
        )}
        {Array.isArray(data.citations) && data.citations.length > 0 && (
          <div className="small">
            <strong>Sources:</strong>{' '}
            {data.citations.map((c:any, i:number) => (
              <span key={i}>
                [{i+1}] <a href={c.url} target="_blank" rel="noreferrer">{c.title || c.url}</a>{' '}
              </span>
            ))}
          </div>
        )}
        {Array.isArray(data.followups) && data.followups.length > 0 && (
          <div className="chips" style={{ marginTop:10 }}>
            {data.followups.map((f:string, i:number) => (
              <div key={i} className="chip" onClick={()=>setItems((prev)=>[...prev, { type:'user', content:f }])}>{f}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // fallback: raw links list (older search)
  const items = Array.isArray(data?.items) ? data.items : [];
  if (!items.length) return null;
  return (
    <div className="answer">
      <div style={{ fontWeight:700, marginBottom:8 }}>Results</div>
      <div style={{ display:'grid', gap:10 }}>
        {items.map((it:any, idx:number)=>(
          <a key={idx} href={it.url} target="_blank" rel="noreferrer" className="card" style={{display:'block'}}>
            <div style={{fontWeight:700}}>{it.title}</div>
            <div className="small">{it.snippet}</div>
            <div className="small" style={{marginTop:6}}>{it.url}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
