// /lib/orchestrator.ts
import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search';
import { findFeaturedMatching } from '@/lib/marketplace';
import type { Message, Role } from 'ai/react'; // <--- Vercel AI SDK v2 import

export type { Message, Role };

export interface OrchestratorInput {
  messages: Message[];
  location?: string | null;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- COACH_SYSTEM Prompt ---
export const COACH_SYSTEM = `You are "Coach Mach," a friendly, practical AI guide helping U.S. students discover hands-on, well-paid manufacturing careers that DO NOT require a 4-year degree.

**Your Mission:** Provide encouraging, clear, and actionable advice on vocational paths in modern manufacturing (e.g., CNC, robotics, welding, maintenance, quality, additive).

**Output Format:** Respond with Markdown, using short paragraphs and bullet points.

**Non-Negotiable Rules:**
1.  **Prioritize RAG Context & Synthesize Overviews:** Your system context may contain "Web Results" (with citations [#1], [#2]...) and potentially a "**Sources**" list, plus "SkillStrong Search" links. **You MUST prioritize using the "Web Results" context to construct the main body of your answer.**
    * **If "Web Results" are provided:** Synthesize your answer *directly* from this text. Include inline citations (e.g., [#1]). **IMPORTANT: If the user asked a general "Tell me about [Role]" or similar overview question, synthesize a GENERAL OVERVIEW. Use facts from the "Web Results" (like typical skills, pay ranges, training) but structure your answer as a comprehensive overview, NOT a summary of a single job posting or specific program unless that was explicitly requested.**
    * **If "Web Results" are NOT provided OR if context says "INFO: Could not find specific results...":** Answer based on your general knowledge. Only mention the failed search if the user explicitly asked for local/current specifics. Otherwise, provide the general answer seamlessly.
2.  **Preserve Sources Section:** If context includes "**Sources**", include that *entire section* verbatim at the end of your main answer (before "Next Steps").
3.  **Append SkillStrong Links:** *After* your main answer (and "**Sources**"), append the *entire* "### 🛡️ SkillStrong Search" block **only if provided** in the context.
4.  **Handle No Results Info:** If context says "INFO: Could not find specific results for the user's local/current query...", *then* clearly inform the user you couldn't find specifics for their request and suggest alternatives.
5.  **Audience Fit (≤2 Years Training):** ONLY recommend roles/programs needing ≤2 years training. Suggest tech paths instead of 4-year engineering.
6.  **Truthfulness:** Rely *only* on "Web Results" for current facts. Cite sources. If unsure/lacking RAG, state that (unless it's a general overview).
7.  **Geography:** Prioritize nearby options if location known & RAG provides local info. If local search needed but location missing, ONLY respond: "To find local results, please set your location using the button in the header." (empty followups).
8.  **Accessibility & Tone:** Avoid jargon (explain if needed). Be supportive.
9.  **Single Next Steps:** Add ONE concise 'Next Steps' section at the very end of your *entire* response. (The orchestrator may provide a standard block for this).
10. **No Chain-of-Thought:** Do not reveal internal reasoning.`;

// --- COACH_SYSTEM_WEB_RAG ---
const COACH_SYSTEM_WEB_RAG = `You are "Coach Mach," synthesizing web search results about US manufacturing vocational careers.
**Core Rules:**
1.  **Use Context Only:** Base your answer *strictly* on the provided 'RAG Context'.
2.  **Cite Sources:** Cite sources in-line as [#1], [#2]. Use only the provided URLs.
3.  **Strict Relevance Filter:** Answer *only* the specific user question, filtering context for relevant manufacturing vocational roles (technicians, operators, etc.).
4.  **Stay on Topic:** US manufacturing vocational careers only.
5.  **No Hallucinations:** Do not invent information or URLs.
6.  **Concise:** Use bullets. Do NOT add 'Next Steps'.`;

// --- Category Detection & Overview Prompt ---
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'CNC Machinist': ['cnc machinist', 'cnc', 'machinist', 'cnc operator'],
  'Robotics Technician': [
    'robotics technician',
    'robotics technologist',
    'robotics tech',
    'robotics',
  ],
  'Welding Programmer': [
    'welding programmer',
    'robotic welding',
    'laser welding',
  ],
  'Maintenance Tech': [
    'industrial maintenance',
    'maintenance tech',
    'maintenance technician',
  ],
  'Quality Control Specialist': [
    'quality control',
    'quality inspector',
    'qc',
    'metrology',
  ],
  'Additive Manufacturing': ['additive manufacturing', '3d printing'],
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
  return `Give a student-friendly overview of the **${canonical}** career. Use these sections with emojis and bullet points only:\n\n🔎 **Overview**...\n🧭 **Day-to-Day**...\n🧰 **Tools & Tech**...\n🧠 **Core Skills**...\n💰 **Typical Pay (US)**...\n⏱️ **Training Time**...\n📜 **Helpful Certs**...\n\nKeep it concise and friendly. Do **not** include local programs, openings, or links in this message.`;
}

