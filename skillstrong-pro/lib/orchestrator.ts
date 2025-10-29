// /lib/orchestrator.ts
import OpenAI from 'openai';
import { cseSearch, fetchReadable } from '@/lib/search';
import { findFeaturedMatching } from '@/lib/marketplace';

export type Role = 'system' | 'user' | 'assistant';
export interface Message {
  role: Role;
  content: string;
}
export interface OrchestratorInput {
  messages: Message[];
  location?: string | null;
}
export interface OrchestratorOutput {
  answer: string;
  followups: string[];
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- COACH_SYSTEM Prompt (Unchanged) ---
const COACH_SYSTEM = `You are "Coach Mach," a friendly, practical AI guide helping U.S. students discover hands-on, well-paid manufacturing careers that DO NOT require a 4-year degree.

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
9.  **Single Next Steps:** Add ONE concise 'Next Steps' section at the very end.
10. **No Chain-of-Thought:** Do not reveal internal reasoning.`;

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

// --- URL Domain Helper (Unchanged) ---
function getDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// --- MODIFICATION START: Internal Database Link Generation (Simplified) ---
async function queryInternalDatabase(
  query: string,
  location?: string
): Promise<string> {
  const lowerQuery = query.toLowerCase();
  // Check for trigger keywords
  const needsJobs = /\b(jobs?|openings?|hiring|apprenticeships?)\b/i.test(
    lowerQuery
  );
  const needsPrograms = /\b(programs?|training|certificates?|courses?|schools?|college)\b/i.test(
    lowerQuery
  );
  // Check for location mention (required to trigger)
  const hasLocationSpecifier =
    /near me|local|in my area|nearby/i.test(lowerQuery) ||
    !!location ||
    /\b\d{5}\b/.test(query) ||
    /\b[A-Z]{2}\b/.test(query);

  // --- TRIGGER GUARD ---
  // Must ask for jobs/programs AND mention a location to proceed
  if (!((needsJobs || needsPrograms) && hasLocationSpecifier)) {
    console.log(
      '[Internal RAG] Skipping: Query lacks specific job/program keywords or location.'
    );
    return '';
  }

  console.log('[Internal RAG] Generating internal search links (no query).');

  let links: string[] = [];
  
  // Per your request, links are now hardcoded to the main search pages
  if (needsJobs)
    links.push(
      `* [Search all **jobs** on SkillStrong](/jobs/all)`
    );
  if (needsPrograms)
    links.push(
      `* [Search all **programs** on SkillStrong](/programs/all)`
    );

  if (links.length > 0) {
    return `### 🛡️ SkillStrong Search
You can also search our internal database directly:
${links.join('\n')}`;
  }
  
  return '';
}
// --- MODIFICATION END ---


// --- Orchestrate Function (Unchanged) ---
export async function orchestrate(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  const originalMessages = input.messages;
  const lastUserRaw =
    [...originalMessages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const isFirstUserMessage =
    originalMessages.filter((m) => m.role === 'user').length === 1;
  const canonical = detectCanonicalCategory(lastUserRaw);

  let messagesForLLM = [...originalMessages];
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
    console.log(
      '[Orchestrate] Using overview prompt for LLM input. Category:',
      canonical
    );
  }
  const inDomain = await domainGuard(originalMessages);
  if (!inDomain) {
    console.log(
      '[Orchestrate] Domain Guard: OUT OF DOMAIN for query:',
      lastUserRaw
    );
    return {
      answer: 'I focus on modern manufacturing careers...',
      followups: defaultFollowups(),
    };
  }
  console.log('[Orchestrate] Domain Guard: IN DOMAIN for query:', lastUserRaw);
  const isLocalQuery =
    /near me|local|in my area|nearby|\b\d{5}\b|[A-Z]{2}\b/i.test(lastUserRaw) ||
    /\b(jobs?|openings?|hiring|apprenticeships?|programs?|training|tuition|start date|admission|employer|provider|scholarship)\b/i.test(
      lastUserRaw.toLowerCase()
    );
  if (isLocalQuery && !input.location) {
    console.log(
      '[Orchestrate] Local query detected but location is missing. Asking user.'
    );
    return {
      answer:
        'To find local results, please set your location using the button in the header.',
      followups: [],
    };
  }
  const internalRAG = await queryInternalDatabase(
    lastUserRaw,
    input.location ?? undefined
  );
  const needWeb = await needsInternetRag(messageContentForRAGDecision);
  console.log(`[Orchestrate] Decision: needsInternetRag = ${needWeb}`);
  let webAnswer = null;
  if (needWeb) {
    console.log(
      `[Orchestrate] Proceeding with Web Search for original query: "${lastUserRaw}"`
    );
    try {
      webAnswer = await internetRagCSE(
        lastUserRaw,
        input.location ?? undefined,
        canonical
      );
      if (webAnswer) console.log('[Orchestrate] Web RAG successful.');
      else console.log('[Orchestrate] Web RAG returned no usable content.');
    } catch (webRagError: any) {
      console.error('[Orchestrate] Error during Web RAG call:', webRagError);
      webAnswer = null;
    }
  } else {
    console.log(`[Orchestrate] Skipping Web Search.`);
  }
  let combinedContext = '';
  if (webAnswer) {
    const webHeading = internalRAG
      ? '**Related Web Results:**'
      : '**Web Search Results:**';
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
    console.log(
      '[Orchestrate] Notifying LLM: Specific search attempted but failed.'
    );
  } else if (!combinedContext && overviewActuallyUsed) {
    console.log(
      '[Orchestrate] No RAG context generated (Overview prompt used).'
    );
  } else if (!combinedContext) {
    console.log(
      '[Orchestrate] No RAG context generated (Web search skipped/failed, no internal links triggered).'
    );
  }
  const messagesForFinalAnswer = [...messagesForLLM];
  if (combinedContext) {
    messagesForFinalAnswer.push({
      role: 'system',
      content: `Use the following search results to answer the user's query...\n\n${combinedContext}`,
    });
    console.log('[Orchestrate] Added combined RAG context to final LLM call.');
  } else {
    console.log('[Orchestrate] No RAG context added to final LLM call.');
  }
  const finalAnswer = await answerLocal(
    messagesForFinalAnswer,
    input.location ?? undefined
  );
  console.log('[Orchestrate] Generated final answer from LLM.');
  let finalAnswerWithFeatured = finalAnswer;
  try {
    const featured = await findFeaturedMatching(
      lastUserRaw,
      input.location ?? undefined
    );
    if (Array.isArray(featured) && featured.length > 0) {
      const locTxt = input.location ? ` near ${input.location}` : '';
      const lines = featured
        .map((f) => `- **${f.title}** — ${f.org} (${f.location})`)
        .join('\n');
      if (!finalAnswerWithFeatured.includes('**Featured')) {
        finalAnswerWithFeatured += `\n\n**Featured${locTxt}:**\n${lines}`;
        console.log('[Orchestrate] Appended featured listings.');
      }
    }
  } catch (err) {
    console.error('[Orchestrate] Error fetching/appending featured items:', err);
  }
  const followups = await generateFollowups(
    lastUserRaw,
    finalAnswerWithFeatured,
    input.location ?? undefined
  );
  console.log('[Orchestrate] Generated followups.');
  return { answer: finalAnswerWithFeatured.trim(), followups };
}

// --- Domain Guard (Unchanged) ---
async function domainGuard(messages: Message[]): Promise<boolean> {
  if (!messages.some((m) => m.role === 'user')) return true;
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage?.role !== 'user') return true;
  const lastUserQuery = lastUserMessage.content || '';
  if (!lastUserQuery.trim()) return true;

