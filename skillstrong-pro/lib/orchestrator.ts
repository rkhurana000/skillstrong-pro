// /lib/orchestrator.ts
import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search';
import { findFeaturedMatching } from '@/lib/marketplace';

export type Role = 'system' | 'user' | 'assistant';
export interface Message { role: Role; content: string }
export interface OrchestratorInput { messages: Message[]; location?: string | null }
export interface OrchestratorOutput { answer: string; followups: string[] }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- MODIFICATION START: Strengthened COACH_SYSTEM Prompt ---
const COACH_SYSTEM = `You are "Coach Mach," a friendly, practical AI guide helping U.S. students discover hands-on, well-paid manufacturing careers that DO NOT require a 4-year degree.

**Your Mission:** Provide encouraging, clear, and actionable advice on vocational paths in modern manufacturing (e.g., CNC, robotics, welding, maintenance, quality, additive).

**Output Format:** Respond with Markdown, using short paragraphs and bullet points.

**Non-Negotiable Rules:**
1.  **Prioritize RAG Context:** Your system context may contain "Web Results" (with citations [#1], [#2]...) and potentially a "**Sources**" list, plus "SkillStrong Search" links. **You MUST prioritize using the "Web Results" context to construct the main body of your answer.**
    * **If "Web Results" are provided:** Synthesize your answer *directly* from this text. You MUST include the inline citations (e.g., [#1]) exactly as they appear in the provided context. Do NOT remove or alter them.
    * **If "Web Results" are NOT provided OR if context says "INFO: ... found no specific results":** Answer based on your general knowledge but clearly state that you couldn't find specific web information for the query.
2.  **Preserve Sources Section:** If the provided context includes a markdown section starting with "**Sources**", you MUST include that *entire section* (heading and list) verbatim at the end of your main answer body (before "Next Steps"). Do NOT omit or modify it.
3.  **Append SkillStrong Links:** *After* your main answer (and after the "**Sources**" section, if present), append the *entire* "### 🛡️ SkillStrong Search" markdown block **only if it was provided** in the system context. Use the exact markdown links.
4.  **Handle No Results Info:** If context explicitly says "INFO: ... searches ... found no specific results", clearly inform the user you couldn't find specific web/local info and provide a general answer or alternative suggestions.
5.  **Audience Fit (≤2 Years Training):** ONLY recommend roles/programs requiring ≤2 years training (certs, apprenticeships, AAS). Suggest tech/technologist paths instead of 4-year engineering degrees.
6.  **Truthfulness:** Rely *only* on provided "Web Results" for current facts (salaries, openings, local specifics). Do not invent data. If unsure or lacking RAG, state that.
7.  **Geography:** Prioritize nearby options if location is known and RAG provides local info. If a local search is needed but location is missing, your ONLY response MUST be: "To find local results, please set your location using the button in the header." (empty followups).
8.  **Accessibility & Tone:** Avoid jargon (explain if needed). Be supportive and encouraging.
9.  **Single Next Steps:** Add ONE concise 'Next Steps' section at the very end of your *entire* response.
10. **No Chain-of-Thought:** Do not reveal internal reasoning.`;
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


