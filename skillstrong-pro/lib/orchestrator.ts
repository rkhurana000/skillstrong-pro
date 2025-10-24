// /lib/orchestrator.ts
import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search';
import { findFeaturedMatching } from '@/lib/marketplace';

export type Role = 'system' | 'user' | 'assistant';
export interface Message { role: Role; content: string }
export interface OrchestratorInput { messages: Message[]; location?: string | null }
export interface OrchestratorOutput { answer: string; followups: string[] }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- MODIFICATION START: Enhanced COACH_SYSTEM Prompt ---
const COACH_SYSTEM = `You are "Coach Mach," a friendly, practical AI guide helping U.S. students discover hands-on, well-paid manufacturing careers that DO NOT require a 4-year degree.

**Your Mission:** Provide encouraging, clear, and actionable advice on vocational paths in modern manufacturing (e.g., CNC, robotics, welding, maintenance, quality, additive).

**Output Format:** Respond with Markdown, using short paragraphs and bullet points.

**Non-Negotiable Rules:**
1.  **Audience Fit (≤2 Years Training):** ONLY recommend roles, programs, and jobs typically requiring certificates, apprenticeships, AAS degrees, bootcamps, non-credit, or on-the-job training (≤2 years). If a user mentions a role usually needing a bachelor’s (e.g., Mechanical Engineer), suggest the equivalent sub-degree path (e.g., "Instead of Mechanical Engineer (4-yr degree), consider an Engineering Technician role (AAS degree)...").
2.  **Truth & Sources (Web/RAG):** When providing current facts (salaries, job openings, local programs, tuition, start dates, specific employer jobs, certifications, scholarships, labor stats, comparisons, prices), you MUST use information from the provided "Web Results" context. Cite at least 2 web sources inline like [#1], [#2] using the provided URLs. NEVER invent data, schools, or postings. If web results are insufficient, state that clearly.
3.  **Synthesize All RAG:** Your system context may contain "Web Results" and "SkillStrong Search" links.
    * Base your primary answer on the "Web Results," citing sources.
    * *After* the main answer, append the *entire* "### 🛡️ SkillStrong Search" block **only if it was provided** in the context. Use the exact markdown links.
4.  **Geography:** If the user provides a location (city, state, ZIP) in their query or context, prioritize nearby results from the RAG context. If a local search is needed but location is missing, your ONLY response MUST be: "To find local results, please set your location using the button in the header." with an empty followups array.
5.  **Accessibility:** Avoid jargon. Briefly explain technical terms if necessary (e.g., "CNC, which means Computer Numerical Control, uses computers to operate machines...").
6.  **Tone:** Be supportive and encouraging. Avoid gatekeeping language.
7.  **No Chain-of-Thought:** Do not reveal internal reasoning.
8.  **Single Next Steps:** Add ONE concise 'Next Steps' section at the very end of your *entire* response.`;
// --- MODIFICATION END ---


// System prompt for the web RAG synthesis step (unchanged)
const COACH_SYSTEM_WEB_RAG = `You are "Coach Mach," synthesizing web search results about US manufacturing vocational careers.
**Core Rules:**
1.  **Use Context Only:** Base your answer *strictly* on the provided 'RAG Context'.
2.  **Cite Sources:** Cite sources in-line as [#1], [#2]. Use only the provided URLs.
3.  **Strict Relevance Filter:** Answer *only* the specific user question, filtering context for relevant manufacturing vocational roles (technicians, operators, etc.).
4.  **Stay on Topic:** US manufacturing vocational careers only.
5.  **No Hallucinations:** Do not invent information or URLs.
6.  **Concise:** Use bullets. Do NOT add 'Next Steps'.`;


