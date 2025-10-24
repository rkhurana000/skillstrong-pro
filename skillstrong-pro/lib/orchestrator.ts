// /lib/orchestrator.ts
import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search'; // Ensure cseSearch handles its own env key errors
import { findFeaturedMatching } from '@/lib/marketplace'; // Removed unused searchJobs/Programs here

export type Role = 'system' | 'user' | 'assistant';
export interface Message { role: Role; content: string }
export interface OrchestratorInput { messages: Message[]; location?: string | null }
export interface OrchestratorOutput { answer: string; followups: string[] }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System prompt instructing the AI on blending RAG results
const COACH_SYSTEM = `You are "Coach Mach," an expert AI career coach for SkillStrong.

**Your Mission:** Guide users to discover well-paid, hands-on vocational careers in US manufacturing.

**Your Persona:** Encouraging, clear, practical, action-oriented (use bullets, short paragraphs).

**Core Rules:**
1.  **Synthesize All RAG:** Your system context may contain search results. You MUST use this context to answer the user's query. The context can have two parts:
    * \`### 🛡️ SkillStrong Search\`: Links to our internal job/program search. Include this *entire* block **only if it's provided** in the system context for this turn.
    * \`**Related Web Results:**\` (or \`**Web Search Results:**\`): From general internet searches (BLS, .edu, etc.). Use this for the main body of your answer.
2.  **Blend Results:** Base your primary answer on "Web Results" (citing sources like [#1]). *After* that main answer, append the "SkillStrong Search" block **if it was provided**.
3.  **Handle No Results:** If context says "INFO: ... searches ... found no specific results", inform the user and give a general answer.
4.  **Prioritize Links:** Use the *exact markdown links* provided in the context.
5.  **Vocational Filter:** Focus on roles needing ≤2 years training (certs, apprenticeships, AAS). Offer tech/technologist paths instead of 4-year engineering degrees.
6.  **Single Next Steps:** Add ONE concise 'Next Steps' section at the very end.
7.  **Stay on Topic:** Strictly US manufacturing careers.
8.  **No Hallucinations:** Never invent URLs, stats, etc. Cite web sources or state uncertainty.`;

// System prompt for the web RAG synthesis step
const COACH_SYSTEM_WEB_RAG = `You are "Coach Mach," synthesizing web search results about US manufacturing vocational careers.
**Core Rules:**
1.  **Use Context Only:** Base your answer *strictly* on the provided 'RAG Context'.
2.  **Cite Sources:** Cite sources in-line as [#1], [#2]. Use only the provided URLs.
3.  **Strict Relevance Filter:** Answer *only* the specific user question, filtering context for relevant manufacturing vocational roles (technicians, operators, etc.).
4.  **Stay on Topic:** US manufacturing vocational careers only.
5.  **No Hallucinations:** Do not invent information or URLs.
6.  **Concise:** Use bullets. Do NOT add 'Next Steps'.`;


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
    const text = (query || '').toLowerCase(); for (const [canonical, syns] of Object.entries(CATEGORY_SYNONYMS)) { for (const s of syns) { const re = new RegExp(`\\b${escapeRegExp(s)}\\b`, 'i'); if (re.test(text)) return canonical; } } return null;
}
// Generates the structured overview prompt
function buildOverviewPrompt(canonical: string): string {
    return `Give a student-friendly overview of the **${canonical}** career. Use these sections with emojis and bullet points only:\n\n🔎 **Overview**...\n🧭 **Day-to-Day**...\n🧰 **Tools & Tech**...\n🧠 **Core Skills**...\n💰 **Typical Pay (US)**...\n⏱️ **Training Time**...\n📜 **Helpful Certs**...\n\nKeep it concise and friendly. Do **not** include local programs, openings, or links in this message.`;
}

// --- URL Domain Helper (Unchanged) ---
function getDomain(url: string | null | undefined): string | null {
    if (!url) return null; try { const host = new URL(url).hostname; return host.replace(/^www\./, ''); } catch { return null; }
}