// --- Orchestrate Function (Unchanged) ---
export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const originalMessages = input.messages; const lastUserRaw = [...originalMessages].reverse().find(m => m.role === 'user')?.content ?? ''; const isFirstUserMessage = originalMessages.filter(m => m.role === 'user').length === 1; const canonical = detectCanonicalCategory(lastUserRaw); let messagesForLLM = [...originalMessages]; let messageContentForRAGDecision = lastUserRaw; let overviewActuallyUsed = false; if (canonical && isFirstUserMessage) { const seedPrompt = buildOverviewPrompt(canonical); messagesForLLM[messagesForLLM.length - 1] = { role: 'user', content: seedPrompt }; messageContentForRAGDecision = seedPrompt; overviewActuallyUsed = true; console.log("[Orchestrate] Using overview prompt for LLM input. Category:", canonical); }
  const inDomain = await domainGuard(originalMessages); if (!inDomain) { console.log("[Orchestrate] Domain Guard: OUT OF DOMAIN for query:", lastUserRaw); return { answer:'I focus on modern manufacturing careers...', followups: defaultFollowups(), }; } console.log("[Orchestrate] Domain Guard: IN DOMAIN for query:", lastUserRaw);
  const isLocalQuery = /near me|local|in my area|nearby|\b\d{5}\b|[A-Z]{2}\b/i.test(lastUserRaw) || /\b(jobs?|openings?|hiring|apprenticeships?|programs?|training|tuition|start date|admission|employer|provider|scholarship)\b/i.test(lastUserRaw.toLowerCase()); if (isLocalQuery && !input.location) { console.log("[Orchestrate] Local query detected but location is missing. Asking user."); return { answer: "To find local results, please set your location using the button in the header.", followups: [] }; }
  const internalRAG = await queryInternalDatabase(lastUserRaw, input.location ?? undefined);
  const needWeb = await needsInternetRag(messageContentForRAGDecision); console.log(`[Orchestrate] Decision: needsInternetRag = ${needWeb}`);
  let webAnswer = null; if (needWeb) { console.log(`[Orchestrate] Proceeding with Web Search for original query: "${lastUserRaw}"`); try { webAnswer = await internetRagCSE(lastUserRaw, input.location ?? undefined, canonical); if (webAnswer) console.log("[Orchestrate] Web RAG successful."); else console.log("[Orchestrate] Web RAG returned no usable content."); } catch (webRagError: any) { console.error("[Orchestrate] Error during Web RAG call:", webRagError); webAnswer = null; } } else { console.log(`[Orchestrate] Skipping Web Search.`); }
  let combinedContext = ''; if (webAnswer) { const webHeading = internalRAG ? "**Related Web Results:**" : "**Web Search Results:**"; combinedContext += `${webHeading}\n${webAnswer}\n\n`; } if (internalRAG) { combinedContext += internalRAG; } const wasSearchAttempted = needWeb || internalRAG !== ''; const noResultsFound = webAnswer === null && internalRAG === ''; if (wasSearchAttempted && noResultsFound && !overviewActuallyUsed) { combinedContext = `INFO: I performed a search based on the user's query ("${lastUserRaw}") but could not find specific results. Provide a general answer or suggest alternatives.`; console.log("[Orchestrate] Notifying LLM: All relevant searches failed or returned empty."); } else if (!combinedContext && overviewActuallyUsed) { console.log("[Orchestrate] No RAG context generated (Overview prompt used)."); } else if (!combinedContext) { console.log("[Orchestrate] No RAG context generated (Web search skipped/failed, no internal links triggered)."); }
  const messagesForFinalAnswer = [...messagesForLLM]; if (combinedContext) { messagesForFinalAnswer.push({ role: 'system', content: `Use the following search results to answer the user's query...\n\n${combinedContext}` }); console.log("[Orchestrate] Added combined RAG context to final LLM call."); } else { console.log("[Orchestrate] No RAG context added to final LLM call."); }
  const finalAnswer = await answerLocal(messagesForFinalAnswer, input.location ?? undefined); console.log("[Orchestrate] Generated final answer from LLM.");
  let finalAnswerWithFeatured = finalAnswer; try { const featured = await findFeaturedMatching(lastUserRaw, input.location ?? undefined); if (Array.isArray(featured) && featured.length > 0) { const locTxt = input.location ? ` near ${input.location}` : ''; const lines = featured.map((f) => `- **${f.title}** — ${f.org} (${f.location})`).join('\n'); if (!finalAnswerWithFeatured.includes('**Featured')) { finalAnswerWithFeatured += `\n\n**Featured${locTxt}:**\n${lines}`; console.log("[Orchestrate] Appended featured listings."); } } } catch (err) { console.error("[Orchestrate] Error fetching/appending featured items:", err); }
  const followups = await generateFollowups(lastUserRaw, finalAnswerWithFeatured, input.location ?? undefined); console.log("[Orchestrate] Generated followups."); return { answer: finalAnswerWithFeatured.trim(), followups };
}

