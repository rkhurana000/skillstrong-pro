// /lib/orchestrator.ts
import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search';
import { findFeaturedMatching, searchJobs, searchPrograms, Job, Program } from '@/lib/marketplace';

export type Role = 'system' | 'user' | 'assistant';
export interface Message { role: Role; content: string }
export interface OrchestratorInput { messages: Message[]; location?: string | null }
export interface OrchestratorOutput { answer: string; followups: string[] }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System prompt remains the same
const COACH_SYSTEM = `You are "Coach Mach," an expert AI career coach for SkillStrong.

**Your Mission:** Guide users to discover well-paid, hands-on vocational careers in US manufacturing.

**Your Persona:** Encouraging, clear, practical, action-oriented (use bullets, short paragraphs).

**Core Rules:**
1.  **Synthesize All RAG:** Your system context may contain search results. You MUST use this context to answer the user's query. The context can have two parts:
    * \`### 🛡️ SkillStrong Search\`: This is a high-priority set of links to our *own* job/program search pages. You MUST include this *entire* markdown block (heading and links) **only when it is provided**.
    * \`**Related Web Results:**\` (or \`**Web Search Results:**\`): These are from the general internet (BLS, .edu sites, etc.) and provide broader context, salary data, or resources.
2.  **Blend Results:** Your *primary* answer should come from the "Web Results" (if provided). After giving that answer (with citations), you should *then* append the "SkillStrong Search" block **if it was provided in your context**.
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

// --- Internal Database Link Generation (Fixed Link Text) ---
async function queryInternalDatabase(query: string, location?: string): Promise<string> {
  const lowerQuery = query.toLowerCase();
  const needsJobs = /\b(jobs?|openings?|hiring|apprenticeships?)\b/i.test(lowerQuery);
  const needsPrograms = /\b(programs?|training|certificates?|courses?|schools?|college)\b/i.test(lowerQuery);
  const hasLocationSpecifier = /near me|local|in my area|nearby/i.test(lowerQuery) || !!location || /\b\d{5}\b/.test(query) || /\b[A-Z]{2}\b/.test(query);

  if (!((needsJobs || needsPrograms) && hasLocationSpecifier)) {
      console.log("queryInternalDatabase: Skipping (query lacks SPECIFIC job/program keywords or location).");
      return '';
  }

  console.log("queryInternalDatabase: Generating internal search links.");
  // --- MODIFICATION START: Cleaner Search Term Extraction ---
  // More robustly remove trigger words and location phrases
  let searchTerm = query
    .replace(/near me|local|in my area|nearby/gi, '') // Remove location qualifiers
    .replace(/\b(jobs?|openings?|hiring|apprenticeships?)\b/gi, '') // Remove job keywords
    .replace(/\b(programs?|training|certificates?|courses?|schools?|college)\b/gi, '') // Remove program keywords
    .replace(/in\s+([A-Za-z\s]+,\s*[A-Z]{2}|\d{5}|[A-Z]{2})\b/gi, '') // Remove "in City, ST", "in ZIP", "in ST"
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  // If the term is very short or generic after cleaning, maybe use a category if detected
  if (searchTerm.length < 3 || searchTerm.toLowerCase() === 'find' || searchTerm.toLowerCase() === 'search') {
      const detectedCategory = detectCanonicalCategory(query); // Check original query
      if (detectedCategory) {
          searchTerm = detectedCategory; // Use the canonical category name
          console.log(`queryInternalDatabase: Using detected category "${searchTerm}" for link text.`);
      } else {
           searchTerm = "relevant"; // Fallback if nothing specific remains
           console.log(`queryInternalDatabase: Using generic "relevant" for link text.`);
      }
  } else {
       console.log(`queryInternalDatabase: Using cleaned search term "${searchTerm}" for link text.`);
  }
  // --- MODIFICATION END ---


  const params = new URLSearchParams();
  if (searchTerm && searchTerm !== "relevant") {
      params.set('q', searchTerm); // Use the cleaned term for the actual search parameter
  }
  if (location) {
        const parts = location.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length === 2 && parts[1].length === 2 && parts[1] === parts[1].toUpperCase()) {
            params.set('city', parts[0]); params.set('state', parts[1]);
        } else if (parts.length === 1) {
            const part = parts[0];
            if (part.length === 2 && part === part.toUpperCase()) params.set('state', part);
            else if (part.match(/^\d{5}$/)) params.set('city', part);
            else params.set('city', part);
        }
  }
  const queryString = params.toString();
  let links: string[] = [];
  // Use the cleaned searchTerm for the display text in the link
  const linkQuery = searchTerm !== "relevant" ? ` for "${searchTerm}"` : "";

  if (needsJobs) links.push(`* [Search all **jobs**${linkQuery} on SkillStrong](/jobs/all?${queryString})`);
  if (needsPrograms) links.push(`* [Search all **programs**${linkQuery} on SkillStrong](/programs/all?${queryString})`);

  if (links.length > 0) {
    return `### 🛡️ SkillStrong Search