// --- URL Domain Helper ---
function getDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// --- Internal Database Link Generation ---
async function queryInternalDatabase(
  query: string,
  location?: string
): Promise<string> {
  const lowerQuery = query.toLowerCase();
  const needsJobs = /\b(jobs?|openings?|hiring|apprenticeships?)\b/i.test(
    lowerQuery
  );
  const needsPrograms = /\b(programs?|training|certificates?|courses?|schools?|college)\b/i.test(
    lowerQuery
  );
  const hasLocationSpecifier =
    /near me|local|in my area|nearby/i.test(lowerQuery) ||
    !!location ||
    /\b\d{5}\b/.test(query) ||
    /\b[A-Z]{2}\b/.test(query);

  if (!((needsJobs || needsPrograms) && hasLocationSpecifier)) {
    return '';
  }

  let links: string[] = [];
  if (needsJobs)
    links.push(`* [Search all **jobs** on SkillStrong](/jobs/all)`);
  if (needsPrograms)
    links.push(`* [Search all **programs** on SkillStrong](/programs/all)`);

  if (links.length > 0) {
    return `### 🛡️ SkillStrong Search
You can also search our internal database directly:
${links.join('\n')}`;
  }
  return '';
}

// --- Domain Guard ---
async function domainGuard(messages: Message[]): Promise<boolean> {
  if (!messages.some((m) => m.role === 'user')) return true;
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage?.role !== 'user') return true;
  const lastUserQuery = lastUserMessage.content || '';
  if (!lastUserQuery.trim()) return true;

  const allowHints = /\b(manufactur(e|ing)?|cnc|robot(ic|ics)?|weld(er|ing)?|machin(e|ist|ing)?|apprentice(ship)?s?|factory|plant|quality|qc|maintenance|mechatronic|additive|3d\s*print|bls|o\*?net|program|community\s*college|trade\s*school|career|salary|pay|job|skill|training|near me|local|in my area|how much|what is|tell me about|nims|certificat(e|ion)s?|aws|osha|pmmi|cmrt|cmrp|cqi|cqt|cltd|cscp|camf|astm|asq|gd&t|plc|cad|cam|diablo valley|chabot|college|visit|contact|laney)\b/i;
  
  if (allowHints.test(lastUserQuery)) {
    return true;
  }
  
  const contextMessages = messages.slice(-4);
  const contextQuery = contextMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n\n');
  if (messages.filter((m) => m.role === 'user').length === 1) {
    return false;
  }
  
  const systemPrompt = `Analyze the conversation context below. The user's goal is to learn about US MANUFACTURING careers/training/jobs (vocational roles like technicians, machinists, welders, etc., NOT 4-year degree engineering roles).\nIs the LAST user message in the conversation a relevant question or statement *within this specific manufacturing context*, considering the preceding messages?\nAnswer only IN or OUT.\n\nConversation Context:\n---\n${contextQuery}\n---\nIs the LAST user message relevant? Answer IN or OUT:`;
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [{ role: 'system', content: systemPrompt }],
      max_tokens: 5,
    });
    const out = res.choices[0]?.message?.content?.trim().toUpperCase();
    return out === 'IN';
  } catch (error) {
    return true;
  }
}

