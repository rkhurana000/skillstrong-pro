// /lib/orchestrator.ts
import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search';
import { findFeaturedMatching, searchJobs, searchPrograms, Job, Program } from '@/lib/marketplace';

export type Role = 'system' | 'user' | 'assistant';
export interface Message { role: Role; content: string }
export interface OrchestratorInput { messages: Message[]; location?: string | null }
export interface OrchestratorOutput { answer: string; followups: string[] }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// UPDATED: Added rule about WHEN to include DB Matches heading.
const COACH_SYSTEM = `You are "Coach Mach," an expert AI career coach for SkillStrong.

**Your Mission:** Guide users to discover well-paid, hands-on vocational careers in US manufacturing.

**Your Persona:** Encouraging, clear, practical, action-oriented (use bullets, short paragraphs).

**Core Rules:**
1.  **Prioritize Internal Data:** If relevant job/program listings under \`### 🛡️ SkillStrong Database Matches\` are provided in the system context for *this specific turn*, you MUST:
    a.  Introduce these results using that *exact* markdown heading.
    b.  Preserve and use any markdown links provided within those listings. Do not rewrite them as plain text.
    c.  Only include this section if listings context *is actually provided*. Do not list general career titles under this heading if no listings were found.
2.  **Vocational Filter:** Answer ONLY about vocational roles (technicians, machinists, operators, skilled trades) not requiring a 4-year degree. Interpret general requests (e.g., "robotics jobs") as technician-level roles.
3.  **Single Next Steps:** Add ONE concise 'Next Steps' section at the very end of your *entire* response.
4.  **Stay on Topic:** Strictly US manufacturing careers. No healthcare, retail, etc.
5.  **No Hallucinations:** NEVER invent URLs, stats, or details. If unsure, say so.`;

// UPDATED: Stronger relevance filter instruction.
const COACH_SYSTEM_WEB_RAG = `You are "Coach Mach," synthesizing web search results about US manufacturing vocational careers.
**Core Rules:**
1.  **Use Context Only:** Base your answer *strictly* on the provided 'RAG Context'.
2.  **Cite Sources:** Cite sources in-line as [#1], [#2]. Use only the provided URLs.
3.  **Strict Relevance Filter:** Answer *only* the specific user question. Filter the context aggressively - provide ONLY information directly relevant to the user's specific query AND the manufacturing vocational domain (technicians, operators, etc.). Discard anything else (e.g., general non-manufacturing salaries, 4-year degree engineering roles, unrelated topics).
4.  **Stay on Topic:** US manufacturing vocational careers only.
5.  **No Hallucinations:** Do not invent information or URLs.
6.  **Concise:** Use bullets where appropriate. Do NOT add 'Next Steps'.`;


// --- Category Detection & Overview Prompt (Unchanged) ---
const CATEGORY_SYNONYMS: Record<string, string[]> = {/* ... */};
function escapeRegExp(s: string) {/* ... */ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}
function detectCanonicalCategory(query: string): string | null {/* ... */
    const text = (query || '').toLowerCase();
    for (const [canonical, syns] of Object.entries(CATEGORY_SYNONYMS)) {
        for (const s of syns) {
        const re = new RegExp(`\\b${escapeRegExp(s)}\\b`, 'i');
        if (re.test(text)) return canonical;
        }
    }
    return null;
}
function buildOverviewPrompt(canonical: string): string {/* ... */
    return `Give a student-friendly overview of the **${canonical}** career. Use these sections with emojis and bullet points only:\n\n🔎 **Overview**...\n🧭 **Day-to-Day**...\n🧰 **Tools & Tech**...\n🧠 **Core Skills**...\n💰 **Typical Pay (US)**...\n⏱️ **Training Time**...\n📜 **Helpful Certs**...\n\nKeep it concise and friendly. Do **not** include local programs, openings, or links in this message.`;
}

// --- URL Domain Helper (Unchanged) ---
function getDomain(url: string | null | undefined): string | null {/* ... */
    if (!url) return null;
    try {
        const host = new URL(url).hostname;
        return host.replace(/^www\./, '');
    } catch { return null; }
}