You can also search our internal database directly:
${links.join('\n')}`;
  }
  return '';
}


// --- Orchestrate Function (Unchanged - Logic Correct from last pass) ---
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
        console.log("Orchestrate: Seeded overview prompt for canonical category:", canonical);
  }

  // 1. Domain guard
  let inDomain = await domainGuard(messages);
  if (!inDomain) { /* ... (unchanged) ... */
      console.log("Domain Guard determined OUT OF DOMAIN for query:", lastUserRaw);
      return { answer:'I focus on modern manufacturing careers. We can explore roles like CNC Machinist, Robotics Technician, Welding Programmer, Additive Manufacturing, Maintenance Tech, or Quality Control. What would you like to dive into?', followups: defaultFollowups(), };
  } else { console.log("Domain Guard determined IN DOMAIN for query:", lastUserRaw); }

  // 2. Get Internal RAG results (links) based on the *original* user query
  const internalRAG = await queryInternalDatabase(lastUserRaw, input.location ?? undefined);

  // 3. Decide if Web RAG is needed based on *original* user query and seeded state
  const needWeb = await needsInternetRag(lastUserRaw, overviewSeeded);

  // 4. Perform Web RAG if needed
  let webAnswer = null;
  if (needWeb) { /* ... (unchanged error handling/logging) ... */
      console.log(`Orchestrate: Proceeding with Web Search for query: "${lastUserRaw}"`);
      try {
          webAnswer = await internetRagCSE(lastUserRaw, input.location ?? undefined, canonical);
          if (!webAnswer) console.log("Orchestrate: internetRagCSE returned null or empty string."); else console.log("Orchestrate: internetRagCSE returned web results successfully.");
      } catch (webRagError: any) { console.error("Orchestrate: Error occurred DURING internetRagCSE call:", webRagError); webAnswer = null; }
  } else { console.log(`Orchestrate: Skipping Web Search for query: "${lastUserRaw}" (overviewSeeded=${overviewSeeded})`); }

  // 5. Combine all context for the final AI call
  let combinedContext = '';
  if (internalRAG) { combinedContext += internalRAG + "\n\n"; }
  if (webAnswer) { const webHeading = internalRAG ? "**Related Web Results:**" : "**Web Search Results:**"; combinedContext += `${webHeading}\n${webAnswer}`; }
  const wasSearchAttempted = internalRAG !== '' || needWeb; const allSearchesFailed = (internalRAG === '' && webAnswer === null);
  if (wasSearchAttempted && allSearchesFailed) { combinedContext = `INFO: I performed a search for jobs, programs, or web resources related to the user's query ("${lastUserRaw}") but could not find any specific results. Provide a general answer or suggest alternatives.`; console.log("Orchestrate: Notifying LLM that all searches failed or returned empty."); }
  else if (!wasSearchAttempted) { console.log("Orchestrate: No search RAG performed (likely overview seed). Relying on base LLM."); }

  // 6. Build final message list for the single LLM call
  const messagesForFinalAnswer = [...input.messages];
  if (combinedContext) { messagesForFinalAnswer.push({ role: 'system', content: `Use the following search results to answer the user's query. You MUST follow the blending and citation rules from your main prompt.\n\n${combinedContext}` }); console.log("Orchestrate: Added combined RAG context to final LLM call."); }
  else { console.log("Orchestrate: No RAG context added to final LLM call."); }

  // 7. Generate the final answer using the LLM
  const finalAnswer = await answerLocal(messagesForFinalAnswer, input.location ?? undefined);
  console.log("Orchestrate: Generated final answer from LLM.");

  // 8. Add Featured Listings (separate logic, unchanged)
  let finalAnswerWithFeatured = finalAnswer;
  try { /* ... (unchanged) ... */
      const featured = await findFeaturedMatching(lastUserRaw, input.location ?? undefined);
      if (Array.isArray(featured) && featured.length > 0) { const locTxt = input.location ? ` near ${input.location}` : ''; const lines = featured.map((f) => `- **${f.title}** — ${f.org} (${f.location})`).join('\n'); if (!finalAnswerWithFeatured.includes('**Featured')) { finalAnswerWithFeatured += `\n\n**Featured${locTxt}:**\n${lines}`; console.log("Orchestrate: Appended featured listings."); } }
  } catch (err) { console.error("Error fetching/appending featured items:", err); }

  // 9. Generate Followups based on the final answer
  const followups = await generateFollowups(lastUserRaw, finalAnswerWithFeatured, input.location ?? undefined);
  console.log("Orchestrate: Generated followups.");

  return { answer: finalAnswerWithFeatured.trim(), followups };
}