// --- Category Detection & Overview Prompt (Unchanged) ---
const CATEGORY_SYNONYMS: Record<string, string[]> = { /* ... (unchanged) ... */
  'CNC Machinist': ['cnc machinist', 'cnc', 'machinist', 'cnc operator'], 'Robotics Technician': ['robotics technician', 'robotics technologist', 'robotics tech', 'robotics'], 'Welding Programmer': ['welding programmer', 'robotic welding', 'laser welding'], 'Maintenance Tech': ['industrial maintenance', 'maintenance tech', 'maintenance technician'], 'Quality Control Specialist': ['quality control', 'quality inspector', 'qc', 'metrology'], 'Additive Manufacturing': ['additive manufacturing', '3d printing'],
};
function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}
function detectCanonicalCategory(query: string): string | null { /* ... (unchanged) ... */
    const text = (query || '').toLowerCase(); for (const [canonical, syns] of Object.entries(CATEGORY_SYNONYMS)) { for (const s of syns) { const re = new RegExp(`\\b${escapeRegExp(s)}\\b`, 'i'); if (re.test(text)) return canonical; } } return null;
}
function buildOverviewPrompt(canonical: string): string { /* ... (unchanged) ... */
    return `Give a student-friendly overview of the **${canonical}** career... (rest unchanged)`;
}

// --- URL Domain Helper (Unchanged) ---
function getDomain(url: string | null | undefined): string | null { /* ... (unchanged) ... */
    if (!url) return null; try { const host = new URL(url).hostname; return host.replace(/^www\./, ''); } catch { return null; }
}

// --- Internal Database Link Generation (Unchanged) ---
async function queryInternalDatabase(query: string, location?: string): Promise<string> { /* ... (unchanged - strict keyword+location trigger, clean link text) ... */
  const lowerQuery = query.toLowerCase(); const needsJobs = /\b(jobs?|openings?|hiring|apprenticeships?)\b/i.test(lowerQuery); const needsPrograms = /\b(programs?|training|certificates?|courses?|schools?|college)\b/i.test(lowerQuery); const hasLocationSpecifier = /near me|local|in my area|nearby/i.test(lowerQuery) || !!location || /\b\d{5}\b/.test(query) || /\b[A-Z]{2}\b/.test(query); if (!((needsJobs || needsPrograms) && hasLocationSpecifier)) { console.log("[Internal RAG] Skipping: Query lacks specific job/program keywords or location."); return ''; } console.log("[Internal RAG] Generating internal search links."); let searchTerm = query .replace(/near me|local|in my area|nearby/gi, '') .replace(/\b(jobs?|openings?|hiring|apprenticeships?)\b/gi, '') .replace(/\b(programs?|training|certificates?|courses?|schools?|college)\b/gi, '') .replace(/in\s+([A-Za-z\s]+,\s*[A-Z]{2}|\d{5}|[A-Z]{2})\b/gi, '') .replace(/\s+/g, ' ') .trim(); if (searchTerm.length < 3 || searchTerm.toLowerCase() === 'find' || searchTerm.toLowerCase() === 'search') { const detectedCategory = detectCanonicalCategory(query); searchTerm = detectedCategory || "relevant"; console.log(`[Internal RAG] Using term "${searchTerm}" for link text.`); } else { console.log(`[Internal RAG] Using cleaned term "${searchTerm}" for link text.`); } const params = new URLSearchParams(); if (searchTerm !== "relevant") params.set('q', searchTerm); if (location) { const parts = location.split(',').map(s => s.trim()).filter(Boolean); if (parts.length === 2 && parts[1].length === 2 && parts[1] === parts[1].toUpperCase()) { params.set('city', parts[0]); params.set('state', parts[1]); } else if (parts.length === 1) { const part = parts[0]; if (part.length === 2 && part === part.toUpperCase()) params.set('state', part); else if (part.match(/^\d{5}$/)) params.set('city', part); else params.set('city', part); } } const queryString = params.toString(); let links: string[] = []; const linkQueryText = searchTerm !== "relevant" ? ` for "${searchTerm}"` : ""; if (needsJobs) links.push(`* [Search all **jobs**${linkQueryText} on SkillStrong](/jobs/all?${queryString})`); if (needsPrograms) links.push(`* [Search all **programs**${linkQueryText} on SkillStrong](/programs/all?${queryString})`); if (links.length > 0) { return `### 🛡️ SkillStrong Search\nYou can also search our internal database directly:\n${links.join('\n')}`; } console.log("[Internal RAG] No relevant links generated despite matching criteria."); return '';
}


