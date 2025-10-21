// rkhurana000/skillstrong-pro/skillstrong-pro-main/skillstrong-pro/lib/orchestrator.ts
import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search';
// UPDATED: Import new functions and types
import { findFeaturedMatching, searchJobs, searchPrograms, Job, Program } from '@/lib/marketplace';


export type Role = 'system' | 'user' | 'assistant';
export interface Message { role: Role; content: string }
export interface OrchestratorInput { messages: Message[]; location?: string | null }
export interface OrchestratorOutput { answer: string; followups: string[] }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// UPDATED: Modified Core Rule 1
const COACH_SYSTEM = `You are "Coach Mach," an expert AI career coach for SkillStrong.

**Your Mission:** Guide users, especially high school students and career-switchers, to discover well-paid, hands-on vocational careers in the US manufacturing sector.

**Your Persona:**
- **Focused:** You ONLY discuss vocational roles that do not require a 4-year degree. These include technicians, machinists, operators, and skilled trades. If asked about engineering or research roles, politely redirect the user back to technician-level jobs.
- **Encouraging & Clear:** Use simple language. Be upbeat and practical.
- **Action-Oriented:** Prefer bullet points and short paragraphs. End every response with a "Next Steps" section.

**Core Rules:**
1.  **Prioritize Internal Data:** If you are provided with 'Internal...Listings' in a system message, you MUST prioritize these results. Introduce them with the markdown heading "### 🛡️ SkillStrong Database Matches" to make them stand out.
2.  **Vocational Filter:** ALL your answers—for jobs, training, and careers—MUST be filtered through a "vocational and skilled trades" lens. When a user asks for "robotics jobs," you must interpret this as "robotics TECHNICIAN jobs" and provide answers for that skill level.
3.  **Answer the Question First:** Directly answer the user's specific question *first*. Provide other relevant information (like training or outlook) only *after* the direct question has been answered. If a user asks for job openings, list the openings first.
4.  **Stay on Topic:** Your expertise is strictly limited to US manufacturing careers. Do not discuss careers in other fields like healthcare or retail.
5.  **No Hallucinations:** NEVER invent URLs, job stats, or program details. If you don't know something, say so and suggest a way to find the information.`;




// ------- Category auto-detect (for typed queries) -------
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'CNC Machinist': ['cnc machinist', 'cnc', 'machinist', 'cnc operator'],
  'Robotics Technician': ['robotics technician', 'robotics technologist', 'robotics tech', 'robotics'],
  'Welding Programmer': ['welding programmer', 'robotic welding', 'laser welding'],
  'Maintenance Tech': ['industrial maintenance', 'maintenance tech', 'maintenance technician'],
  'Quality Control Specialist': ['quality control', 'quality inspector', 'qc', 'metrology'],
  'Additive Manufacturing': ['logistics', 'supply chain', 'warehouse automation'],
};
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function detectCanonicalCategory(query: string): string | null {
  const text = (query || '').toLowerCase();
  for (const [canonical, syns] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const s of syns) {
      const re = new RegExp(`\\b${escapeRegExp(s)}\\b`, 'i');
      if (re.test(text)) return canonical;
    }
  }
  return null;
}
function buildOverviewPrompt(canonical: string): string {
  return `Give a student-friendly overview of the **${canonical}** career. Use these sections with emojis and bullet points only:

🔎 **Overview** — what the role is and where they work.
🧭 **Day-to-Day** — typical tasks.
🧰 **Tools & Tech** — machines, software, robotics, safety gear.
🧠 **Core Skills** — top 5 skills to succeed.
💰 **Typical Pay (US)** — national ranges; note that local pay can vary.
⏱️ **Training Time** — common pathways & length (certs, bootcamps, apprenticeships).
📜 **Helpful Certs** — 2–4 recognized credentials.
🚀 **Next Steps** — 2–3 actions the student can take.

Keep it concise and friendly. Do **not** include local programs, openings, or links in this message.`;
}

