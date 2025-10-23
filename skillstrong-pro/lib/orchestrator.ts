// /lib/orchestrator.ts
import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search';
import { findFeaturedMatching, searchJobs, searchPrograms, Job, Program } from '@/lib/marketplace'; // searchJobs/searchPrograms are no longer used by queryInternalDatabase but kept for findFeaturedMatching

export type Role = 'system' | 'user' | 'assistant';
export interface Message { role: Role; content: string }
export interface OrchestratorInput { messages: Message[]; location?: string | null }
export interface OrchestratorOutput { answer: string; followups: string[] }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- MODIFICATION START: Updated System Prompt ---
// This new prompt instructs the AI on how to blend Web RAG
// with the new internal *search page links*.
const COACH_SYSTEM = `You are "Coach Mach," an expert AI career coach for SkillStrong.

**Your Mission:** Guide users to discover well-paid, hands-on vocational careers in US manufacturing.

**Your Persona:** Encouraging, clear, practical, action-oriented (use bullets, short paragraphs).

**Core Rules:**
1.  **Synthesize All RAG:** Your system context may contain search results. You MUST use this context to answer the user's query. The context can have two parts:
    * \`### 🛡️ SkillStrong Search\`: This is a high-priority set of links to our *own* job/program search pages. You MUST include this *entire* markdown block (heading and links) when it is provided.
    * \`**Related Web Results:**\` (or \`**Web Search Results:**\`): These are from the general internet (BLS, .edu sites, etc.) and provide broader context, salary data, or resources.
2.  **Blend Results:** Your *primary* answer should come from the "Web Results" (if provided). After giving that answer (with citations), you should *then* append the "SkillStrong Search" block.
    For example:
    "Based on my search, a typical salary is...
    
    You can also search our internal database directly:
    ### 🛡️ SkillStrong Search
    * [Search all **jobs** for "CNC" on SkillStrong](/jobs/all?...)
    * [Search all **programs** for "CNC" on SkillStrong](/programs/all?...)"
3.  **Handle No Results:** If the system context says "INFO: ... searches ... found no specific results", you MUST inform the user you couldn't find specific local jobs/programs/resources and fall back to a general answer.
4.  **Prioritize Links:** *Always* prefer to use the *exact markdown links* provided in the context. Do not rewrite them as plain text.
5.  **Vocational Filter:** Answer ONLY about vocational roles (technicians, machinists, operators, skilled trades) not requiring a 4-year degree. Interpret general requests (e.g., "robotics jobs") as technician-level roles.
6.  **Single Next Steps:** Add ONE concise 'Next Steps' section at the very end of your *entire* response.
7.  **Stay on Topic:** Strictly US manufacturing careers. No healthcare, retail, etc.
8.  **No Hallucinations:** NEVER invent URLs, stats, or details. If unsure, say so.`;
// --- MODIFICATION END ---


const COACH_SYSTEM_WEB_RAG = `You are "Coach Mach," synthesizing web search results about US manufacturing vocational careers.
**Core Rules:**
1.  **Use Context Only:** Base your answer *strictly* on the provided 'RAG Context'.
2.  **Cite Sources:** Cite sources in-line as [#1], [#2]. Use only the provided URLs.
3.  **Strict Relevance Filter:** Answer *only* the specific user question. Filter the context aggressively - provide ONLY information directly relevant to the user's specific query AND the manufacturing vocational domain (technicians, operators, etc.). Discard anything else (e.g., general non-manufacturing salaries, 4-year degree engineering roles, unrelated topics).
4.  **Stay on Topic:** US manufacturing vocational careers only.
5.  **No Hallucinations:** Do not invent information or URLs.
6.  **Concise:** Use bullets where appropriate. Do NOT add 'Next Steps'.`;


// --- Category Detection & Overview Prompt (Unchanged) ---
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'CNC Machinist': ['cnc machinist', 'cnc', 'machinist', 'cnc operator'],
  'Robotics Technician': ['robotics technician', 'robotics technologist', 'robotics tech', 'robotics'],
  'Welding Programmer': ['welding programmer', 'robotic welding', 'laser welding'],
  'Maintenance Tech': ['industrial maintenance', 'maintenance tech', 'maintenance technician'],
  'Quality Control Specialist': ['quality control', 'quality inspector', 'qc', 'metrology'],
  'Additive Manufacturing': ['additive manufacturing', '3d printing'],
};
function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}
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