// --- Orchestrate Function (Incorporates ask-for-location logic) ---
export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const originalMessages = input.messages;
  const lastUserRaw = [...originalMessages].reverse().find(m => m.role === 'user')?.content ?? '';
  const isFirstUserMessage = originalMessages.filter(m => m.role === 'user').length === 1;
  const canonical = detectCanonicalCategory(lastUserRaw);

  let messagesForLLM = [...originalMessages];
  let messageContentForRAGDecision = lastUserRaw;
  let overviewActuallyUsed = false;
  if (canonical && isFirstUserMessage) {
        const seedPrompt = buildOverviewPrompt(canonical);
        messagesForLLM[messagesForLLM.length - 1] = { role: 'user', content: seedPrompt };
        messageContentForRAGDecision = seedPrompt;
        overviewActuallyUsed = true;
        console.log("[Orchestrate] Using overview prompt for LLM input. Category:", canonical);
  }

  // 1. Domain Guard
  const inDomain = await domainGuard(originalMessages);
  if (!inDomain) { /* ... (unchanged) ... */
       console.log("[Orchestrate] Domain Guard: OUT OF DOMAIN for query:", lastUserRaw); return { answer:'I focus on modern manufacturing careers...', followups: defaultFollowups(), };
  }
  console.log("[Orchestrate] Domain Guard: IN DOMAIN for query:", lastUserRaw);

  // --- MODIFICATION START: Ask for Location Check ---
  // Determine if web search *would* be needed IF location was present
  const willNeedWebIfLocal = await needsInternetRag(messageContentForRAGDecision, input.location, true); // Use checkOnly=true
  const isLocalQuery = /near me|local|in my area|nearby|\b\d{5}\b|[A-Z]{2}\b/i.test(lastUserRaw) || /\b(jobs?|openings?|hiring|apprenticeships?|programs?|training|tuition|start date|admission|employer|provider|scholarship)\b/i.test(lastUserRaw.toLowerCase());

  if (isLocalQuery && !input.location) {
      console.log("[Orchestrate] Local query detected but location is missing. Asking user.");
      return {
          answer: "To find local results, please set your location using the button in the header.",
          followups: [] // Explicitly empty per rules
      };
  }
  // --- MODIFICATION END ---

  // 2. Generate Internal RAG Links (if applicable)
  const internalRAG = await queryInternalDatabase(lastUserRaw, input.location ?? undefined);

  // 3. Decide if Web RAG is *actually* needed now (location confirmed if needed)
  const needWeb = await needsInternetRag(messageContentForRAGDecision, input.location); // Pass location, checkOnly=false (default)
  console.log(`[Orchestrate] Decision: needsInternetRag = ${needWeb}`);

  // 4. Perform Web RAG if needed
  let webAnswer = null;
  if (needWeb) { /* ... (unchanged error handling/logging) ... */
      console.log(`[Orchestrate] Proceeding with Web Search for original query: "${lastUserRaw}"`); try { webAnswer = await internetRagCSE(lastUserRaw, input.location ?? undefined, canonical); if (webAnswer) console.log("[Orchestrate] Web RAG successful."); else console.log("[Orchestrate] Web RAG returned no usable content."); } catch (webRagError: any) { console.error("[Orchestrate] Error during Web RAG call:", webRagError); webAnswer = null; }
  } else { console.log(`[Orchestrate] Skipping Web Search.`); }

  // 5. Combine Context for Final LLM Call
  let combinedContext = '';
  if (webAnswer) { const webHeading = internalRAG ? "**Related Web Results:**" : "**Web Search Results:**"; combinedContext += `${webHeading}\n${webAnswer}\n\n`; }
  if (internalRAG) { combinedContext += internalRAG; }
  const wasSearchAttempted = needWeb || internalRAG !== ''; const noResultsFound = webAnswer === null && internalRAG === '';
  if (wasSearchAttempted && noResultsFound && !overviewActuallyUsed) { combinedContext = `INFO: I performed a search based on the user's query ("${lastUserRaw}") but could not find specific results. Provide a general answer or suggest alternatives.`; console.log("[Orchestrate] Notifying LLM: All relevant searches failed or returned empty."); }
  else if (!combinedContext && overviewActuallyUsed) { console.log("[Orchestrate] No RAG context generated (Overview prompt used)."); }
  else if (!combinedContext) { console.log("[Orchestrate] No RAG context generated (Web search skipped/failed, no internal links triggered)."); }

  // 6. Build Message List for Final LLM Call
  const messagesForFinalAnswer = [...messagesForLLM];
  if (combinedContext) { messagesForFinalAnswer.push({ role: 'system', content: `Use the following search results to answer the user's query...\n\n${combinedContext}` }); console.log("[Orchestrate] Added combined RAG context to final LLM call."); }
  else { console.log("[Orchestrate] No RAG context added to final LLM call."); }

  // 7. Generate Final Answer
  const finalAnswer = await answerLocal(messagesForFinalAnswer, input.location ?? undefined);
  console.log("[Orchestrate] Generated final answer from LLM.");

  // 8. Add Featured Listings (Unchanged)
  let finalAnswerWithFeatured = finalAnswer;
  try { /* ... (unchanged) ... */
      const featured = await findFeaturedMatching(lastUserRaw, input.location ?? undefined); if (Array.isArray(featured) && featured.length > 0) { const locTxt = input.location ? ` near ${input.location}` : ''; const lines = featured.map((f) => `- **${f.title}** — ${f.org} (${f.location})`).join('\n'); if (!finalAnswerWithFeatured.includes('**Featured')) { finalAnswerWithFeatured += `\n\n**Featured${locTxt}:**\n${lines}`; console.log("[Orchestrate] Appended featured listings."); } }
  } catch (err) { console.error("[Orchestrate] Error fetching/appending featured items:", err); }

  // 9. Generate Followups
  const followups = await generateFollowups(lastUserRaw, finalAnswerWithFeatured, input.location ?? undefined);
  console.log("[Orchestrate] Generated followups.");

  return { answer: finalAnswerWithFeatured.trim(), followups };
}