// --- needsInternetRag ---
async function needsInternetRag(messageContent: string): Promise<boolean> {
  const contentLower = messageContent.toLowerCase().trim();
  let skipReason = '';
  const isOverviewPrompt = /Give a student-friendly overview.*Use these sections.*🔎\s*Overview/i.test(
    contentLower
  );
  if (isOverviewPrompt) {
    skipReason = 'Message is overview prompt structure';
  }
  if (!skipReason) {
    const isDefinitionalQuery = /^(what is|what's|define|explain)\b/i.test(
      contentLower
    );
    if (isDefinitionalQuery) {
      skipReason = 'Detected definitional query';
    }
  }
  if (skipReason) {
    return false;
  } else {
    return true;
  }
}

// --- internetRagCSE ---
async function internetRagCSE(
  query: string,
  location?: string,
  canonical?: string | null
): Promise<string | null> {
  let res: any;
  try {
    const lowerQuery = query.toLowerCase();
    const isGeneralInfoQuery = /^(tell me about|what is|what's|define|explain)\b/i.test(
      lowerQuery
    );
    let platformSite = "";
    if (/\bcoursera\b/i.test(lowerQuery)) platformSite = "site:coursera.org";
    else if (/\budemy\b/i.test(lowerQuery)) platformSite = "site:udemy.com";
    else if (/\bedx\b/i.test(lowerQuery)) platformSite = "site:edx.org";
    let q = '';
    const locationSearchTerm = location ? `"${location}"` : ""; 
    if (isGeneralInfoQuery && canonical) {
      q = `"${canonical}" career overview (site:bls.gov OR site:onetonline.org OR site:careeronestop.org)`;
      if (locationSearchTerm) q += ` ${locationSearchTerm}`;
    } else if (isGeneralInfoQuery) {
      q = `${query} (site:bls.gov OR site:onetonline.org OR site:careeronestop.org)`;
    } else {
      let baseQuery = query
          .replace(/near me|local|in my area|nearby/gi, '')
          .replace(/in\s+([\w\s,]+(?:,\s*[A-Z]{2})?)|\b(\d{5})\b|([\w\s]+,\s*[A-Z]{2})\b/i, '')
          .trim();
      if (canonical && /salary|pay|wage|job|opening|program|training|certificate|skill|course/i.test(query)) {
          baseQuery = `"${canonical}" ${baseQuery.replace(new RegExp(canonical, 'i'), '')}`;
      } else {
          baseQuery = `"${baseQuery}"`;
      }
      q = baseQuery;
      if (locationSearchTerm) {
          q += ` ${locationSearchTerm}`;
      }
      if (platformSite) {
          q += ` (${platformSite})`;
      } else {
          if (/(salary|pay|wage|median|bls)/i.test(query)) q += ' (site:bls.gov OR site:onetonline.org)';
          if (/(program|training|certificate|certification|community college|course)/i.test(query)) q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org OR site:careeronestop.org)';
          if (/jobs?|openings?|hiring|apprenticeship/i.test(query)) q += ' (site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs OR site:apprenticeship.gov)';
      }
    }
    q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org -site:quora.com -site:pinterest.com';
    try {
      res = await cseSearch(q);
    } catch (cseError: any) { return null; }
    const items: any[] = Array.isArray(res?.items) ? res.items : [];
    if (!items.length) { return null; }
    const pages = (
      await Promise.all(
        items.slice(0, 3).map(async (it: any, index: number) => {
          const url: string | undefined = it.url || it.link;
          if (!url || !url.startsWith('http')) return null;
          try {
            const doc = await fetchReadable(url);
            if (doc && doc.text) return doc;
            else return null;
          } catch (fetchErr) { return null; }
        })
      )
    ).filter(Boolean) as Array<{ title: string; url: string; text: string }>;
    if (!pages.length) { return null; }
    const context = pages
      .map(
        (p, i) =>
          `[#${i + 1}] Title: ${
            p.title
          }\nURL: ${p.url}\nContent:\n${p.text.slice(0, 3000)}\n---`
      )
      .join('\n\n');
    const sys = `${COACH_SYSTEM_WEB_RAG}`;
    const prompt = `User question: ${query} ${
      location ? `(Location: ${location})` : ''
    }\n\nRAG Context:\n---\n${context}\n---\n\nAnswer user question based *only* on context. Cite sources like [#1], [#2].`;
    try {
      const out = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.25,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt },
        ],
      });
      let answer = out.choices[0]?.message?.content ?? '';
      if (!answer.trim()) { return null; }
      answer = answer.replace(/\[#(\d+)\](?!\()/g, (match, num) => {
        const p = pages[parseInt(num) - 1];
        return p ? `[#${num}](${p.url})` : match;
      });
      const trunc = (s: string, n: number) =>
        s.length > n ? s.slice(0, n - 1) + '…' : s;
      const sourcesMd =
        '\n\n**Sources**\n' +
        pages
          .map((p, i) => `${i + 1}. [${trunc(p.title || p.url, 80)}](${p.url})`)
          .join('\n');
      return answer + sourcesMd;
    } catch (error) { return null; }
  } catch (outerError: any) { return null; }
}