// --- URL Domain Helper (Unchanged) ---
function getDomain(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const host = new URL(url).hostname;
        return host.replace(/^www\./, '');
    } catch { return null; }
}

// --- MODIFICATION START: `queryInternalDatabase` now generates links, not listings ---
/**
 * Checks if the query is for jobs or programs and returns markdown
 * links to the internal search pages, pre-filled with search parameters.
 */
async function queryInternalDatabase(query: string, location?: string): Promise<string> {
  const lowerQuery = query.toLowerCase();

  // --- TRIGGER CONDITIONS ---
  const needsJobs = /jobs?|openings?|careers?|hiring|apprenticeships?/.test(lowerQuery);
  const needsPrograms = /programs?|training|certificates?|courses?|schools?|college/.test(lowerQuery);
  const hasLocationSpecifier = /near me|local|in my area|nearby/.test(lowerQuery) || !!location || /\b\d{5}\b/.test(query) || /\b[A-Z]{2}\b/.test(query);

  // ONLY proceed if user asks for specifics (jobs/programs) AND provides/implies a location
  if ((!needsJobs && !needsPrograms) || !hasLocationSpecifier) {
      console.log("queryInternalDatabase: Skipping (query lacks job/program specifics or location).");
      return ''; // Return empty if conditions not met
  }
  // --- END TRIGGER ---

  console.log("queryInternalDatabase: Generating internal search links.");
  
  // Basic keyword extraction (remove location/intent terms for a cleaner search query)
  const searchTerm = query
    .replace(/near me|local|in my area|nearby|\b\d{5}\b|\b[A-Z]{2}\b/gi, '')
    .replace(/jobs?|openings?|careers?|hiring|apprenticeships?/gi, '')
    .replace(/programs?|training|certificates?|courses?|schools?|college/gi, '')
    .replace(/in [A-Za-z\s,]+$/gi, '')
    .trim();

  // Build URL search parameters from location
  const params = new URLSearchParams();
  if (searchTerm) {
    params.set('q', searchTerm);
  }
  if (location) {
        const parts = location.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length === 2 && parts[1].length === 2 && parts[1] === parts[1].toUpperCase()) {
            // "City, ST"
            params.set('city', parts[0]);
            params.set('state', parts[1]);
        } else if (parts.length === 1) {
            const part = parts[0];
            if (part.length === 2 && part === part.toUpperCase()) {
                // "ST"
                params.set('state', part);
            } else if (part.match(/^\d{5}$/)) {
                // "ZIP" - Use as city, as our search pages support this
                params.set('city', part);
            } else {
                // "City"
                params.set('city', part);
            }
        }
  }
  const queryString = params.toString();

  let links: string[] = [];
  const linkQuery = searchTerm ? ` for "${searchTerm}"` : "";

  // Add relevant links
  if (needsJobs) {
    links.push(`* [Search all **jobs**${linkQuery} on SkillStrong](/jobs/all?${queryString})`);
  }
  if (needsPrograms) {
    links.push(`* [Search all **programs**${linkQuery} on SkillStrong](/programs/all?${queryString})`);
  }

  if (links.length > 0) {
    // Return the new markdown block for the AI to use
    return `### 🛡️ SkillStrong Search
You can also search our internal database directly:
${links.join('\n')}`;
  }
  
  return ''; // No links generated
}
// --- MODIFICATION END ---