// --- UPDATED: Internal Database Query Function (Stricter Trigger) ---
async function queryInternalDatabase(query: string, location?: string): Promise<string> {
  const lowerQuery = query.toLowerCase();
  let internalContext = '';
  const locationQuery = location?.split(',')[0].trim(); // Use city or ZIP for relevance

  // --- STRICTER TRIGGER CONDITIONS ---
  const needsSpecifics = /jobs?|openings?|careers?|hiring|apprenticeships?|programs?|training|certificates?|courses?|schools?|college/.test(lowerQuery);
  const hasLocationSpecifier = /near me|local|in my area|nearby/.test(lowerQuery) || !!location || /\b\d{5}\b/.test(query) || /\b[A-Z]{2}\b/.test(query); // Check for ZIP or State Abbr

  // ONLY search internal DB if user asks for specifics (jobs/programs) AND provides/implies a location
  if (!needsSpecifics || !hasLocationSpecifier) {
      console.log("queryInternalDatabase: Skipping DB search (query lacks job/program specifics or location).");
      return ''; // Return empty if conditions not met
  }
  // --- END STRICTER TRIGGER ---

  console.log("queryInternalDatabase: Performing DB search.");
  let hasResults = false;
  const searchTerm = query.replace(/near me|local|in my area|nearby|\b\d{5}\b|\b[A-Z]{2}\b/gi, '').trim(); // Basic keyword extraction

  // Search Jobs
  const jobs = await searchJobs({
    q: searchTerm,
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
      return url ? `- [${title}](${url})${tag}` : `- ${title}${tag}`;
    }).join('\n');
  }

  // Search Programs
  const programs = await searchPrograms({
    q: searchTerm,
    location: locationQuery,
    limit: 3
  });
  if (programs.length > 0) {
    hasResults = true;
    internalContext += '\n\n**Program Listings:**\n';
    internalContext += programs.map(p => {
      const url = p.url || p.external_url;
      const domain = getDomain(url);
      const title = `**${p.title}** at ${p.school} (${p.location})`;
      if (domain) {
        const searchLink = `https://www.google.com/search?q=site%3A${domain}+${encodeURIComponent(p.title || 'manufacturing program')}`;
        return `- [${title}](${searchLink})`;
      }
      return `- ${title}`;
    }).join('\n');
  }

  if (hasResults) {
    return `### 🛡️ SkillStrong Database Matches\n${internalContext}`;
  } else {
      console.log("queryInternalDatabase: DB search performed, but no results found.");
      return ''; // Return empty if search ran but found nothing
  }
}