// --- Domain Guard (Unchanged) ---
async function domainGuard(messages: Message[]): Promise<boolean> { /* ... (unchanged - strong regex first) ... */
    if (!messages.some(m => m.role === 'user')) return true; const lastUserMessage = messages[messages.length - 1]; if (lastUserMessage?.role !== 'user') return true; const lastUserQuery = lastUserMessage.content || ''; if (!lastUserQuery.trim()) return true; const allowHints = /\b(manufactur(e|ing)?|cnc|robot(ic|ics)?|weld(er|ing)?|machin(e|ist|ing)?|apprentice(ship)?s?|factory|plant|quality|maintenance|mechatronic|additive|3d\s*print|bls|o\*?net|program|community\s*college|trade\s*school|career|salary|pay|job|skill|training|near me|local|in my area|how much|what is|tell me about|nims|certificat(e|ion)s?|aws|osha|pmmi|cmrt|cmrp|cqi|cqt|cltd|cscp|camf|astm|asq|gd&t|plc|cad|cam)\b/i; if (allowHints.test(lastUserQuery)) { console.log(`[Domain Guard] Query matched allowHints regex: "${lastUserQuery}" -> IN`); return true; } const contextMessages = messages.slice(-4); const contextQuery = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n'); if (messages.filter(m => m.role === 'user').length === 1) { console.log(`[Domain Guard] First user message failed allowHints regex, considered OUT: "${lastUserQuery}"`); return false; } console.log(`[Domain Guard] Query failed allowHints regex, proceeding to LLM check: "${lastUserQuery}"`); const systemPrompt = `Analyze the conversation context below... (rest unchanged)`; try { const res = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0, messages: [{ role: 'system', content: systemPrompt }], max_tokens: 5 }); const out = res.choices[0]?.message?.content?.trim().toUpperCase(); console.log(`[Domain Guard] LLM Check Result -> ${out} (Based on last query: "${lastUserQuery}")`); return out === 'IN'; } catch (error) { console.error("[Domain Guard] Error during LLM check:", error); return true; }
}

