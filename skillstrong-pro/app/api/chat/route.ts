import { NextRequest, NextResponse } from 'next/server';
import { callGeminiJSON } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JOBS = [
  'Welding', 'CNC Machining', 'Quality Control',
  'Automation and Robotics', 'Production Management',
  'Supply Chain Logistics', 'Additive Manufacturing (3D Printing)',
];


const SYS = `
You are a friendly manufacturing career guide for US high-school students.
Keep each answer under ~180–220 words. Use markdown: headings, bullet lists, short paragraphs.
ALWAYS return JSON: { "answer": string, "buttons": [{ "label": string, "action"?: string, "query"?: string }], "facts": [{ "k": string, "v": string }] }

Rules:
- First, clarify and teach. Prefer 1–2 turns of follow-ups before any web search.
- Suggest 3–6 follow-up buttons that go deeper (e.g., pay, training length, entry certs, day-to-day, growth).
- Only include actions like "research" (for web) when the user explicitly asks for lists/resources.
- If user says "Explore by job types", provide canonical job chips: ${JOBS.join(', ')}.
- If a job is chosen, include practical follow-ups: Pay; Entry certifications; Apprenticeships near me; Find jobs; Day-to-day.

Output rules: 
- Put numbers, definitions, data points, and short summaries directly in answer using Markdown with headings and bullet lists. 
- Use buttons only for next-step actions the user can take (e.g., “Search web for local welding programs”, “Show apprenticeships near 94583”, “Compare vs. electrician”). 
- Do not put salaries, ranges, or key facts into buttons.
`;

function askedJobs(text: string) { return /explore.*(job|skill)s?/i.test(text); }

export async function POST(req: NextRequest) {
  const { text, zip } = await req.json();
  const userText = String(text || '');

  if (askedJobs(userText)) {
    return NextResponse.json({
      answer: 'Pick a job family to dive in:',
      buttons: JOBS.map(label => ({ label })),
      facts: []
    });
  }

  const guided = await callGeminiJSON(userText + (zip ? `\nUser ZIP: ${zip}` : ''), SYS);

  // Ensure we never render empty chips
  const buttons = (Array.isArray(guided.buttons) ? guided.buttons : []).filter((b: any) => b?.label);

  // Add a gentle "Use the web" option only after at least one answer turn
  if (!buttons.some((b: any) => b.action === 'research')) {
    buttons.push({ label: 'Search the web for this', action: 'research', query: userText });
  }

  return NextResponse.json({
    answer: String(guided.answer || 'Here are ways to explore.'),
    buttons: buttons.slice(0, 8),
    facts: Array.isArray(guided.facts) ? guided.facts.slice(0, 6) : [],
  });
}