// --- Orchestrate Function (Modified Logic) ---
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

  // Domain guard (uses history)
  let inDomain = await domainGuard(messages);
  if (!inDomain) {
    console.log("Domain Guard determined OUT OF DOMAIN for query:", lastUserRaw);
    return { /* ... out of domain response ... */
        answer:'I focus on modern manufacturing careers. We can explore roles like CNC Machinist, Robotics Technician, Welding Programmer, Additive Manufacturing, Maintenance Tech, or Quality Control. What would you like to dive into?',
        followups: defaultFollowups(),
    };
  } else {
    console.log("Domain Guard determined IN DOMAIN for query:", lastUserRaw);
  }

  // Query internal DB only if appropriate (based on stricter trigger)
  const internalRAG = await queryInternalDatabase(lastUserRaw, input.location ?? undefined);
  const messagesForLocal = [...messages];
  if (internalRAG) {
    // Provide the pre-formatted context ONLY if internalRAG found something
    messagesForLocal.push({ role: 'system', content: `Internal data found. Prioritize this in your answer, using the provided markdown:\n${internalRAG}` });
  }

  // Generate the base answer using history + potentially internal RAG context
  const localAnswer = await answerLocal(messagesForLocal, input.location ?? undefined);
  let finalAnswer = localAnswer; // Start with the base answer

  // Decide if a Web Search is needed (stricter logic)
  const wasInternalSearchAttempted = internalRAG !== '' || (/jobs?|openings?|programs?|training|near me|local/i.test(lastUserRaw) && !!input.location);
  const needWeb = await needsInternetRag(lastUserRaw, localAnswer, internalRAG, wasInternalSearchAttempted);

  let webAnswer = null;
  if (needWeb && !overviewSeeded) {
    console.log("Orchestrate: Proceeding with Web Search.");
    webAnswer = await internetRagCSE(lastUserRaw, input.location ?? undefined, canonical);
  } else {
    console.log("Orchestrate: Skipping Web Search.");
  }

  // Construct final answer - Append Web Results ONLY if web search ran AND produced results
  if (webAnswer) {
      // Check if internal results were already included by the 'localAnswer' generation
      const alreadyHasInternalHeading = /### 🛡️ SkillStrong Database Matches/i.test(localAnswer);
      
      // If internal RAG was provided BUT the AI failed to include it in localAnswer, add it before web results.
      if (internalRAG && !alreadyHasInternalHeading) {
          finalAnswer = `${localAnswer}\n\n${internalRAG}\n\n**Web Search Results:**\n${webAnswer}`;
      } else {
          // Otherwise, just append web results.
          finalAnswer = `${localAnswer}\n\n**Web Search Results:**\n${webAnswer}`;
      }
  } else {
       // If web search didn't run or failed, ensure internal results (if any) are present if AI missed them
      const alreadyHasInternalHeading = /### 🛡️ SkillStrong Database Matches/i.test(localAnswer);
       if (internalRAG && !alreadyHasInternalHeading) {
           finalAnswer = `${localAnswer}\n\n${internalRAG}`;
       }
       // If neither internal nor web results, finalAnswer remains just localAnswer
  }


  // Featured Matching (Unchanged)
  try {
    const featured = await findFeaturedMatching(lastUserRaw, input.location ?? undefined);
    if (Array.isArray(featured) && featured.length > 0) { /* ... append featured ... */
        const locTxt = input.location ? ` near ${input.location}` : '';
        const lines = featured
            .map((f) => `- **${f.title}** — ${f.org} (${f.location})`)
            .join('\n');
        finalAnswer += `\n\n**Featured${locTxt}:**\n${lines}`;
    }
  } catch (err) {}

  // Generate Followups (Unchanged)
  const followups = await generateFollowups(lastUserRaw, finalAnswer, input.location ?? undefined);
  return { answer: finalAnswer, followups };
}

// --- Domain Guard (Uses History - Unchanged from previous version) ---
async function domainGuard(messages: Message[]): Promise<boolean> { /* ... */
    if (!messages.some(m => m.role === 'user')) return true;
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role !== 'user') return true;
    const lastUserQuery = lastUserMessage.content || '';
    if (!lastUserQuery.trim()) return true;

    const allowHints = /(manufact|cnc|robot|weld|machin|apprentice|factory|plant|quality|maintenance|mechatronic|additive|3d\s*print|bls|o\*net|program|community\s*college|trade\s*school|career|salary|pay|job|skill|training|near me|local|in my area|how much|what is|tell me about)/i;
    if (allowHints.test(lastUserQuery)) return true;

    const contextMessages = messages.slice(-4);
    const contextQuery = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    if (messages.filter(m => m.role === 'user').length === 1) {
        console.log(`Domain Guard: First user message failed regex, skipping AI check for query: "${lastUserQuery}"`);
        return false;
    }

    const systemPrompt = `Analyze the conversation context below. The user's goal is to learn about US MANUFACTURING careers/training/jobs (vocational roles like technicians, machinists, welders, etc., NOT 4-year degree engineering roles).\nIs the LAST user message in the conversation a relevant question or statement *within this specific manufacturing context*, considering the preceding messages?\nAnswer only IN or OUT.\n\nConversation Context:\n---\n${contextQuery}\n---\nIs the LAST user message relevant? Answer IN or OUT:`;

    try {
        const res = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0, messages: [{ role: 'system', content: systemPrompt }], max_tokens: 5 });
        const out = res.choices[0]?.message?.content?.trim().toUpperCase();
        console.log(`Domain Guard AI Check Result -> ${out} (Based on last query: "${lastUserQuery}")`);
        return out === 'IN';
    } catch (error) { console.error("Error during domainGuard AI check:", error); return true; }
}