// --- Internal Database Link Generation (Generates links, strictly gated) ---
async function queryInternalDatabase(query: string, location?: string): Promise<string> {
  const lowerQuery = query.toLowerCase();
  // Stricter check for explicit keywords + location
  const needsJobs = /\b(jobs?|openings?|hiring|apprenticeships?)\b/i.test(lowerQuery);
  const needsPrograms = /\b(programs?|training|certificates?|courses?|schools?|college)\b/i.test(lowerQuery);
  const hasLocationSpecifier = /near me|local|in my area|nearby/i.test(lowerQuery) || !!location || /\b\d{5}\b/.test(query) || /\b[A-Z]{2}\b/.test(query);

  if (!((needsJobs || needsPrograms) && hasLocationSpecifier)) {
      console.log("[Internal RAG] Skipping: Query lacks specific job/program keywords or location.");
      return ''; // *** KEY: Only return links if keywords AND location present ***
  }

  console.log("[Internal RAG] Generating internal search links.");
  // Clean search term (remove triggers and location phrases)
  let searchTerm = query
    .replace(/near me|local|in my area|nearby/gi, '')
    .replace(/\b(jobs?|openings?|hiring|apprenticeships?)\b/gi, '')
    .replace(/\b(programs?|training|certificates?|courses?|schools?|college)\b/gi, '')
    .replace(/in\s+([A-Za-z\s]+,\s*[A-Z]{2}|\d{5}|[A-Z]{2})\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Refine search term if too generic after cleaning
  if (searchTerm.length < 3 || searchTerm.toLowerCase() === 'find' || searchTerm.toLowerCase() === 'search') {
      const detectedCategory = detectCanonicalCategory(query);
      searchTerm = detectedCategory || "relevant"; // Use category or fallback
      console.log(`[Internal RAG] Using term "${searchTerm}" for link text.`);
  } else {
       console.log(`[Internal RAG] Using cleaned term "${searchTerm}" for link text.`);
  }

  // Build query params
  const params = new URLSearchParams();
  if (searchTerm !== "relevant") params.set('q', searchTerm);
  if (location) { /* ... (location parsing logic unchanged) ... */
        const parts = location.split(',').map(s => s.trim()).filter(Boolean); if (parts.length === 2 && parts[1].length === 2 && parts[1] === parts[1].toUpperCase()) { params.set('city', parts[0]); params.set('state', parts[1]); } else if (parts.length === 1) { const part = parts[0]; if (part.length === 2 && part === part.toUpperCase()) params.set('state', part); else if (part.match(/^\d{5}$/)) params.set('city', part); else params.set('city', part); }
  }
  const queryString = params.toString();

  // Generate links
  let links: string[] = [];
  const linkQueryText = searchTerm !== "relevant" ? ` for "${searchTerm}"` : "";
  if (needsJobs) links.push(`* [Search all **jobs**${linkQueryText} on SkillStrong](/jobs/all?${queryString})`);
  if (needsPrograms) links.push(`* [Search all **programs**${linkQueryText} on SkillStrong](/programs/all?${queryString})`);

  if (links.length > 0) {
    return `### 🛡️ SkillStrong Search
You can also search our internal database directly:
${links.join('\n')}`;
  }
  console.log("[Internal RAG] No relevant links generated despite matching criteria."); // Should be rare
  return '';
}


// --- Orchestrate Function ---
export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const originalMessages = input.messages;
  const lastUserRaw = [...originalMessages].reverse().find(m => m.role === 'user')?.content ?? '';
  const isFirstUserMessage = originalMessages.filter(m => m.role === 'user').length === 1;
  const canonical = detectCanonicalCategory(lastUserRaw);

  let messagesForLLM = [...originalMessages]; // History sent to final LLM call
  let messageContentForRAGDecision = lastUserRaw; // Content used to decide if RAG runs
  let overviewActuallyUsed = false; // Flag if overview prompt replaced user query

  // Check if we should use the overview prompt instead of the user's raw query
  if (canonical && isFirstUserMessage) {
        const seedPrompt = buildOverviewPrompt(canonical);
        messagesForLLM[messagesForLLM.length - 1] = { role: 'user', content: seedPrompt }; // Replace last msg for LLM
        messageContentForRAGDecision = seedPrompt; // Use seed prompt content for RAG decision
        overviewActuallyUsed = true;
        console.log("[Orchestrate] Using overview prompt for LLM input. Category:", canonical);
  }

  // 1. Domain Guard (Based on original user query)
  const inDomain = await domainGuard(originalMessages);
  if (!inDomain) {
       console.log("[Orchestrate] Domain Guard: OUT OF DOMAIN for query:", lastUserRaw);
       return { answer:'I focus on modern manufacturing careers...', followups: defaultFollowups(), };
  }
  console.log("[Orchestrate] Domain Guard: IN DOMAIN for query:", lastUserRaw);

  // 2. Generate Internal RAG Links (Based on original user query)
  // This runs *regardless* of web RAG decision, but is only added if needed.
  const internalRAG = await queryInternalDatabase(lastUserRaw, input.location ?? undefined);

  // 3. Decide if Web RAG is needed (Based on content being processed - could be overview prompt)
  const needWeb = await needsInternetRag(messageContentForRAGDecision);
  console.log(`[Orchestrate] Decision: needsInternetRag = ${needWeb}`);

  // 4. Perform Web RAG if needed
  let webAnswer = null;
  if (needWeb) {
      console.log(`[Orchestrate] Proceeding with Web Search for original query: "${lastUserRaw}"`);
      try {
          webAnswer = await internetRagCSE(lastUserRaw, input.location ?? undefined, canonical); // Always use original query for search
          if (webAnswer) console.log("[Orchestrate] Web RAG successful.");
          else console.log("[Orchestrate] Web RAG returned no usable content.");
      } catch (webRagError: any) {
          console.error("[Orchestrate] Error during Web RAG call:", webRagError);
          webAnswer = null; // Ensure null on error
      }
  } else {
      console.log(`[Orchestrate] Skipping Web Search.`);
  }

  // 5. Combine Context for Final LLM Call
  let combinedContext = '';
  // *** ORDER MATTERS: Web results first, then internal links ***
  if (webAnswer) {
      // Use web heading based on whether internal links will also be present
      const webHeading = internalRAG ? "**Related Web Results:**" : "**Web Search Results:**";
      combinedContext += `${webHeading}\n${webAnswer}\n\n`; // Add extra newline
  }
  if (internalRAG) {
      combinedContext += internalRAG; // Add internal links block if generated
  }

  // Check if searches were attempted but failed
  const wasSearchAttempted = needWeb || internalRAG !== ''; // Simplified: Was web needed OR internal links generated?
  const noResultsFound = webAnswer === null && internalRAG === ''; // Both failed/skipped AND internal returned empty

  if (wasSearchAttempted && noResultsFound && !overviewActuallyUsed) { // Avoid this message if it was just an overview prompt
     combinedContext = `INFO: I performed a search based on the user's query ("${lastUserRaw}") but could not find specific results. Provide a general answer or suggest alternatives.`;
     console.log("[Orchestrate] Notifying LLM: All relevant searches failed or returned empty.");
  } else if (!combinedContext && overviewActuallyUsed) {
     console.log("[Orchestrate] No RAG context generated (Overview prompt used).");
  } else if (!combinedContext) {
     console.log("[Orchestrate] No RAG context generated (Web search skipped/failed, no internal links triggered).");
  }

  // 6. Build Message List for Final LLM Call
  // Use the history that might contain the overview prompt replacement
  const messagesForFinalAnswer = [...messagesForLLM];
  if (combinedContext) {
      messagesForFinalAnswer.push({ role: 'system', content: `Use the following search results to answer the user's query. You MUST follow the blending and citation rules from your main prompt.\n\n${combinedContext}` });
      console.log("[Orchestrate] Added combined RAG context to final LLM call.");
  } else {
      console.log("[Orchestrate] No RAG context added to final LLM call.");
  }

  // 7. Generate Final Answer
  const finalAnswer = await answerLocal(messagesForFinalAnswer, input.location ?? undefined);
  console.log("[Orchestrate] Generated final answer from LLM.");

  // 8. Add Featured Listings (Unchanged)
  let finalAnswerWithFeatured = finalAnswer;
  try { const featured = await findFeaturedMatching(lastUserRaw, input.location ?? undefined); if (Array.isArray(featured) && featured.length > 0) { const locTxt = input.location ? ` near ${input.location}` : ''; const lines = featured.map((f) => `- **${f.title}** — ${f.org} (${f.location})`).join('\n'); if (!finalAnswerWithFeatured.includes('**Featured')) { finalAnswerWithFeatured += `\n\n**Featured${locTxt}:**\n${lines}`; console.log("[Orchestrate] Appended featured listings."); } } } catch (err) { console.error("[Orchestrate] Error fetching/appending featured items:", err); }

  // 9. Generate Followups (Based on original query and final answer)
  const followups = await generateFollowups(lastUserRaw, finalAnswerWithFeatured, input.location ?? undefined);
  console.log("[Orchestrate] Generated followups.");

  return { answer: finalAnswerWithFeatured.trim(), followups };
}