// --- Domain Guard (Unchanged) ---
async function domainGuard(messages: Message[]): Promise<boolean> { /* ... (unchanged - strong regex first) ... */
    if (!messages.some(m => m.role === 'user')) return true; const lastUserMessage = messages[messages.length - 1]; if (lastUserMessage?.role !== 'user') return true; const lastUserQuery = lastUserMessage.content || ''; if (!lastUserQuery.trim()) return true; const allowHints = /\b(manufactur(e|ing)?|cnc|robot(ic|ics)?|weld(er|ing)?|machin(e|ist|ing)?|apprentice(ship)?s?|factory|plant|quality|maintenance|mechatronic|additive|3d\s*print|bls|o\*?net|program|community\s*college|trade\s*school|career|salary|pay|job|skill|training|near me|local|in my area|how much|what is|tell me about|nims|certificat(e|ion)s?|aws|osha|pmmi|cmrt|cmrp|cqi|cqt|cltd|cscp|camf|astm|asq|gd&t|plc|cad|cam)\b/i; if (allowHints.test(lastUserQuery)) { console.log(`[Domain Guard] Query matched allowHints regex: "${lastUserQuery}" -> IN`); return true; } const contextMessages = messages.slice(-4); const contextQuery = contextMessages.map(m => `${m.role}: ${m.content}`).join('\n\n'); if (messages.filter(m => m.role === 'user').length === 1) { console.log(`[Domain Guard] First user message failed allowHints regex, considered OUT: "${lastUserQuery}"`); return false; } console.log(`[Domain Guard] Query failed allowHints regex, proceeding to LLM check: "${lastUserQuery}"`); const systemPrompt = `Analyze the conversation context below... (rest is unchanged)`; try { const res = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0, messages: [{ role: 'system', content: systemPrompt }], max_tokens: 5 }); const out = res.choices[0]?.message?.content?.trim().toUpperCase(); console.log(`[Domain Guard] LLM Check Result -> ${out} (Based on last query: "${lastUserQuery}")`); return out === 'IN'; } catch (error) { console.error("[Domain Guard] Error during LLM check:", error); return true; }
}

// --- Base Answer Generation (Unchanged) ---
async function answerLocal(messages: Message[], location?: string): Promise<string> { /* ... (unchanged) ... */
    const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }]; if (location) msgs.push({ role: 'system', content: `User location: ${location}` }); msgs.push(...messages); try { const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.3, messages: msgs }); return res.choices[0]?.message?.content ?? ''; } catch (error) { console.error("Error calling OpenAI for local answer:", error); return "Sorry, I encountered an issue generating a response."; }
}