  const allowHints = /\b(manufactur(e|ing)?|cnc|robot(ic|ics)?|weld(er|ing)?|machin(e|ist|ing)?|apprentice(ship)?s?|factory|plant|quality|qc|maintenance|mechatronic|additive|3d\s*print|bls|o\*?net|program|community\s*college|trade\s*school|career|salary|pay|job|skill|training|near me|local|in my area|how much|what is|tell me about|nims|certificat(e|ion)s?|aws|osha|pmmi|cmrt|cmrp|cqi|cqt|cltd|cscp|camf|astm|asq|gd&t|plc|cad|cam)\b/i;

  if (allowHints.test(lastUserQuery)) {
    console.log(
      `[Domain Guard] Query matched allowHints regex: "${lastUserQuery}" -> IN`
    );
    return true;
  }

  const contextMessages = messages.slice(-4);
  const contextQuery = contextMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n\n');
  if (messages.filter((m) => m.role === 'user').length === 1) {
    console.log(
      `[Domain Guard] First user message failed allowHints regex, considered OUT: "${lastUserQuery}"`
    );
    return false;
  }
  console.log(
    `[Domain Guard] Query failed allowHints regex, proceeding to LLM check: "${lastUserQuery}"`
  );
  const systemPrompt = `Analyze the conversation context below... (rest is unchanged)`;
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [{ role: 'system', content: systemPrompt }],
      max_tokens: 5,
    });
    const out = res.choices[0]?.message?.content?.trim().toUpperCase();
    console.log(
      `[Domain Guard] LLM Check Result -> ${out} (Based on last query: "${lastUserQuery}")`
    );
    return out === 'IN';
  } catch (error) {
    console.error('[Domain Guard] Error during LLM check:', error);
    return true;
  }
}