// --- Domain Guard (Updated Regex) ---
async function domainGuard(messages: Message[]): Promise<boolean> {
    if (!messages.some(m => m.role === 'user')) return true;
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role !== 'user') return true;
    const lastUserQuery = lastUserMessage.content || '';
    if (!lastUserQuery.trim()) return true;

    // Stronger Regex including NIMS, Certifications, BLS, O*NET etc.
    const allowHints = /\b(manufactur(e|ing)?|cnc|robot(ic|ics)?|weld(er|ing)?|machin(e|ist|ing)?|apprentice(ship)?s?|factory|plant|quality|maintenance|mechatronic|additive|3d\s*print|bls|o\*?net|program|community\s*college|trade\s*school|career|salary|pay|job|skill|training|near me|local|in my area|how much|what is|tell me about|nims|certificat(e|ion)s?|aws|osha|pmmi|cmrt|cmrp|cqi|cqt|cltd|cscp|camf|astm|asq|gd&t|plc|cad|cam)\b/i;

    if (allowHints.test(lastUserQuery)) {
        console.log(`[Domain Guard] Query matched allowHints regex: "${lastUserQuery}" -> IN`);
        return true; // Pass if regex matches
    }

    // Only proceed to LLM check if regex *doesn't* match and it's not the first message
    const contextMessages = messages.slice(-4);
    const contextQuery = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    if (messages.filter(m => m.role === 'user').length === 1) {
        console.log(`[Domain Guard] First user message failed allowHints regex, considered OUT: "${lastUserQuery}"`);
        return false;
    }

    console.log(`[Domain Guard] Query failed allowHints regex, proceeding to LLM check: "${lastUserQuery}"`);
    const systemPrompt = `Analyze the conversation context below... (rest unchanged)`;
    try {
        const res = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0, messages: [{ role: 'system', content: systemPrompt }], max_tokens: 5 });
        const out = res.choices[0]?.message?.content?.trim().toUpperCase();
        console.log(`[Domain Guard] LLM Check Result -> ${out} (Based on last query: "${lastUserQuery}")`);
        return out === 'IN';
    } catch (error) {
        console.error("[Domain Guard] Error during LLM check:", error);
        return true; // Default to IN if LLM check fails
    }
}