// --- Orchestrate Function (Refined Logic) ---
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

  // 1. Domain guard
  let inDomain = await domainGuard(messages);
  if (!inDomain) {
        console.log("Domain Guard determined OUT OF DOMAIN for query:", lastUserRaw);
        return {
            answer:'I focus on modern manufacturing careers. We can explore roles like CNC Machinist, Robotics Technician, Welding Programmer, Additive Manufacturing, Maintenance Tech, or Quality Control. What would you like to dive into?',
            followups: defaultFollowups(),
        };
  } else { console.log("Domain Guard determined IN DOMAIN for query:", lastUserRaw); }

  // 2. Get Internal RAG results (which are now *links* to search pages)
  const internalRAG = await queryInternalDatabase(lastUserRaw, input.location ?? undefined);

  // 3. Decide if Web RAG is needed
  const wasInternalSearchAttempted = ( /jobs?|openings?|program|training|near me|local/i.test(lastUserRaw) && (!!input.location || /\b\d{5}\b|\b[A-Z]{2}\b/i.test(lastUserRaw)) );
  // We pass an empty draft answer ("") because we haven't generated one yet.
  const needWeb = await needsInternetRag(lastUserRaw, "", internalRAG, wasInternalSearchAttempted);

  let webAnswer = null;
  if (needWeb && !overviewSeeded) {
        console.log("Orchestrate: Proceeding with Web Search.");
        webAnswer = await internetRagCSE(lastUserRaw, input.location ?? undefined, canonical);
        if (!webAnswer) {
             console.log("Orchestrate: Web Search ran but returned no usable results.");
        }
  } else { console.log("Orchestrate: Skipping Web Search."); }

  // 4. Combine all context for the AI
  let combinedContext = '';
  if (internalRAG) {
    // Add the internal search *links*
    combinedContext += internalRAG + "\n\n";
  }
  if (webAnswer) {
    // Add the web search *results*
    const webHeading = internalRAG ? "**Related Web Results:**" : "**Web Search Results:**";
    combinedContext += `${webHeading}\n${webAnswer}`;
  }
  if (!internalRAG && !webAnswer && (wasInternalSearchAttempted || needWeb)) {
     // Tell the AI that searches were attempted but found nothing
     combinedContext = `INFO: I performed a search for jobs, programs, or web resources related to the user's query but could not find any specific results.`;
  }

  // 5. Build final message list for ONE AI call
  const messagesForFinalAnswer = [...messages];
  if (combinedContext) {
    messagesForFinalAnswer.push({ role: 'system', content: `Use the following search results to answer the user's query. You MUST follow the blending and citation rules from your main prompt.\n\n${combinedContext}` });
  }
  
  // 6. Generate the final answer
  const finalAnswer = await answerLocal(messagesForFinalAnswer, input.location ?? undefined);

  // 7. Add Featured (this still injects 3 *specific* featured listings)
  let finalAnswerWithFeatured = finalAnswer;
  try {
        const featured = await findFeaturedMatching(lastUserRaw, input.location ?? undefined);
        if (Array.isArray(featured) && featured.length > 0) {
            const locTxt = input.location ? ` near ${input.location}` : '';
            const lines = featured.map((f) => `- **${f.title}** — ${f.org} (${f.location})`).join('\n');
            if (!finalAnswerWithFeatured.includes('**Featured')) {
                 finalAnswerWithFeatured += `\n\n**Featured${locTxt}:**\n${lines}`;
            }
        }
  } catch (err) { console.error("Error fetching featured items:", err); }

  // 8. Generate Followups
  const followups = await generateFollowups(lastUserRaw, finalAnswerWithFeatured, input.location ?? undefined);
  
  return { answer: finalAnswerWithFeatured.trim(), followups };
}

// --- Domain Guard (Unchanged) ---
async function domainGuard(messages: Message[]): Promise<boolean> {
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
async function answerLocal(messages: Message[], location?: string): Promise<string> {
    const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }];
    if (location) msgs.push({ role: 'system', content: `User location: ${location}` });
    msgs.push(...messages); // Includes history and ALL RAG context
    try {
        const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.3, messages: msgs });
        return res.choices[0]?.message?.content ?? '';
    } catch (error) {
        console.error("Error calling OpenAI for local answer:", error);
        return "Sorry, I encountered an issue generating a response."; // Fallback error message
    }
}

