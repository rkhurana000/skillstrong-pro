// /lib/orchestrator.ts
// Coach Mach orchestration: domain guard → local answer → optional Internet RAG (Google CSE) → follow‑ups
// Env: OPENAI_API_KEY, GOOGLE_CSE_ID, GOOGLE_CSE_KEY

import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search';

export type Role = 'system' | 'user' | 'assistant';
export interface Message { role: Role; content: string }
export interface OrchestratorInput { messages: Message[]; location?: string | null }
export interface OrchestratorOutput { answer: string; followups: string[] }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const COACH_SYSTEM = `You are Coach Mach, an upbeat, practical AI career coach focused on modern manufacturing careers (CNC Machinist, Robotics Technician, Additive Manufacturing, Welding Programmer, Industrial Maintenance, Quality/QC, Logistics).\n- Stay strictly on manufacturing topics.\n- Be concise, specific, and actionable. Prefer bullet lists over long paragraphs.\n- When asked for programs or jobs, use the user's location if provided.\n- If you don't know, say so briefly and propose how to find out.\n- NEVER invent URLs or citations.`;

export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const lastUser = [...input.messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const isOverviewSeed =
  /student-friendly overview/i.test(lastUser) ||
  /🔎|🧭|🧰|🧠|💰|⏱️|📜|🚀/.test(lastUser);


  // 1) Domain guard – keep it manufacturing‑only
  if (!(await domainGuard(lastUser))) {
    return {
      answer: `I focus on modern manufacturing careers. We can explore roles like CNC Machinist, Robotics Technician, Welding Programmer, Additive Manufacturing, Maintenance Tech, or Quality Control. What would you like to dive into?`,
      followups: defaultFollowups(),
    };
  }

  // 2) Local answer first
  const local = await answerLocal(input.messages, input.location ?? undefined);

  let finalAnswer = local;
const needWeb = !isOverviewSeed && (await needsInternetRag(lastUser, local));
if (needWeb) {
  const web = await internetRagCSE(lastUser, input.location ?? undefined);
  if (web) finalAnswer = web;
}

  // 4) Follow‑up prompts
  const followups = await generateFollowups(lastUser, finalAnswer, input.location ?? undefined);
  return { answer: finalAnswer, followups };
}

async function domainGuard(query: string): Promise<boolean> {
  if (!query.trim()) return true;
  const allowHints = /(manufact|cnc|robot|weld|machin|apprentice|factory|plant|quality|maintenance|mechatronic|additive|3d\s*print|bls|o\*net|program|community\s*college|trade\s*school|career)/i;
  if (allowHints.test(query)) return true;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini', temperature: 0,
    messages: [
      { role: 'system', content: 'Classify if the question is about MANUFACTURING careers/training/jobs. Answer only IN or OUT.' },
      { role: 'user', content: query },
    ],
  });
  const out = res.choices[0]?.message?.content?.trim().toUpperCase();
  return out?.startsWith('IN') ?? false;
}

async function answerLocal(messages: Message[], location?: string): Promise<string> {
  const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }];
  if (location) msgs.push({ role: 'system', content: `User location: ${location}` });
  msgs.push(...messages);
  const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.3, messages: msgs });
  return res.choices[0]?.message?.content ?? '';
}

async function needsInternetRag(query: string, draft: string): Promise<boolean> {
  const text = (query || '').toLowerCase();

  // High-level/overview questions → NO web
  const overviewish = /(overview|what is|what does .* do|day[- ]?to[- ]?day|tools & tech|core skills)/i;
  const webish     = /(salary|pay|wage|median|bls|jobs?|openings|apprentice|programs?|tuition|cost|near|in\s+[a-z]+)/i;

  if (overviewish.test(text) && !webish.test(text)) return false;

  // Fresh/local data → maybe web
  const heuristics = /(latest|news|202[3-9]|today|near me|nearby|tuition|cost|programs|providers|community\s*college|openings|jobs|apprenticeships|statistics|market\s*size|salary|median|bls|o-net|osha|nims)/i;
  if (heuristics.test(text)) return true;

  if (!draft || /i\s+don\'t\s+know|not\s+sure|no\s+data/.test(draft.toLowerCase())) return true;

  // Cheap model vote
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini', temperature: 0,
    messages: [
      { role: 'system', content: 'Does this question require up-to-date web info (programs, openings, current pay, providers)? Answer YES or NO.' },
      { role: 'user', content: query },
    ],
  });
  const txt = res.choices[0]?.message?.content?.trim().toUpperCase();
  return txt?.startsWith('Y') ?? false;
}


/** Google CSE → fetch readable text → synthesize concise answer + Sources list. */
async function internetRagCSE(query: string, location?: string): Promise<string | null> {
let q = location ? `${query} near ${location}` : query;
// avoid noisy domains
q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org';

// steer to reputable domains when applicable
if (/(salary|pay|wage|median|bls)/i.test(query)) {
  q += ' (site:bls.gov OR site:onetsoc.alaska.edu OR site:onetcenter.org)';
}
if (/(program|training|certificate|certification|community college)/i.test(query)) {
  q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org)';
}

  const res: any = await cseSearch(q);
  const items: any[] = Array.isArray(res?.items) ? res.items : [];
  if (!items.length) return null;

  // Pull readable text from top sources
  const pages = (await Promise.all(
    items.slice(0, 3).map(async (it: any) => {
      const url: string | undefined = it.url || it.link;
      if (!url) return null;
      try {
        const doc = await fetchReadable(url); // { title, url, text }
        if (doc && doc.text) return doc;
      } catch {}
      return null;
    })
  )).filter(Boolean) as Array<{ title: string; url: string; text: string }>;

  if (!pages.length) return null;

  const context = pages
    .map((p, i) => `[#${i + 1}] ${p.title}\n${p.text.slice(0, 3000)}\n${p.url}`)
    .join('\n\n---\n\n');

  const sys = `${COACH_SYSTEM}
You are doing Internet RAG. Use ONLY the provided context; do not invent URLs.
Cite sources in-line as [#1], [#2] where helpful.`;

  const prompt = `User question: ${query}
Location: ${location || 'N/A'}

RAG Context:
${context}

Write a concise markdown answer (bullets welcome). End with a short "Next steps" line.`;

  const out = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.25,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
  });

  const answer = out.choices[0]?.message?.content ?? '';

  // Add clickable sources
  const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const sourcesMd =
    '\n\n**Sources**\n' +
    pages
      .map((p, i) => `${i + 1}. [${trunc(p.title || p.url, 80)}](${p.url})`)
      .join('\n');

  return answer + sourcesMd;
}



async function generateFollowups(question: string, answer: string, location?: string): Promise<string[]> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.2,
      messages: [
        { role: 'system', content: 'Generate 4-6 SHORT follow-up prompts (<= 48 chars each) strictly about manufacturing careers, training, salaries, or apprenticeships. Return ONLY a JSON array of strings.' },
        { role: 'user', content: JSON.stringify({ question, answer, location }) },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? '[]';
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length) return sanitizeFollowups(arr);
  } catch {}
  return defaultFollowups();
}

function sanitizeFollowups(arr: any[]): string[] {
  return arr
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim().slice(0, 48))
    .slice(0, 6);
}

function defaultFollowups(): string[] {
  return [
    'Find paid apprenticeships near me',
    'Local training programs',
    'Typical salaries (BLS)',
    'Explore CNC Machinist',
    'Explore Robotics Technician',
    'Talk to Coach Mach',
  ];
}