// --- Base Answer Generation (Unchanged) ---
async function answerLocal(messages: Message[], location?: string): Promise<string> {
    const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }]; if (location) msgs.push({ role: 'system', content: `User location: ${location}` }); msgs.push(...messages); try { const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.3, messages: msgs }); return res.choices[0]?.message?.content ?? ''; } catch (error) { console.error("Error calling OpenAI for local answer:", error); return "Sorry, I encountered an issue generating a response."; }
}

// --- needsInternetRag (Updated Logic + Logging) ---
async function needsInternetRag(messageContent: string): Promise<boolean> {
    const contentLower = messageContent.toLowerCase().trim();
    let skipReason = "";

    // 1. Check if it's the overview prompt
    const isOverviewPrompt = /Give a student-friendly overview.*Use these sections.*🔎\s*Overview/i.test(contentLower);
    if (isOverviewPrompt) {
        skipReason = "Message is overview prompt structure";
    }

    // 2. Check for simple definitions only if not overview
    if (!skipReason) {
        const isDefinitionalQuery = /^(what is|what's|define|explain)\b/i.test(contentLower);
        if (isDefinitionalQuery) {
             skipReason = "Detected definitional query";
        }
    }

    // Log decision
    if (skipReason) {
        console.log(`[needsInternetRag] Skipping web because: ${skipReason}. -> FALSE`);
        return false;
    } else {
        console.log("[needsInternetRag] Query is not overview or definition, proceeding with web search. -> TRUE");
        return true;
    }
}


// --- Web RAG Function (internetRagCSE - Includes logs and error checks) ---
async function internetRagCSE(query: string, location?: string, canonical?: string | null): Promise<string | null> {
    console.log("--- [Web RAG] Entered ---"); let res: any; try { const baseQuery = (canonical && /salary|pay|wage|job|opening|program|training|certificate|skill|course/i.test(query)) ? `${canonical} ${query}` : query; let q = location ? `${baseQuery} near ${location}` : baseQuery; q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org -site:quora.com -site:pinterest.com'; if (/(salary|pay|wage|median|bls)/i.test(query)) { q += ' (site:bls.gov OR site:onetonline.org)'; } if (/(program|training|certificate|certification|community college|course)/i.test(query)) { q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org OR site:careeronestop.org)'; } if (/jobs?|openings?|hiring|apprenticeship/i.test(query)) { q += ' (site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs OR site:apprenticeship.gov)'; } console.log("[Web RAG] Executing CSE query:", q); try { res = await cseSearch(q); } catch (cseError: any) { console.error("[Web RAG] Error DURING cseSearch call:", cseError); console.log("--- [Web RAG] Exiting: cseSearch error ---"); return null; } const items: any[] = Array.isArray(res?.items) ? res.items : []; if (!items.length) { console.log("[Web RAG] CSE Search returned no items."); console.log("--- [Web RAG] Exiting: No search items ---"); return null; } const pages = ( await Promise.all( items.slice(0, 3).map(async (it: any, index: number) => { const url: string | undefined = it.url || it.link; if (!url || !url.startsWith('http')) { console.log(`[Web RAG] Skipping item ${index+1}: Invalid URL: ${url}`); return null; } try { const doc = await fetchReadable(url); if (doc && doc.text) { console.log(`[Web RAG] Fetched/Parsed item ${index+1}: ${url}`); return doc; } else { console.log(`[Web RAG] Failed get readable text item ${index+1}: ${url}`); return null; } } catch (fetchErr) { console.warn(`[Web RAG] Error fetching item ${index+1} (${url}):`, fetchErr); return null; } }) )).filter(Boolean) as Array<{ title: string; url: string; text: string }>; if (!pages.length) { console.log("[Web RAG] No pages fetchable/parsable."); console.log("--- [Web RAG] Exiting: No fetchable pages ---"); return null; } const context = pages.map((p, i) => `[#${i + 1}] Title: ${p.title}\nURL: ${p.url}\nContent:\n${p.text.slice(0, 3000)}\n---`).join('\n\n'); const sys = `${COACH_SYSTEM_WEB_RAG}`; const prompt = `User question: ${query} ${location ? `(Location: ${location})` : ''}\n\nRAG Context:\n---\n${context}\n---\n\nAnswer user question based *only* on context. Cite sources like [#1], [#2].`; try { console.log("[Web RAG] Synthesizing results with LLM."); const out = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.25, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }]}); let answer = out.choices[0]?.message?.content ?? ''; if (!answer.trim()) { console.log("[Web RAG] LLM synthesis empty."); console.log("--- [Web RAG] Exiting: Empty synthesis ---"); return null; } answer = answer.replace(/\[#(\d+)\](?!\()/g, (match, num) => { const p = pages[parseInt(num)-1]; return p ? `[#${num}](${p.url})` : match; }); const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s); const sourcesMd = '\n\n**Sources**\n' + pages.map((p, i) => `${i + 1}. [${trunc(p.title || p.url, 80)}](${p.url})`).join('\n'); console.log("[Web RAG] Synthesis successful."); console.log("--- [Web RAG] Exiting successfully ---"); return answer + sourcesMd; } catch (error) { console.error("[Web RAG] Error during synthesis LLM call:", error); console.log("--- [Web RAG] Exiting: Synthesis error ---"); return null; } } catch (outerError: any) { console.error("[Web RAG] Unexpected error:", outerError); console.log("--- [Web RAG] Exiting: Unexpected error ---"); return null; }
}


// --- Followup Generation (Unchanged - uses gpt-4o) ---
async function generateFollowups(question: string, answer: string, location?: string): Promise<string[]> {
    let finalFollowups: string[] = []; try { const systemPrompt = `You are an assistant that generates relevant follow-up suggestions... (rest unchanged)`; const userMessage = `User Question: "${question}"\nAI Answer: "${answer}"\n${location ? `User Location: "${location}"` : ''}\n\nJSON object with followups:`; console.log("[Followups] Calling gpt-4o for followups."); const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.5, response_format: { type: "json_object" }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage },],}); const raw = res.choices[0]?.message?.content ?? '{"followups": []}'; const parsed = JSON.parse(raw); if (parsed.followups && Array.isArray(parsed.followups) && parsed.followups.length > 0) { finalFollowups = parsed.followups; console.log("[Followups] Generated:", finalFollowups); } else { console.warn("[Followups] Failed to parse valid followups:", raw); } } catch (error) { console.error("[Followups] Error generating follow-ups:", error); } if (finalFollowups.length > 0) { return sanitizeFollowups(finalFollowups); } else { console.warn("[Followups] Falling back to defaults for question:", question); return defaultFollowups(); }
}


// --- Sanitization and Defaults (Unchanged) ---
function sanitizeFollowups(arr: any[]): string[] {
    const MAX_LEN = 55; const MAX_PROMPTS = 4; return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) .map((s) => { let t = s.trim(); /* Remove trailing . or ? */ if (t.endsWith('.') || t.endsWith('?')) { t = t.slice(0, -1); } return t.slice(0, MAX_LEN); }) .filter((s, index, self) => self.indexOf(s) === index) .slice(0, MAX_PROMPTS);
}

function defaultFollowups(): string[] {
    return [ 'Find paid apprenticeships near me', 'Local training programs', 'Typical salaries (BLS)', ].slice(0, 4);
}