// --- Base Answer Generation (Unchanged) ---
async function answerLocal(
  messages: Message[],
  location?: string
): Promise<string> {
  const msgs: Message[] = [{ role: 'system', content: COACH_SYSTEM }];
  if (location)
    msgs.push({ role: 'system', content: `User location: ${location}` });
  msgs.push(...messages);
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: msgs,
    });
    return res.choices[0]?.message?.content ?? '';
  } catch (error) {
    console.error('Error calling OpenAI for local answer:', error);
    return 'Sorry, I encountered an issue generating a response.';
  }
}

// --- needsInternetRag (Unchanged) ---
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
    console.log(`[needsInternetRag] Skipping web because: ${skipReason}. -> FALSE`);
    return false;
  } else {
    console.log(
      '[needsInternetRag] Query is not overview or definition, proceeding with web search. -> TRUE'
    );
    return true;
  }
}

// --- MODIFICATION START: Web RAG Function (internetRagCSE - Updated Query Logic) ---
async function internetRagCSE(
  query: string,
  location?: string,
  canonical?: string | null
): Promise<string | null> {
  console.log('--- [Web RAG] Entered ---');
  let res: any;
  try {
    const lowerQuery = query.toLowerCase();
    const isGeneralInfoQuery = /^(tell me about|what is|what's|define|explain)\b/i.test(
      lowerQuery
    );
    
    // --- Platform Detection ---
    let platformSite = "";
    if (/\bcoursera\b/i.test(lowerQuery)) platformSite = "site:coursera.org";
    else if (/\budemy\b/i.test(lowerQuery)) platformSite = "site:udemy.com";
    else if (/\bedx\b/i.test(lowerQuery)) platformSite = "site:edx.org";
    // --- End Platform Detection ---

    let q = '';
    
    // Extract location string (e.g., "San Ramon" or "San Ramon, CA")
    const locationSearchTerm = location ? `"${location.split(',')[0]}"` : ""; // Use city name

    if (isGeneralInfoQuery && canonical) {
      q = `"${canonical}" career overview (site:bls.gov OR site:onetonline.org OR site:careeronestop.org)`;
      console.log('[Web RAG] Biasing search for general overview (canonical detected).');
    } else if (isGeneralInfoQuery) {
      q = `${query} (site:bls.gov OR site:onetonline.org OR site:careeronestop.org)`;
      console.log('[Web RAG] Biasing search for general overview (no canonical).');
    } else {
      // This is a specific query (jobs, programs, salary, etc.)
      const baseQuery = (canonical && /salary|pay|wage|job|opening|program|training|certificate|skill|course/i.test(query))
          ? `"${canonical}" ${query}` // Use canonical + query
          : `"${query}"`; // Use full query
      
      q = baseQuery;
      
      // --- New Location Logic ---
      if (locationSearchTerm) {
          q += ` ${locationSearchTerm}`; // Add "San Ramon" to the query
          console.log(`[Web RAG] Added location term to query: ${locationSearchTerm}`);
      } else {
           console.log('[Web RAG] Using standard search logic for specific query (no location).');
      }
      // --- End New Location Logic ---
      
      // Add platform bias if detected
      if (platformSite) {
          console.log(`[Web RAG] Adding platform bias: ${platformSite}`);
          q += ` (${platformSite})`;
      } else {
          // Add default biases *only if* a specific platform wasn't mentioned
          if (/(salary|pay|wage|median|bls)/i.test(query)) q += ' (site:bls.gov OR site:onetonline.org)';
          if (/(program|training|certificate|certification|community college|course)/i.test(query)) q += ' (site:.edu OR site:manufacturingusa.com OR site:nims-skills.org OR site:careeronestop.org)';
          if (/jobs?|openings?|hiring|apprenticeship/i.test(query)) q += ' (site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs OR site:apprenticeship.gov)';
      }
    }
    
    q += ' -site:github.com -site:reddit.com -site:youtube.com -site:wikipedia.org -site:quora.com -site:pinterest.com';
    
    console.log('[Web RAG] Executing CSE query:', q);
    
    try {
      res = await cseSearch(q);
    } catch (cseError: any) {
      console.error('[Web RAG] Error DURING cseSearch call:', cseError);
      console.log('--- [Web RAG] Exiting: cseSearch error ---');
      return null;
    }
    
    const items: any[] = Array.isArray(res?.items) ? res.items : [];
    if (!items.length) {
      console.log('[Web RAG] CSE Search returned no items.');
      console.log('--- [Web RAG] Exiting: No search items ---');
      return null;
    }
    
    // --- Rest of function is unchanged ---
    const pages = (
      await Promise.all(
        items.slice(0, 3).map(async (it: any, index: number) => {
          const url: string | undefined = it.url || it.link;
          if (!url || !url.startsWith('http')) {
            console.log(
              `[Web RAG] Skipping item ${index + 1}: Invalid URL: ${url}`
            );
            return null;
          }
          try {
            const doc = await fetchReadable(url);
            if (doc && doc.text) {
              console.log(`[Web RAG] Fetched/Parsed item ${index + 1}: ${url}`);
              return doc;
            } else {
              console.log(
                `[Web RAG] Failed get readable text item ${index + 1}: ${url}`
              );
              return null;
            }
          } catch (fetchErr) {
            console.warn(
              `[Web RAG] Error fetching item ${index + 1} (${url}):`,
              fetchErr
            );
            return null;
          }
        })
      )
    ).filter(Boolean) as Array<{ title: string; url: string; text: string }>;
    if (!pages.length) {
      console.log('[Web RAG] No pages fetchable/parsable.');
      console.log('--- [Web RAG] Exiting: No fetchable pages ---');
      return null;
    }
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
      console.log('[Web RAG] Synthesizing results with LLM.');
      const out = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.25,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt },
        ],
      });
      let answer = out.choices[0]?.message?.content ?? '';
      if (!answer.trim()) {
        console.log('[Web RAG] LLM synthesis empty.');
        console.log('--- [Web RAG] Exiting: Empty synthesis ---');
        return null;
      }
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
      console.log('[Web RAG] Synthesis successful.');
      console.log('--- [Web RAG] Exiting successfully ---');
      return answer + sourcesMd;
    } catch (error) {
      console.error('[Web RAG] Error during synthesis LLM call:', error);
      console.log('--- [Web RAG] Exiting: Synthesis error ---');
      return null;
    }
  } catch (outerError: any) {
    console.error('[Web RAG] Unexpected error:', outerError);
    console.log('--- [Web RAG] Exiting: Unexpected error ---');
    return null;
  }
}
// --- MODIFICATION END ---