// --- Sanitization and Defaults ---
function sanitizeFollowups(arr: any[]): string[] {
  const MAX_LEN = 65;
  const MAX_PROMPTS = 4;
  return arr
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => {
      let t = s.trim();
      if (t.endsWith('.') || t.endsWith('?')) {
        t = t.slice(0, -1);
      }
      return t.slice(0, MAX_LEN);
    })
    .filter(
      (s, index, self) =>
        self.map((v) => v.toLowerCase()).indexOf(s.toLowerCase()) === index
    )
    .slice(0, MAX_PROMPTS);
}

function defaultFollowups(): string[] {
  return [
    'Find local apprenticeships',
    'Explore training programs',
    'Compare typical salaries (BLS)',
  ].slice(0, 3);
}

// --- Followup Generation ---
export async function generateFollowups(
  question: string,
  answer: string,
  location?: string
): Promise<string[]> {
  let finalFollowups: string[] = [];
  let rawResponse = '{"followups": []}';
  try {
    const systemPrompt = `You are an assistant generating follow-up suggestions for a career coach chatbot.
Based on the User Question and AI Answer, generate a JSON object with a key "followups" containing an array of 4 concise (under 65 chars), relevant, and action-oriented follow-up prompts.

**RULES:**
1.  Prompts MUST be directly related to the specific topics in the question or answer.
2.  Prompts SHOULD encourage exploration (e.g., "Find local programs," "Compare salaries").
3.  **Prompts MUST NOT include specific locations** (e.g., "Find jobs in San Ramon"). Use generic terms like "nearby" or "in my area" if location is relevant.
4.  AVOID generic prompts ("Anything else?", "More info?").
5.  Return ONLY the JSON object. Example: {"followups": ["Local CNC Training", "CNC Salary Ranges", "Welding Apprenticeships"]}`;

    const userMessage = `User Question: "${question}"
AI Answer: "${answer}"
${location ? `User Location: "${location}"` : ''}

Generate JSON object with 4 relevant followups:`;
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });
    rawResponse = res.choices[0]?.message?.content ?? '{"followups": []}';
    try {
      const parsed = JSON.parse(rawResponse);
      if (parsed && parsed.followups && Array.isArray(parsed.followups)) {
        const stringFollowups = parsed.followups.filter(
          (item: any): item is string =>
            typeof item === 'string' && item.trim().length > 0
        );
        if (stringFollowups.length > 0) {
          finalFollowups = stringFollowups;
        }
      }
    } catch (parseError) { /* ignore */ }
  } catch (error: any) { /* ignore */ }
  const sanitizedFollowups = sanitizeFollowups(finalFollowups);
  if (sanitizedFollowups.length > 0) {
    return sanitizedFollowups;
  } else {
    return defaultFollowups();
  }
}