// --- Base Answer Generation (Unchanged) ---
async function answerLocal(messages: Message[], location?: string): Promise<string> { /* ... */
    const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }];
    if (location) msgs.push({ role: 'system', content: `User location: ${location}` });
    msgs.push(...messages);
    const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.3, messages: msgs });
    return res.choices[0]?.message?.content ?? '';
}

// --- UPDATED: needsInternetRag (Stricter Trigger Logic) ---
async function needsInternetRag(query: string, draftAnswer: string, internalRAGResult: string, internalSearchAttempted: boolean): Promise<boolean> {
  const lowerQuery = (query || '').toLowerCase();

  // 1. Explicit request?
  if (/web|internet|external|more results|other sites|search again/i.test(lowerQuery)) {
    console.log("needsInternetRag: User explicitly asked for web search.");
    return true;
  }

  // 2. Query implies external data? (e.g., BLS, specific company, latest stats)
  const externalKeywords = /bls|bureau of labor|statistic|latest|trend|news|tuition|cost|salaryexpert|onetonline|onetcenter|osha|nims|specific company|market size/i;
  // Combine with check for salary/pay if not already covered by BLS etc.
  const needsExternalSalary = /salary|pay|wage|median/i.test(lowerQuery) && !/typical|range/i.test(lowerQuery); // Ask for typical might be internal, specific needs external

  if (externalKeywords.test(lowerQuery) || needsExternalSalary) {
      console.log("needsInternetRag: Query implies external data needed.");
      return true;
  }

  // 3. Internal search was appropriate but found nothing?
  if (internalSearchAttempted && internalRAGResult === '') {
      console.log("needsInternetRag: Internal search attempted but found nothing relevant.");
      return true;
  }

  // 4. AI indicates uncertainty in its draft answer?
  if (!draftAnswer || /i don'?t know|not sure|no specific data|couldn'?t find details|recommend searching/i.test(draftAnswer.toLowerCase())) {
    console.log("needsInternetRag: Draft answer indicates uncertainty.");
    return true;
  }

  // 5. Avoid web search for general exploration or skill definitions if internal search wasn't relevant
  const generalExploration = /(overview|what is|what does .* do|day[- ]?to[- ]?day|tools & tech|core skills|tell me about|how do i become|steps to become)/i;
  if (generalExploration.test(lowerQuery) && !internalSearchAttempted) {
      console.log("needsInternetRag: General exploration query, internal search not relevant, skipping web.");
      return false;
  }


  console.log("needsInternetRag: No specific trigger matched, defaulting to false.");
  return false; // Default to false if none of the above trigger
}