// --- needsInternetRag (Unchanged from last fix) ---
async function needsInternetRag(query: string, draftAnswer: string, internalRAGResult: string, internalSearchAttempted: boolean): Promise<boolean> {
    const lowerQuery = (query || '').toLowerCase();
    console.log(`needsInternetRag Check: Query='${query}', InternalAttempted=${internalSearchAttempted}, InternalResultIsEmpty=${internalRAGResult === ''}`); // Logging

    // 1. Explicit request for web search?
    const explicitWebSearch = /web|internet|external|more results|other sites|search again/i;
    if (explicitWebSearch.test(lowerQuery)) {
        console.log("needsInternetRag: User explicitly asked for web search. -> TRUE");
        return true;
    }

    // 2. Request for online resources, links, etc.?
    const needsWebSearch = /resources?|links?|websites?|find|search|recommend.*(online|web)/i;
     if (needsWebSearch.test(lowerQuery)) {
        console.log("needsInternetRag: User asked for online resources/links. -> TRUE");
        return true;
    }

    // 3. Query implies external data?
    const externalKeywords = /bls|bureau of labor|statistic|latest|trend|news|tuition|cost|salaryexpert|onetonline|onetcenter|osha|nims|specific company|market size/i;
    const needsExternalSalary = /salary|pay|wage|median/i.test(lowerQuery) && !/typical|range|overview/i.test(lowerQuery);
    if (externalKeywords.test(lowerQuery) || needsExternalSalary) {
        console.log("needsInternetRag: Query implies external data needed. -> TRUE");
        return true;
    }

    // 4. Internal search was appropriate but found nothing? (Now 'internalRAGResult' is empty if no links were generated)
    if (internalSearchAttempted && internalRAGResult === '') {
        console.log("needsInternetRag: Internal search attempted but found no relevant links. -> TRUE");
        return true;
    }

    // 5. AI indicates uncertainty (This check is less relevant now but harmless)
    const indicatesUncertainty = /i don'?t know|not sure|no specific data|couldn'?t find details|recommend searching/i.test(draftAnswer.toLowerCase());
    if (indicatesUncertainty && !internalRAGResult) {
        console.log("needsInternetRag: Draft answer indicates uncertainty and no internal results found. -> TRUE");
        return true;
    }

    // 6. Avoid web search for general exploration if internal search wasn't relevant
    const generalExploration = /(overview|what is|what does .* do|day[- ]?to[- ]?day|tools & tech|core skills|tell me about|how do i become|steps to become|advice|tips)/i;
    if (generalExploration.test(lowerQuery) && !internalSearchAttempted) {
        console.log("needsInternetRag: General exploration query, internal search not relevant, skipping web. -> FALSE");
        return false;
    }

    // If it's not a local search and not a general overview, it's probably a request for web info
    if (!internalSearchAttempted && !generalExploration.test(lowerQuery)) {
        console.log("needsInternetRag: Query is not for local data and not a general overview, assume web search. -> TRUE");
        return true;
    }

    console.log("needsInternetRag: No specific trigger matched, defaulting to false. -> FALSE");
    return false;
}


// --- Web RAG Function (Unchanged) ---
async function internetRagCSE(query: string, location?: string, canonical?: string | null): Promise<string | null> {
    const baseQuery = (canonical && /salary|pay|wage|job|opening|program|training|certificate|skill|course/i.test(query)) ? `${canonical} ${query}` : query;
    let q = location ? `${baseQuery} near ${location}` : baseQuery;
    q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org -site:quora.com -site:pinterest.com';
    if (/(salary|pay|wage|median|bls)/i.test(query)) { q += ' (site:bls.gov OR site:onetonline.org)'; }
    if (/(program|training|certificate|certification|community college|course)/i.test(query)) { q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org OR site:careeronestop.org)'; }
    if (/jobs?|openings?|hiring|apprenticeship/i.test(query)) { q += ' (site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs OR site:apprenticeship.gov)'; }

    console.log("Executing Web Search (CSE) with query:", q);
    const res: any = await cseSearch(q);
    const items: any[] = Array.isArray(res?.items) ? res.items : [];
    if (!items.length) { return null; }
    const pages = ( await Promise.all(
         items.slice(0, 3).map(async (it: any) => {
            const url: string | undefined = it.url || it.link;
            if (!url || !url.startsWith('http')) return null;
            try { const doc = await fetchReadable(url); if (doc && doc.text) return doc; }
            catch (fetchErr) { console.warn(`Failed to fetch ${url}:`, fetchErr); }
            return null;
          })
    )).filter(Boolean) as Array<{ title: string; url: string; text: string }>;

    if (!pages.length) { return null; }

    const context = pages.map((p, i) => `[#${i + 1}] Document Title: ${p.title}\nURL: ${p.url}\nContent:\n${p.text.slice(0, 3000)}\n---`).join('\n\n');
    const sys = `${COACH_SYSTEM_WEB_RAG}`;
    const prompt = `User question: ${query} ${location ? `(Location: ${location})` : ''}\n\nRAG Context From Web Search:\n---\n${context}\n---\n\nBased *only* on the RAG context provided above, write a concise markdown answer (use bullets if appropriate) to the user's question. Remember the vocational filter and discard irrelevant context (like healthcare salaries if asked about manufacturing). Do NOT add a 'Next Steps' section here. Cite sources accurately using the provided URLs like [#1], [#2], etc.`;

    try {
        const out = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.25, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }]});
        let answer = out.choices[0]?.message?.content ?? '';
        answer = answer.replace(/\[#(\d+)\](?!\()/g, (match, num) => { const p = pages[parseInt(num)-1]; return p ? `[#${num}](${p.url})` : match; });
        const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
        const sourcesMd = '\n\n**Sources**\n' + pages.map((p, i) => `${i + 1}. [${trunc(p.title || p.url, 80)}](${p.url})`).join('\n');
        return answer + sourcesMd;
    } catch (error) { console.error("Error during internetRagCSE OpenAI call:", error); return null; }
}