// --- Base Answer Generation (Unchanged) ---
async function answerLocal(messages: Message[], location?: string): Promise<string> { /* ... (unchanged) ... */
    const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }]; if (location) msgs.push({ role: 'system', content: `User location: ${location}` }); msgs.push(...messages); try { const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.3, messages: msgs }); return res.choices[0]?.message?.content ?? ''; } catch (error) { console.error("Error calling OpenAI for local answer:", error); return "Sorry, I encountered an issue generating a response."; }
}

// --- MODIFICATION START: Updated needsInternetRag logic ---
/**
 * Decides if an Internet RAG search is needed based on query type and location presence.
 * checkOnly flag allows peeking if web *would* be needed if location *was* present.
 */
async function needsInternetRag(messageContent: string, location?: string | null, checkOnly: boolean = false): Promise<boolean> {
    const contentLower = messageContent.toLowerCase().trim();
    let skipReason = "";
    let requireReason = "";

    // 1. Skip if it's the overview prompt
    const isOverviewPrompt = /Give a student-friendly overview.*Use these sections.*🔎\s*Overview/i.test(contentLower);
    if (isOverviewPrompt) {
        skipReason = "Message is overview prompt structure";
    }

    // 2. Skip for simple definitions only if not overview
    if (!skipReason) {
        // More specific regex: requires term after "what is/define/explain"
        const definitionalMatch = contentLower.match(/^(what is|what's|define|explain)\s+(a|an|the)?\s*([\w\s\-]{3,})\??$/i);
        if (definitionalMatch) {
             const term = definitionalMatch[3].trim();
             skipReason = `Detected definitional query for "${term}"`;
        }
    }

    // If already decided to skip, log and return false
    if (skipReason) {
        if (!checkOnly) console.log(`[needsInternetRag] Skipping web because: ${skipReason}. -> FALSE`);
        return false;
    }

    // --- RAG Decision Rubric ---
    // Queries that MANDATE web search IF location is present or implied,
    // OR if location isn't needed (like general salary stats).

    // Local/Current keywords
    const isLocalQuery = /near me|local|in my area|nearby|\b\d{5}\b|\b[A-Z]{2}\b/i.test(contentLower) || !!location;
    const requiresLocalData = /\b(jobs?|openings?|hiring|apprenticeships?|programs?|training|tuition|start date|admission|employer|provider|scholarship)\b/i.test(contentLower);

    if (requiresLocalData) {
        if (isLocalQuery) {
            requireReason = "Query requires local data and location is present/implied.";
        } else {
             // If checkOnly is true, we assume location *would* be present.
             // If checkOnly is false, location is missing, handled by orchestrator's ask-for-location logic.
             if (checkOnly) {
                 requireReason = "[CheckOnly] Query requires local data (assuming location would be provided).";
             } else {
                 // This case should be caught by the orchestrator asking for location first.
                 // We shouldn't reach here in the main flow if location is needed but absent.
                 // If we *do*, skipping web might be safer than searching without location.
                 if (!checkOnly) console.log("[needsInternetRag] Query needs local data but location is missing (should have been caught earlier). Skipping web for safety. -> FALSE");
                 return false;
             }
        }
    }

    // Comparisons or prices
    if (!requireReason && /\b(compare|vs|price|cost|tuition)\b/i.test(contentLower)) {
        requireReason = "Query involves comparison or pricing.";
    }

    // Time-sensitive or Stats
    if (!requireReason && /\b(salary|pay|wage|statistic|bls|latest|trend)\b/i.test(contentLower)) {
        requireReason = "Query asks for salary, stats, or time-sensitive info.";
    }

    // Evergreen How-to (already handled by skipReason for definitions)
    // Model knowledge is generally OK here unless specific stats/comparisons are asked.

    // Default: If no skip reason and no specific require reason, still default to web search
    // for general exploration or less obvious cases.
    if (!requireReason) {
        requireReason = "Defaulting to web search for general query.";
    }

    if (!checkOnly) console.log(`[needsInternetRag] Reason: ${requireReason}. -> TRUE`);
    return true; // If we didn't skip, we require (or default to) web search.
}
// --- MODIFICATION END ---


// --- Web RAG Function (internetRagCSE - Unchanged) ---
async function internetRagCSE(query: string, location?: string, canonical?: string | null): Promise<string | null> { /* ... (unchanged - includes detailed logging) ... */
    console.log("--- [Web RAG] Entered ---"); let res: any; try { const baseQuery = (canonical && /salary|pay|wage|job|opening|program|training|certificate|skill|course/i.test(query)) ? `${canonical} ${query}` : query; let q = location ? `${baseQuery} near ${location}` : baseQuery; q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org -site:quora.com -site:pinterest.com'; if (/(salary|pay|wage|median|bls)/i.test(query)) { q += ' (site:bls.gov OR site:onetonline.org)'; } if (/(program|training|certificate|certification|community college|course)/i.test(query)) { q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org OR site:careeronestop.org)'; } if (/jobs?|openings?|hiring|apprenticeship/i.test(query)) { q += ' (site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs OR site:apprenticeship.gov)'; } console.log("[Web RAG] Executing CSE query:", q); try { res = await cseSearch(q); } catch (cseError: any) { console.error("[Web RAG] Error DURING cseSearch call:", cseError); console.log("--- [Web RAG] Exiting: cseSearch error ---"); return null; } const items: any[] = Array.isArray(res?.items) ? res.items : []; if (!items.length) { console.log("[Web RAG] CSE Search returned no items."); console.log("--- [Web RAG] Exiting: No search items ---"); return null; } const pages = ( await Promise.all( items.slice(0, 3).map(async (it: any, index: number) => { const url: string | undefined = it.url || it.link; if (!url || !url.startsWith('http')) { console.log(`[Web RAG] Skipping item ${index+1}: Invalid URL: ${url}`); return null; } try { const doc = await fetchReadable(url); if (doc && doc.text) { console.log(`[Web RAG] Fetched/Parsed item ${index+1}: ${url}`); return doc; } else { console.log(`[Web RAG] Failed get readable text item ${index+1}: ${url}`); return null; } } catch (fetchErr) { console.warn(`[Web RAG] Error fetching item ${index+1} (${url}):`, fetchErr); return null; } }) )).filter(Boolean) as Array<{ title: string; url: string; text: string }>; if (!pages.length) { console.log("[Web RAG] No pages fetchable/parsable."); console.log("--- [Web RAG] Exiting: No fetchable pages ---"); return null; } const context = pages.map((p, i) => `[#${i + 1}] Title: ${p.title}\nURL: ${p.url}\nContent:\n${p.text.slice(0, 3000)}\n---`).join('\n\n'); const sys = `${COACH_SYSTEM_WEB_RAG}`; const prompt = `User question: ${query} ${location ? `(Location: ${location})` : ''}\n\nRAG Context:\n---\n${context}\n---\n\nAnswer user question based *only* on context. Cite sources like [#1], [#2].`; try { console.log("[Web RAG] Synthesizing results with LLM."); const out = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.25, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }]}); let answer = out.choices[0]?.message?.content ?? ''; if (!answer.trim()) { console.log("[Web RAG] LLM synthesis empty."); console.log("--- [Web RAG] Exiting: Empty synthesis ---"); return null; } answer = answer.replace(/\[#(\d+)\](?!\()/g, (match, num) => { const p = pages[parseInt(num)-1]; return p ? `[#${num}](${p.url})` : match; }); const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s); const sourcesMd = '\n\n**Sources**\n' + pages.map((p, i) => `${i + 1}. [${trunc(p.title || p.url, 80)}](${p.url})`).join('\n'); console.log("[Web RAG] Synthesis successful."); console.log("--- [Web RAG] Exiting successfully ---"); return answer + sourcesMd; } catch (error) { console.error("[Web RAG] Error during synthesis LLM call:", error); console.log("--- [Web RAG] Exiting: Synthesis error ---"); return null; } } catch (outerError: any) { console.error("[Web RAG] Unexpected error:", outerError); console.log("--- [Web RAG] Exiting: Unexpected error ---"); return null; }
}


// --- MODIFICATION START: Updated Followup Generation Prompt ---
async function generateFollowups(question: string, answer: string, location?: string): Promise<string[]> {
    let finalFollowups: string[] = [];
    try {
        // Updated prompt incorporating scoring implicitly
        const systemPrompt = `You are an assistant that generates relevant follow-up suggestions for a career coach chatbot.
Based on the user's question and the AI's answer, generate a JSON object with a key "followups" containing an array of exactly 3 HIGH-QUALITY follow-up prompts.

**Quality Criteria (Internal Scoring - Aim for score >= 2):**
* **Topicality (Score 0-1):** Is it directly related to the user's last query or the specific details in the AI's answer? (1=Yes, 0=No/Generic)
* **Actionability (Score 0-1):** Does it help the student move forward (explore roles, compare programs, prepare, find specifics)? (1=Yes, 0=No/Passive)
* **Specificity (Score 0-1):** Does it mention a concrete role, metro, program type, skill, or timeframe discussed? (1=Yes, 0=No/Abstract)

**RULES:**
1.  Prioritize prompts scoring 2 or 3 based on the criteria above.
2.  Prompts MUST be short phrases or titles (e.g., "Compare CNC vs Welding Pay").
3.  AVOID generic prompts like "Want more info?", "Anything else?", "Ask another question".
4.  AVOID simple yes/no questions.
5.  Ensure variety; don't suggest three very similar things.
6.  Return ONLY the JSON object. Example: {"followups": ["Find local CNC certificates", "Compare CNC Operator vs Maintenance Tech", "Prep for CNC interview"]}`;

        const userMessage = `User Question: "${question}"
AI Answer: "${answer}"
${location ? `User Location: "${location}"` : ''}

Generate JSON object with 3 high-quality followups:`;

        console.log("[Followups] Calling gpt-4o for followups with scoring criteria.");
        const res = await openai.chat.completions.create({
            model: 'gpt-4o', // Use capable model for complex instructions
            temperature: 0.5,
            response_format: { type: "json_object" },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
        ],});
        const raw = res.choices[0]?.message?.content ?? '{"followups": []}';
        const parsed = JSON.parse(raw);
        if (parsed.followups && Array.isArray(parsed.followups) && parsed.followups.length > 0) {
            finalFollowups = parsed.followups;
            console.log("[Followups] Generated:", finalFollowups);
        } else {
            console.warn("[Followups] Failed to parse valid followups:", raw);
        }
    } catch (error) {
        console.error("[Followups] Error generating follow-ups:", error);
    }

    // Fallback logic
    if (finalFollowups.length > 0) {
        return sanitizeFollowups(finalFollowups); // Apply sanitization (length limit, dedup)
    } else {
        console.warn("[Followups] Falling back to defaults for question:", question);
        return defaultFollowups();
    }
}
// --- MODIFICATION END ---


// --- Sanitization and Defaults (Unchanged) ---
function sanitizeFollowups(arr: any[]): string[] {
    const MAX_LEN = 65; // Slightly increased length limit
    const MAX_PROMPTS = 3; // Enforce max 3 from prompt
    return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
     .map((s) => {
        let t = s.trim();
        // Remove trailing punctuation only if it's a period or question mark
        if (t.endsWith('.') || t.endsWith('?')) {
            t = t.slice(0, -1);
        }
        return t.slice(0, MAX_LEN); // Apply length limit
    })
    .filter((s, index, self) => self.map(v => v.toLowerCase()).indexOf(s.toLowerCase()) === index) // Case-insensitive deduplication
    .slice(0, MAX_PROMPTS); // Limit final count
}

function defaultFollowups(): string[] {
    // Keep defaults concise and relevant
    return [
        'Find local apprenticeships',
        'Explore training programs',
        'Compare typical salaries (BLS)',
    ].slice(0, 3); // Max 3 defaults
}
