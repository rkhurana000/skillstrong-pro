// /lib/orchestrator.ts
// Orchestrates Coach Mach responses: domain guard → local LLM → optional Internet RAG → followups
// NOTE: Wire your search provider in `searchWeb()` (SerpAPI, Bing, Tavily, etc.).

import OpenAI from 'openai';

export type Role = 'system' | 'user' | 'assistant';
export type FollowupAction =
  | 'ask'            // send prompt back into chat
  | 'openRoute'      // navigate to href
  | 'openQuiz'       // /quiz
  | 'jobsSearch'     // structured jobs/apprenticeship search prompt
  | 'programsSearch' // structured training/program lookup
  | 'salaryLookup'   // structured salary lookup
  | 'setLocation';

export interface Message { role: Role; content: string }
export interface FollowupChip {
  label: string;
  action: FollowupAction;
  href?: string;           // for openRoute
  prompt?: string;         // for ask
  params?: Record<string, any>;
}

export interface OrchestratorInput {
  messages: Message[];
  location?: string | null;
}
export interface OrchestratorOutput {
  answer: string;
  followups: FollowupChip[];
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const COACH_SYSTEM = `You are Coach Mach, an upbeat, practical AI career coach focused on modern manufacturing careers (CNC Machinist, Robotics Technician, Additive Manufacturing, Welding Programmer, Industrial Maintenance, Quality/QC, Logistics).
- Stay strictly on manufacturing topics.
- Be concise, specific, and actionable. Prefer bullet lists over long paragraphs.
- When asked for programs or jobs, use the user's location if provided.
- If you don't know, say so briefly and propose how to find out.
- NEVER invent URLs or citations.`;

export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const lastUser = [...input.messages].reverse().find(m => m.role === 'user')?.content ?? '';

  // 1) Domain guard – keep it manufacturing-only
  const inDomain = await domainGuard(lastUser);
  if (!inDomain) {
    const answer = `I focus on modern manufacturing careers. If you want, we can talk about roles like CNC Machinist, Robotics Technician, Welding Programmer, or Additive Manufacturing.`;
    const followups: FollowupChip[] = defaultManufacturingChips();
    return { answer, followups };
  }

  // 2) Local answer (primary)
  const local = await answerLocal(input.messages, input.location ?? undefined);

  // 3) Decide if we need Internet RAG (fresh facts, “latest”, local providers, etc.)
  const needWeb = await needsInternetRag(lastUser, local.answer);
  let finalAnswer = local.answer;
  if (needWeb) {
    const web = await internetRag(lastUser, input.location ?? undefined);
    if (web) finalAnswer = web; // keep local if web returned null
  }

  // 4) Follow-ups, grounded in the answer & user location
  const followups = await generateFollowups(lastUser, finalAnswer, input.location ?? undefined);

  return { answer: finalAnswer, followups };
}

async function domainGuard(query: string): Promise<boolean> {
  if (!query.trim()) return true;
  // quick heuristic first
  const allowHints = /(manufact|cnc|robot|weld|machin|apprentice|factory|plant|quality|maintenance|mechatronic|additive|3d print)/i;
  if (allowHints.test(query)) return true;

  // cheap LLM classification backstop
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: 'Classify if the question is about MANUFACTURING careers/training/jobs. Answer only IN or OUT.' },
      { role: 'user', content: query },
    ],
  });
  const out = res.choices[0]?.message?.content?.trim().toUpperCase();
  return out?.startsWith('IN') ?? false;
}

async function answerLocal(messages: Message[], location?: string) {
  const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }];
  if (location) msgs.push({ role: 'system', content: `User location: ${location}` });
  msgs.push(...messages);
  const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.3, messages: msgs });
  return { answer: res.choices[0]?.message?.content ?? '' };
}

async function needsInternetRag(query: string, draftAnswer: string): Promise<boolean> {
  const heuristics = /(latest|news|today|this year|202[3-9]|near me|nearby|in\\s+[A-Za-z]+|tuition|cost|programs|providers|openings|jobs|apprenticeships|statistics|market size|salary|median|BLS)/i;
  if (heuristics.test(query)) return true;
  if (!draftAnswer || /i\\s+don\\'t\\s+know|not\\s+sure|no\\s+data/i.test(draftAnswer)) return true;
  // cheap vote
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini', temperature: 0,
    messages: [
      { role: 'system', content: 'Does this user question require up-to-date or external web info (programs, openings, current pay)? Answer YES or NO.' },
      { role: 'user', content: query },
    ],
  });
  const txt = res.choices[0]?.message?.content?.trim().toUpperCase();
  return txt?.startsWith('Y') ?? false;
}

async function internetRag(query: string, location?: string): Promise<string | null> {
  // TODO: Replace with your provider. Return concise answer (no invented links).
  const q = location ? `${query} near ${location}` : query;
  const results = await searchWeb(q); // -> [{title, url, snippet, content}]
  if (!results.length) return null;

  const context = results
    .slice(0, 5)
    .map((r, i) => `#${i + 1} ${r.title}\\n${r.snippet || ''}\\n${r.url}`)
    .join('\\n\\n');

  const res = await openai.chat.completions.create({
    model: 'gpt-4o', temperature: 0.2,
    messages: [
      { role: 'system', content: `${COACH_SYSTEM}\\nYou are doing Internet RAG. Use only the provided results; do not invent URLs. If location is relevant, use it.` },
      { role: 'user', content: `User question: ${q}\\n\\nTop results:\\n${context}\\n\\nGive a concise answer (bullets), then a short next-steps line.` },
    ],
  });
  return res.choices[0]?.message?.content ?? null;
}

async function generateFollowups(question: string, answer: string, location?: string) {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.2,
      messages: [
        { role: 'system', content: 'Create 4-6 manufacturing-only follow-up chips in JSON. Keep them actionable and short (<= 48 chars). Use actions: ask, openRoute, openQuiz, jobsSearch, programsSearch, salaryLookup, setLocation.' },
        { role: 'user', content: JSON.stringify({ question, answer, location }) },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? '[]';
    const parsed = JSON.parse(raw) as FollowupChip[] | { followups: FollowupChip[] };
    const list = Array.isArray(parsed) ? parsed : parsed.followups;
    if (Array.isArray(list) && list.length) return sanitizeChips(list);
  } catch {}
  return defaultManufacturingChips();
}

function sanitizeChips(chips: FollowupChip[]): FollowupChip[] {
  const allowed: FollowupAction[] = ['ask','openRoute','openQuiz','jobsSearch','programsSearch','salaryLookup','setLocation'];
  return chips
    .filter(c => c && typeof c.label === 'string' && allowed.includes(c.action))
    .map(c => ({ ...c, label: c.label.slice(0, 48) }))
    .slice(0, 6);
}

function defaultManufacturingChips(): FollowupChip[] {
  return [
    { label: 'CNC Machinist path', action: 'openRoute', href: '/careers/cnc-machinist' },
    { label: 'Robotics Tech roles', action: 'openRoute', href: '/careers/robotics-technician' },
    { label: 'Find paid apprenticeships', action: 'jobsSearch', params: { type: 'apprenticeship' } },
    { label: 'Local training programs', action: 'programsSearch' },
    { label: 'Typical salaries (BLS)', action: 'salaryLookup' },
    { label: 'Set my location', action: 'setLocation' },
  ];
}

// ----- Web search placeholder -----
async function searchWeb(q: string) {
  // Integrate with Bing/Serp/Tavily here and return normalized results.
  return [];
}