// --- Web RAG Function (Unchanged from previous version) ---
async function internetRagCSE(query: string, location?: string, canonical?: string | null): Promise<string | null> { /* ... */
    const baseQuery = (canonical && /salary|pay|wage|job|opening|program|training/i.test(query)) ? `${canonical} ${query}` : query;
    let q = location ? `${baseQuery} near ${location}` : baseQuery;
    q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org';

    if (/(salary|pay|wage|median|bls)/i.test(query)) { q += ' (site:bls.gov OR site:onetonline.org)'; }
    if (/(program|training|certificate|certification|community college)/i.test(query)) { q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org)'; }
    if (/jobs?|openings?|hiring/i.test(query)) { q += ' (site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs)'; }

    console.log("Executing Web Search (CSE) with query:", q);

    const res: any = await cseSearch(q);
    const items: any[] = Array.isArray(res?.items) ? res.items : [];
    if (!items.length) { console.log("Web Search (CSE): No results found."); return null; }

    const pages = ( await Promise.all( /* ... fetch readable ... */
         items.slice(0, 3).map(async (it: any) => {
            const url: string | undefined = it.url || it.link;
            if (!url) return null;
            try { const doc = await fetchReadable(url); if (doc && doc.text) return doc; } catch {}
            return null;
          })
    )).filter(Boolean) as Array<{ title: string; url: string; text: string }>;

    if (!pages.length) { console.log("Web Search (CSE): Found items but failed to fetch readable content."); return null; }

    const context = pages.map((p, i) => `[#${i + 1}] ${p.title}\nURL: ${p.url}\nContent:\n${p.text.slice(0, 3000)}\n---`).join('\n\n');
    const sys = `${COACH_SYSTEM_WEB_RAG}`;
    const prompt = `User question: ${query} ${location ? `(Location: ${location})` : ''}\n\nRAG Context From Web Search:\n---\n${context}\n---\n\nBased *only* on the RAG context provided above, write a concise markdown answer (use bullets if appropriate) to the user's question. Remember the vocational filter and discard irrelevant context (like healthcare salaries if asked about manufacturing). Do NOT add a 'Next Steps' section here. Cite sources as [#1], [#2], etc.`;

    try {
        const out = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.25, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }]});
        const answer = out.choices[0]?.message?.content ?? '';
        const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
        const sourcesMd = '\n\n**Sources**\n' + pages.map((p, i) => `${i + 1}. [${trunc(p.title || p.url, 80)}](${p.url})`).join('\n');
        return answer + sourcesMd;
    } catch (error) { console.error("Error during internetRagCSE OpenAI call:", error); return null; }
}

// --- Followup Generation (Unchanged from previous version) ---
async function generateFollowups(question: string, answer: string, location?: string): Promise<string[]> { /* ... */
    let finalFollowups: string[] = [];
    try {
        const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini', temperature: 0.4,
        messages: [
            { role: 'system', content: `You are an assistant that generates relevant follow-up questions... Focus on suggesting next logical steps or deeper dives related to the current discussion... Return ONLY a JSON array of strings.`},
            { role: 'user', content: JSON.stringify({ question, answer, location }) },
        ],});
        const raw = res.choices[0]?.message?.content ?? '[]';
        if (raw.startsWith('[') && raw.endsWith(']')) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) { finalFollowups = arr; }}
        else { console.warn("Follow-up generation did not return a valid JSON array:", raw); }
    } catch (error) { console.error("Error generating follow-ups:", error); }

    const userAskedForLocal = /jobs?|openings?|careers?|hiring|apprenticeships?|programs?|training|certificates?|courses?|schools?|college|near me|in my area/i.test(question.toLowerCase());
    const answerHasInternal = /### 🛡️ SkillStrong Database Matches/i.test(answer);
    const answerHasWeb = /Related Web Results|Web Search Results/i.test(answer);

    if (userAskedForLocal && answerHasInternal && !answerHasWeb) {
        const hasExternalSearch = finalFollowups.some(f => /web|internet|external|more|other sites/i.test(f.toLowerCase()));
        if (!hasExternalSearch) { finalFollowups.push('Search external sites for more?'); }
    }

    if (finalFollowups.length > 0) { return sanitizeFollowups(finalFollowups); }
    else { console.warn("Falling back to default follow-ups for question:", question); return defaultFollowups(); }
}

// --- Sanitization and Defaults (Unchanged) ---
function sanitizeFollowups(arr: any[]): string[] { /* ... */
    const MAX_LEN = 55;
    return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => { let t = s.trim(); if (t.endsWith('.') || (t.endsWith('?') && !t.toLowerCase().startsWith('what') && !t.toLowerCase().startsWith('how'))) { t = t.slice(0, -1); } return t.slice(0, MAX_LEN); })
        .filter((s, index, self) => self.indexOf(s) === index).slice(0, 6);
}
function defaultFollowups(): string[] { /* ... */
    return ['Find paid apprenticeships near me', 'Local training programs', 'Typical salaries (BLS)', 'Explore CNC Machinist', 'Explore Robotics Technician', 'Talk to Coach Mach'];
}