// --- UPDATED: Internal Database Query Function (Formats links) ---
async function queryInternalDatabase(query: string, location?: string): Promise<string> {
  const lowerQuery = query.toLowerCase();
  let internalContext = '';
  const locationQuery = location?.split(',')[0].trim(); // Use city or ZIP for relevance

  const needsJobs = /jobs?|openings?|careers?|hiring|apprenticeships?/.test(lowerQuery);
  const needsPrograms = /programs?|training|certificates?|courses?|schools?|college/.test(lowerQuery);
  let hasResults = false;

  if (needsJobs) {
    const jobs = await searchJobs({ 
      q: query, 
      location: locationQuery, 
      apprenticeship: /apprentice/.test(lowerQuery), 
      limit: 3 
    });
    if (jobs.length > 0) {
      hasResults = true;
      internalContext += '\n**Job Listings:**\n';
      internalContext += jobs.map(j => {
        const url = j.apply_url || j.external_url;
        const title = `**${j.title}** at ${j.company} (${j.location})`;
        const tag = j.apprenticeship ? ' *(Apprenticeship)*' : '';
        // Create markdown link if URL exists
        return url ? `- [${title}](${url})${tag}` : `- ${title}${tag}`;
      }).join('\n');
    }
  }

  if (needsPrograms) {
    const programs = await searchPrograms({ 
      q: query, 
      location: locationQuery, 
      limit: 3 
    });
    if (programs.length > 0) {
      hasResults = true;
      internalContext += '\n\n**Program Listings:**\n';
      internalContext += programs.map(p => {
        const url = p.url || p.external_url;
        const title = `**${p.title}** at ${p.school} (${p.location})`;
        // Create markdown link if URL exists
        return url ? `- [${title}](${url})` : `- ${title}`;
      }).join('\n');
    }
  }
  
  if (hasResults) {
    // This is the highlighted heading the AI will be instructed to use
    return `### 🛡️ SkillStrong Database Matches\n${internalContext}`;
  }
  return '';
}


// -------------------------------------------------------

export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const lastUserRaw = [...input.messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const isFirstUserMessage = input.messages.filter(m => m.role === 'user').length === 1;
  const canonical = detectCanonicalCategory(lastUserRaw);

  let messages: Message[] = input.messages;
  let overviewSeeded = false;
  if (canonical && isFirstUserMessage) {
    const seed = buildOverviewPrompt(canonical);
    messages = [...input.messages];
    messages[messages.length - 1] = { role: 'user', content: seed };
    overviewSeeded = true;
  }

  // Domain guard
  let inDomain = await domainGuard(lastUserRaw);
  if (!inDomain && canonical) inDomain = true;
  if (!inDomain) {
    return {
      answer:
        'I focus on modern manufacturing careers. We can explore roles like CNC Machinist, Robotics Technician, Welding Programmer, Additive Manufacturing, Maintenance Tech, or Quality Control. What would you like to dive into?',
      followups: defaultFollowups(),
    };
  }

  // --- MODIFICATION: Query internal DB first ---
  const internalRAG = await queryInternalDatabase(lastUserRaw, input.location ?? undefined);
  const messagesForLocal = [...messages];
  if (internalRAG) {
    // Provide the pre-formatted markdown context to the AI
    messagesForLocal.push({ role: 'system', content: `Here is internal data from our database. Prioritize this in your answer, using the provided markdown heading and links:\n${internalRAG}` });
  }
  // --- END MODIFICATION ---

  // Local answer first (now with internal RAG context)
  const local = await answerLocal(messagesForLocal, input.location ?? undefined);
  let finalAnswer = local;

  // Decide on Internet RAG
  // MODIFIED: Pass internalRAG result to needsInternetRag
  const needWeb = !overviewSeeded && (await needsInternetRag(lastUserRaw, local, internalRAG));
  if (needWeb) {
    const web = await internetRagCSE(lastUserRaw, input.location ?? undefined);
    if (web) {
        // If we have both, combine them.
        finalAnswer = `${local}\n\n**Related Web Results:**\n${web}`;
    }
  }
  try {
    const featured = await findFeaturedMatching(lastUserRaw, input.location ?? undefined);
    if (Array.isArray(featured) && featured.length > 0) {
      const locTxt = input.location ? ` near ${input.location}` : '';
      const lines = featured
        .map((f) => `- **${f.title}** — ${f.org} (${f.location})`)
        .join('\n');
      finalAnswer += `\n\n**Featured${locTxt}:**\n${lines}`;
    }
  } catch (err) {
    // no-op
  }

  const followups = await generateFollowups(lastUserRaw, finalAnswer, input.location ?? undefined);
  return { answer: finalAnswer, followups };
}