// --- Followup Generation (Unchanged from last fix) ---
async function generateFollowups(question: string, answer: string, location?: string): Promise<string[]> {
    let finalFollowups: string[] = [];
    try {
        const systemPrompt = `You are an assistant that generates relevant follow-up topics.
Generate a JSON object with a key "followups" containing an array of 3-4 concise, engaging, and contextually relevant follow-up topics based on the user's question and the AI's answer.
        
**RULES:**
1.  Each topic MUST be a short phrase or title (e.g., "Explore CNC Machinist").
2.  Topics MUST NOT be questions (e.g., "What is CNC?").
3.  Topics MUST encourage exploration (e.g., "Find local programs", "Compare salaries").
4.  Topics MUST be directly related to the question or answer.
5.  Return ONLY the JSON object.`;

        const userMessage = `User Question: "${question}"
AI Answer: "${answer}"
${location ? `User Location: "${location}"` : ''}

JSON object with followups:`;

        const res = await openai.chat.completions.create({
            model: 'gpt-4o-mini', 
            temperature: 0.4,
            response_format: { type: "json_object" },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
        ],});

        const raw = res.choices[0]?.message?.content ?? '{"followups": []}';
        const parsed = JSON.parse(raw);
        if (parsed.followups && Array.isArray(parsed.followups) && parsed.followups.length > 0) {
            finalFollowups = parsed.followups;
        } else {
            console.warn("Follow-up generation did not return valid followups:", raw);
        }
    } catch (error) { console.error("Error generating follow-ups:", error); }

    const userAskedForLocal = /jobs?|openings?|careers?|hiring|apprenticeships?|programs?|training|certificates?|courses?|schools?|college|near me|in my area/i.test(question.toLowerCase());
    // The internal RAG *links* are now in the answer, not just the context
    const answerHasInternalLinks = /### 🛡️ SkillStrong Search/i.test(answer);
    const answerHasWeb = /Related Web Results|Web Search Results/i.test(answer);

    // This logic is less relevant now as the links are *in* the answer, but
    // if web search was needed but failed, this could still be useful.
    if (userAskedForLocal && answerHasInternalLinks && !answerHasWeb) {
         const hasExternalSearch = finalFollowups.some(f => /web|internet|external|more|other sites/i.test(f.toLowerCase()));
         if (!hasExternalSearch) { finalFollowups.push('Search external sites for more?'); }
    }

    if (finalFollowups.length > 0) { return sanitizeFollowups(finalFollowups); }
    else { console.warn("Falling back to default follow-ups for question:", question); return defaultFollowups(); }
}


// --- Sanitization and Defaults (Unchanged) ---
function sanitizeFollowups(arr: any[]): string[] {
    const MAX_LEN = 55;
    const MAX_PROMPTS = 4;
    return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => { let t = s.trim(); if (t.endsWith('.') || (t.endsWith('?') && !t.toLowerCase().startsWith('what') && !t.toLowerCase().startsWith('how'))) { t = t.slice(0, -1); } return t.slice(0, MAX_LEN); })
        .filter((s, index, self) => self.indexOf(s) === index)
        .slice(0, MAX_PROMPTS);
}

function defaultFollowups(): string[] {
    return [
        'Find paid apprenticeships near me',
        'Local training programs',
        'Typical salaries (BLS)',
    ].slice(0, 4);
}