// --- needsInternetRag (Unchanged) ---
async function needsInternetRag(messageContent: string): Promise<boolean> { /* ... (unchanged - skips overview & definitions) ... */
    const contentLower = messageContent.toLowerCase().trim(); let skipReason = ""; const isOverviewPrompt = /Give a student-friendly overview.*Use these sections.*🔎\s*Overview/i.test(contentLower); if (isOverviewPrompt) { skipReason = "Message is overview prompt structure"; } if (!skipReason) { const isDefinitionalQuery = /^(what is|what's|define|explain)\b/i.test(contentLower); if (isDefinitionalQuery) { skipReason = "Detected definitional query"; } } if (skipReason) { console.log(`[needsInternetRag] Skipping web because: ${skipReason}. -> FALSE`); return false; } else { console.log("[needsInternetRag] Query is not overview or definition, proceeding with web search. -> TRUE"); return true; }
}


// --- Web RAG Function (internetRagCSE - Unchanged) ---
async function internetRagCSE(query: string, location?: string, canonical?: string | null): Promise<string | null> { /* ... (unchanged - includes detailed logging) ... */
    console.log("--- [Web RAG] Entered ---"); let res: any; try { const baseQuery = (canonical && /salary|pay|wage|job|opening|program|training|certificate|skill|course/i.test(query)) ? `${canonical} ${query}` : query; let q = location ? `${baseQuery} near ${location}` : baseQuery; q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org -site:quora.com -site:pinterest.com'; if (/(salary|pay|wage|median|bls)/i.test(query)) { q += ' (site:bls.gov OR site:onetonline.org)'; } if (/(program|training|certificate|certification|community college|course)/i.test(query)) { q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org OR site:careeronestop.org)'; } if (/jobs?|openings?|hiring|apprenticeship/i.test(query)) { q += ' (site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs OR site:apprenticeship.gov)'; } console.log("[Web RAG] Executing CSE query:", q); try { res = await cseSearch(q); } catch (cseError: any) { console.error("[Web RAG] Error DURING cseSearch call:", cseError); console.log("--- [Web RAG] Exiting: cseSearch error ---"); return null; } const items: any[] = Array.isArray(res?.items) ? res.items : []; if (!items.length) { console.log("[Web RAG] CSE Search returned no items."); console.log("--- [Web RAG] Exiting: No search items ---"); return null; } const pages = ( await Promise.all( items.slice(0, 3).map(async (it: any, index: number) => { const url: string | undefined = it.url || it.link; if (!url || !url.startsWith('http')) { console.log(`[Web RAG] Skipping item ${index+1}: Invalid URL: ${url}`); return null; } try { const doc = await fetchReadable(url); if (doc && doc.text) { console.log(`[Web RAG] Fetched/Parsed item ${index+1}: ${url}`); return doc; } else { console.log(`[Web RAG] Failed get readable text item ${index+1}: ${url}`); return null; } } catch (fetchErr) { console.warn(`[Web RAG] Error fetching item ${index+1} (${url}):`, fetchErr); return null; } }) )).filter(Boolean) as Array<{ title: string; url: string; text: string }>; if (!pages.length) { console.log("[Web RAG] No pages fetchable/parsable."); console.log("--- [Web RAG] Exiting: No fetchable pages ---"); return null; } const context = pages.map((p, i) => `[#${i + 1}] Title: ${p.title}\nURL: ${p.url}\nContent:\n${p.text.slice(0, 3000)}\n---`).join('\n\n'); const sys = `${COACH_SYSTEM_WEB_RAG}`; const prompt = `User question: ${query} ${location ? `(Location: ${location})` : ''}\n\nRAG Context:\n---\n${context}\n---\n\nAnswer user question based *only* on context. Cite sources like [#1], [#2].`; try { console.log("[Web RAG] Synthesizing results with LLM."); const out = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.25, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }]}); let answer = out.choices[0]?.message?.content ?? ''; if (!answer.trim()) { console.log("[Web RAG] LLM synthesis empty."); console.log("--- [Web RAG] Exiting: Empty synthesis ---"); return null; } answer = answer.replace(/\[#(\d+)\](?!\()/g, (match, num) => { const p = pages[parseInt(num)-1]; return p ? `[#${num}](${p.url})` : match; }); const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s); const sourcesMd = '\n\n**Sources**\n' + pages.map((p, i) => `${i + 1}. [${trunc(p.title || p.url, 80)}](${p.url})`).join('\n'); console.log("[Web RAG] Synthesis successful."); console.log("--- [Web RAG] Exiting successfully ---"); return answer + sourcesMd; } catch (error) { console.error("[Web RAG] Error during synthesis LLM call:", error); console.log("--- [Web RAG] Exiting: Synthesis error ---"); return null; } } catch (outerError: any) { console.error("[Web RAG] Unexpected error:", outerError); console.log("--- [Web RAG] Exiting: Unexpected error ---"); return null; }
}


// --- Followup Generation (Unchanged - uses gpt-4o and scoring prompt) ---
async function generateFollowups(question: string, answer: string, location?: string): Promise<string[]> { /* ... (unchanged) ... */
    let finalFollowups: string[] = []; try { const systemPrompt = `You are an assistant that generates relevant follow-up suggestions for a career coach chatbot... (rest unchanged)`; const userMessage = `User Question: "${question}"\nAI Answer: "${answer}"\n${location ? `User Location: "${location}"` : ''}\n\nGenerate JSON object with 3 high-quality followups:`; console.log("[Followups] Calling gpt-4o for followups with scoring criteria."); const res = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.5, response_format: { type: "json_object" }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage },],}); const raw = res.choices[0]?.message?.content ?? '{"followups": []}'; const parsed = JSON.parse(raw); if (parsed.followups && Array.isArray(parsed.followups) && parsed.followups.length > 0) { finalFollowups = parsed.followups; console.log("[Followups] Generated:", finalFollowups); } else { console.warn("[Followups] Failed to parse valid followups:", raw); } } catch (error) { console.error("[Followups] Error generating follow-ups:", error); } if (finalFollowups.length > 0) { return sanitizeFollowups(finalFollowups); } else { console.warn("[Followups] Falling back to defaults for question:", question); return defaultFollowups(); }
}


// --- Sanitization and Defaults (Unchanged) ---
function sanitizeFollowups(arr: any[]): string[] { /* ... (unchanged) ... */
    const MAX_LEN = 65; const MAX_PROMPTS = 3; return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) .map((s) => { let t = s.trim(); if (t.endsWith('.') || t.endsWith('?')) { t = t.slice(0, -1); } return t.slice(0, MAX_LEN); }) .filter((s, index, self) => self.map(v => v.toLowerCase()).indexOf(s.toLowerCase()) === index) .slice(0, MAX_PROMPTS);
}

function defaultFollowups(): string[] { /* ... (unchanged) ... */
    return [ 'Find local apprenticeships', 'Explore training programs', 'Compare typical salaries (BLS)', ].slice(0, 3);
}