// --- Followup Generation (Unchanged) ---
async function generateFollowups(
  question: string,
  answer: string,
  location?: string
): Promise<string[]> {
  let finalFollowups: string[] = [];
  let rawResponse = '{"followups": []}';
  try {
    const systemPrompt = `You are an assistant generating follow-up suggestions for a career coach chatbot.
Based on the User Question and AI Answer, generate a JSON object with a key "followups" containing an array of upto 5 concise (under 65 chars), relevant, and action-oriented follow-up prompts.

**RULES:**
1.  Prompts MUST be directly related to the specific topics in the question or answer.
2.  Prompts SHOULD encourage exploration (e.g., "Find local programs," "Compare salaries").
3.  AVOID generic prompts ("Anything else?", "More info?").
4.  Return ONLY the JSON object. Example: {"followups": ["Local CNC Training", "CNC Salary Ranges", "Welding Apprenticeships"]}`;

    const userMessage = `User Question: "${question}"
AI Answer: "${answer}"
${location ? `User Location: "${location}"` : ''}

Generate JSON object with 5 relevant followups:`;

    console.log('[Followups] Calling gpt-4o for followups.');
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
    console.log('[Followups] Raw LLM Response:', rawResponse);

    try {
      const parsed = JSON.parse(rawResponse);
      if (parsed && parsed.followups && Array.isArray(parsed.followups)) {
        const stringFollowups = parsed.followups.filter(
          (item: any): item is string =>
            typeof item === 'string' && item.trim().length > 0
        );
        if (stringFollowups.length > 0) {
          finalFollowups = stringFollowups;
          console.log('[Followups] Successfully Parsed:', finalFollowups);
        } else {
          console.warn(
            "[Followups] Parsed 'followups' array, but it contained no valid non-empty strings."
          );
        }
      } else {
        console.warn(
          "[Followups] Failed to parse a valid 'followups' array from raw response."
        );
      }
    } catch (parseError) {
      console.error('[Followups] JSON Parsing Error:', parseError);
      console.error(
        '[Followups] Raw response that caused parsing error:',
        rawResponse
      );
    }
  } catch (error: any) {
    console.error('[Followups] Error calling OpenAI for follow-ups:', error);
  }

  const sanitizedFollowups = sanitizeFollowups(finalFollowups);
  if (sanitizedFollowups.length > 0) {
    return sanitizedFollowups;
  } else {
    console.warn(
      '[Followups] No valid followups generated or parsed, falling back to defaults for question:',
      question
    );
    return defaultFollowups();
  }
}

// --- Sanitization and Defaults (Unchanged) ---
function sanitizeFollowups(arr: any[]): string[] {
  const MAX_LEN = 65;
  const MAX_PROMPTS = 5;
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