// --- Preamble Function ---
export async function orchestratePreamble(input: OrchestratorInput): Promise<{
  messagesForLLM: Message[];
  lastUserRaw: string;
  effectiveLocation: string | null;
  internalRAG: string;
  domainGuarded: boolean;
}> {
  const originalMessages = input.messages;
  const lastUserRaw =
    [...originalMessages].reverse().find((m) => m.role === 'user')?.content ?? '';
  let effectiveLocation = input.location;
  if (!effectiveLocation) {
    const locationMatch = lastUserRaw.match(
      /\b(in|near|around)\s+([\w\s,]+(?:,\s*[A-Z]{2})?)|\b(\d{5})\b|([\w\s]+,\s*[A-Z]{2})\b/i
    );
    if (locationMatch) {
      effectiveLocation = (locationMatch[4] || locationMatch[2] || locationMatch[3] || "").trim().replace(/,$/, '');
    }
  }
  const inDomain = await domainGuard(originalMessages);
  if (!inDomain) {
    return { 
      messagesForLLM: [], 
      lastUserRaw, 
      effectiveLocation, 
      internalRAG: "",
      domainGuarded: true 
    };
  }
  const isLocalQuery =
    /near me|local|in my area|nearby|\b\d{5}\b|[A-Z]{2}\b/i.test(lastUserRaw.toLowerCase()) ||
    /\b(jobs?|openings?|hiring|apprenticeships?|programs?|training|tuition|start date|admission|employer|provider|scholarship)\b/i.test(
      lastUserRaw.toLowerCase()
    );
  if (isLocalQuery && !effectiveLocation) {
    throw new Error("LOCATION_REQUIRED");
  }
  const isFirstUserMessage =
    originalMessages.filter((m) => m.role === 'user').length === 1;
  const canonical = detectCanonicalCategory(lastUserRaw);
  let messagesForLLM: Message[] = [...originalMessages];
  let messageContentForRAGDecision = lastUserRaw;
  let overviewActuallyUsed = false;
  if (canonical && isFirstUserMessage) {
    const seedPrompt = buildOverviewPrompt(canonical);
    messagesForLLM[messagesForLLM.length - 1] = {
      role: 'user',
      content: seedPrompt,
    };
    messageContentForRAGDecision = seedPrompt;
    overviewActuallyUsed = true;
  }
  const internalRAG = await queryInternalDatabase(
    lastUserRaw,
    effectiveLocation ?? undefined
  );
  const needWeb = await needsInternetRag(messageContentForRAGDecision);
  let webAnswer = null;
  if (needWeb) {
    try {
      webAnswer = await internetRagCSE(
        lastUserRaw,
        effectiveLocation ?? undefined,
        canonical
      );
    } catch (webRagError: any) {
      console.error('[Orchestrate] Error during Web RAG call:', webRagError);
      webAnswer = null;
    }
  }
  let combinedContext = '';
  if (webAnswer) {
    const webHeading = internalRAG ? '**Related Web Results:**' : '**Web Search Results:**';
    combinedContext += `${webHeading}\n${webAnswer}\n\n`;
  }
  if (internalRAG) {
    combinedContext += internalRAG;
  }
  const wasSearchAttempted = needWeb || internalRAG !== '';
  const noResultsFound = webAnswer === null && internalRAG === '';
  const userAskedForSpecifics = /\b(jobs?|openings?|program|training|salary|pay|near me|local|in my area)\b/i.test(
    lastUserRaw.toLowerCase()
  );
  if (
    wasSearchAttempted &&
    noResultsFound &&
    userAskedForSpecifics &&
    !overviewActuallyUsed
  ) {
    combinedContext = `INFO: Could not find specific results for the user's local/current query ("${lastUserRaw}"). Provide a general answer or suggest alternatives.`;
  }
  if (combinedContext) {
    messagesForLLM.push({
      role: 'system',
      content: `Use the following search results to answer the user's query...\n\n${combinedContext}`,
    });
  }
  return { 
    messagesForLLM, 
    lastUserRaw, 
    effectiveLocation, 
    internalRAG,
    domainGuarded: false 
  };
}