async function domainGuard(query: string): Promise<boolean> {
  if (!query.trim()) return true;
  const allowHints =
    /(manufact|cnc|robot|weld|machin|apprentice|factory|plant|quality|maintenance|mechatronic|additive|3d\s*print|bls|o\*net|program|community\s*college|trade\s*school|career)/i;
  if (allowHints.test(query)) return true;
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

async function answerLocal(messages: Message[], location?: string): Promise<string> {
  const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }];
  if (location) msgs.push({ role: 'system', content: `User location: ${location}` });
  msgs.push(...messages);
  const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.3, messages: msgs });
  return res.choices[0]?.message?.content ?? '';
}

// MODIFIED: Accept internalRAG string to inform decision
async function needsInternetRag(query: string, draft: string, internalRAG: string): Promise<boolean> {
  const text = (query || '').toLowerCase();

  const overviewish = /(overview|what is|what does .* do|day[- ]?to[- ]?day|tools & tech|core skills)/i;
  const webish = /(salary|pay|wage|median|bls|jobs?|openings|apprentice|programs?|tuition|cost|near|in\s+[a-z]+)/i;
  if (overviewish.test(text) && !webish.test(text)) return false;

  // If internal RAG already found results, we don't need web RAG *unless* user asks for more
  // This logic is now handled by the follow-up prompt
  if (internalRAG.length > 0) {
      return false; // Don't run web RAG if we already found internal results
  }

  const heuristics =
    /(latest|news|202[3-9]|today|near me|nearby|tuition|cost|programs|providers|community\s*college|openings|jobs|apprenticeships|statistics|market\s*size|salary|median|bls|o-net|osha|nims)/i;
  if (heuristics.test(text)) return true;

  if (!draft || /i\s+don\'t\s+know|not\s+sure|no\s+data/.test((draft || '').toLowerCase())) return true;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: 'Does this question require up-to-date web info (programs, openings, current pay, providers)? Answer YES or NO.' },
      { role: 'user', content: query },
    ],
  });
  const txt = res.choices[0]?.message?.content?.trim().toUpperCase();
  return txt?.startsWith('Y') ?? false;
}

/** Google CSE → fetch readable text → synthesize concise answer + Sources list (only when RAG runs). */
async function internetRagCSE(query: string, location?: string): Promise<string | null> {
  // steer query away from junk and toward reputable domains
  let q = location ? `${query} near ${location}` : query;
  q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org';
  if (/(salary|pay|wage|median|bls)/i.test(query)) {
    q += ' (site:bls.gov OR site:onetsoc.alaska.edu OR site:onetcenter.org)';
  }
  if (/(program|training|certificate|certification|community college)/i.test(query)) {
    q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org)';
  }

  const res: any = await cseSearch(q);
  const items: any[] = Array.isArray(res?.items) ? res.items : [];
  if (!items.length) return null;

  const pages = (
    await Promise.all(
      items.slice(0, 3).map(async (it: any) => {
        const url: string | undefined = it.url || it.link;
        if (!url) return null;
        try {
          const doc = await fetchReadable(url); // { title, url, text }
          if (doc && doc.text) return doc;
        } catch {}
        return null;
      })
    )
  ).filter(Boolean) as Array<{ title: string; url: string; text: string }>;

  if (!pages.length) return null;

  const context = pages.map((p, i) => `[#${i + 1}] ${p.title}\n${p.text.slice(0, 3000)}\n${p.url}`).join('\n\n---\n\n');

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

  const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const sourcesMd =
    '\n\n**Sources**\n' + pages.map((p, i) => `${i + 1}. [${trunc(p.title || p.url, 80)}](${p.url})`).join('\n');

  return answer + sourcesMd;
}