// --- Domain Guard (Unchanged) ---
async function domainGuard(messages: Message[]): Promise<boolean> {
    // ... (keep existing implementation)
    if (!messages.some(m => m.role === 'user')) return true; const lastUserMessage = messages[messages.length - 1]; if (lastUserMessage?.role !== 'user') return true; const lastUserQuery = lastUserMessage.content || ''; if (!lastUserQuery.trim()) return true; const allowHints = /(manufact|cnc|robot|weld|machin|apprentice|factory|plant|quality|maintenance|mechatronic|additive|3d\s*print|bls|o\*net|program|community\s*college|trade\s*school|career|salary|pay|job|skill|training|near me|local|in my area|how much|what is|tell me about)/i; if (allowHints.test(lastUserQuery)) return true; const contextMessages = messages.slice(-4); const contextQuery = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n'); if (messages.filter(m => m.role === 'user').length === 1) { console.log(`Domain Guard: First user message failed regex, skipping AI check for query: "${lastUserQuery}"`); return false; } const systemPrompt = `Analyze the conversation context below. The user's goal is to learn about US MANUFACTURING careers/training/jobs (vocational roles like technicians, machinists, welders, etc., NOT 4-year degree engineering roles).\nIs the LAST user message in the conversation a relevant question or statement *within this specific manufacturing context*, considering the preceding messages?\nAnswer only IN or OUT.\n\nConversation Context:\n---\n${contextQuery}\n---\nIs the LAST user message relevant? Answer IN or OUT:`; try { const res = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0, messages: [{ role: 'system', content: systemPrompt }], max_tokens: 5 }); const out = res.choices[0]?.message?.content?.trim().toUpperCase(); console.log(`Domain Guard AI Check Result -> ${out} (Based on last query: "${lastUserQuery}")`); return out === 'IN'; } catch (error) { console.error("Error during domainGuard AI check:", error); return true; }
}

// --- Base Answer Generation (Unchanged) ---
async function answerLocal(messages: Message[], location?: string): Promise<string> {
    // ... (keep existing implementation)
    const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }]; if (location) msgs.push({ role: 'system', content: `User location: ${location}` }); msgs.push(...messages); try { const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.3, messages: msgs }); return res.choices[0]?.message?.content ?? ''; } catch (error) { console.error("Error calling OpenAI for local answer:", error); return "Sorry, I encountered an issue generating a response."; }
}

// --- needsInternetRag (Unchanged) ---
async function needsInternetRag(query: string, overviewSeeded: boolean): Promise<boolean> {
    // ... (keep existing implementation)
    if (overviewSeeded) { console.log("needsInternetRag: Overview was seeded, skipping web. -> FALSE"); return false; } console.log("needsInternetRag: Defaulting to web search. -> TRUE"); return true;
}


// --- Web RAG Function (internetRagCSE - Unchanged) ---
async function internetRagCSE(query: string, location?: string, canonical?: string | null): Promise<string | null> {
    // ... (keep existing implementation with detailed logging)
    const baseQuery = (canonical && /salary|pay|wage|job|opening|program|training|certificate|skill|course/i.test(query)) ? `${canonical} ${query}` : query; let q = location ? `${baseQuery} near ${location}` : baseQuery; q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org -site:quora.com -site:pinterest.com'; if (/(salary|pay|wage|median|bls)/i.test(query)) { q += ' (site:bls.gov OR site:onetonline.org)'; } if (/(program|training|certificate|certification|community college|course)/i.test(query)) { q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org OR site:careeronestop.org)'; } if (/jobs?|openings?|hiring|apprenticeship/i.test(query)) { q += ' (site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs OR site:apprenticeship.gov)'; } console.log("Executing Web Search (CSE) with query:", q); const res: any = await cseSearch(q); const items: any[] = Array.isArray(res?.items) ? res.items : []; if (!items.length) { console.log("internetRagCSE: CSE Search returned no items."); return null; } const pages = ( await Promise.all( items.slice(0, 3).map(async (it: any, index: number) => { const url: string | undefined = it.url || it.link; if (!url || !url.startsWith('http')) { console.log(`internetRagCSE: Skipping item ${index+1} due to invalid URL: ${url}`); return null; } try { const doc = await fetchReadable(url); if (doc && doc.text) { console.log(`internetRagCSE: Successfully fetched and parsed item ${index+1}: ${url}`); return doc; } else { console.log(`internetRagCSE: Failed to get readable text from item ${index+1}: ${url}`); return null; } } catch (fetchErr) { console.warn(`internetRagCSE: Error fetching item ${index+1} (${url}):`, fetchErr); return null; } }) )).filter(Boolean) as Array<{ title: string; url: string; text: string }>; if (!pages.length) { console.log("internetRagCSE: No pages could be successfully fetched or parsed."); return null; } const context = pages.map((p, i) => `[#${i + 1}] Document Title: ${p.title}\nURL: ${p.url}\nContent:\n${p.text.slice(0, 3000)}\n---`).join('\n\n'); const sys = `${COACH_SYSTEM_WEB_RAG}`; const prompt = `User question: ${query} ${location ? `(Location: ${location})` : ''}\n\nRAG Context From Web Search:\n---\n${context}\n---\n\nBased *only* on the RAG context provided above, write a concise markdown answer (use bullets if appropriate) to the user's question. Remember the vocational filter and discard irrelevant context (like healthcare salaries if asked about manufacturing). Do NOT add a 'Next Steps' section here. Cite sources accurately using the provided URLs like [#1], [#2], etc.`; try { console.log("internetRagCSE: Calling LLM to synthesize web results."); const out = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.25, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }]}); let answer = out.choices[0]?.message?.content ?? ''; if (!answer.trim()) { console.log("internetRagCSE: LLM synthesis returned an empty answer."); return null; } answer = answer.replace(/\[#(\d+)\](?!\()/g, (match, num) => { const p = pages[parseInt(num)-1]; return p ? `[#${num}](${p.url})` : match; }); const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s); const sourcesMd = '\n\n**Sources**\n' + pages.map((p, i) => `${i + 1}. [${trunc(p.title || p.url, 80)}](${p.url})`).join('\n'); console.log("internetRagCSE: Successfully synthesized web results."); return answer + sourcesMd; } catch (error) { console.error("Error during internetRagCSE OpenAI synthesis call:", error); return null; }
}


// --- Followup Generation (Unchanged) ---
async function generateFollowups(question: string, answer: string, location?: string): Promise<string[]> {
    // ... (keep existing implementation)
    let finalFollowups: string[] = []; try { const systemPrompt = `You are an assistant that generates relevant follow-up topics. Generate a JSON object with a key "followups" containing an array of 3-4 concise, engaging, and contextually relevant follow-up topics based on the user's question and the AI's answer. **RULES:** 1. Each topic MUST be a short phrase or title (e.g., "Explore CNC Machinist"). 2. Topics MUST NOT be questions (e.g., "What is CNC?"). 3. Topics MUST encourage exploration (e.g., "Find local programs", "Compare salaries"). 4. Topics MUST be directly related to the question or answer. 5. Return ONLY the JSON object.`; const userMessage = `User Question: "${question}"\nAI Answer: "${answer}"\n${location ? `User Location: "${location}"` : ''}\n\nJSON object with followups:`; const res = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0.4, response_format: { type: "json_object" }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage },],}); const raw = res.choices[0]?.message?.content ?? '{"followups": []}'; const parsed = JSON.parse(raw); if (parsed.followups && Array.isArray(parsed.followups) && parsed.followups.length > 0) finalFollowups = parsed.followups; else console.warn("Follow-up generation did not return valid followups:", raw); } catch (error) { console.error("Error generating follow-ups:", error); } const userAskedForLocal = /\b(jobs?|openings?|hiring|apprenticeships?|programs?|training|certificates?|courses?|schools?|college|near me|in my area)\b/i.test(question.toLowerCase()); const answerHasInternalLinks = /### 🛡️ SkillStrong Search/i.test(answer); const answerHasWeb = /Related Web Results|Web Search Results/i.test(answer); if (userAskedForLocal && answerHasInternalLinks && !answerHasWeb) { const hasExternalSearch = finalFollowups.some(f => /web|internet|external|more|other sites/i.test(f.toLowerCase())); if (!hasExternalSearch) finalFollowups.push('Search external sites for more?'); } if (finalFollowups.length > 0) return sanitizeFollowups(finalFollowups); else { console.warn("Falling back to default follow-ups for question:", question); return defaultFollowups(); }
}


// --- Sanitization and Defaults (Unchanged) ---
function sanitizeFollowups(arr: any[]): string[] {
    // ... (keep existing implementation)
    const MAX_LEN = 55; const MAX_PROMPTS = 4; return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) .map((s) => { let t = s.trim(); if (t.endsWith('.') || (t.endsWith('?') && !t.toLowerCase().startsWith('what') && !t.toLowerCase().startsWith('how'))) t = t.slice(0, -1); return t.slice(0, MAX_LEN); }) .filter((s, index, self) => self.indexOf(s) === index) .slice(0, MAX_PROMPTS);
}

function defaultFollowups(): string[] {
    // ... (keep existing implementation)
    return [ 'Find paid apprenticeships near me', 'Local training programs', 'Typical salaries (BLS)', ].slice(0, 4);
}
