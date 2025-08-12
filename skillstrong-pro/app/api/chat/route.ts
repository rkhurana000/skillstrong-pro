import { NextRequest, NextResponse } from 'next/server';
import { callGeminiJSON } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JOBS = [
  'Welding',
  'CNC Machining',
  'Quality Control',
  'Automation and Robotics',
  'Production Management',
  'Supply Chain Logistics',
  'Additive Manufacturing (3D Printing)',
];

const BASE_SYS = `You are a friendly manufacturing career guide for US high-school students.
Keep answers under 120 words. Be concrete and practical.
ALWAYS reply as JSON with keys: answer (string), buttons (array), nav (array), facts (array).
- Each button has: { "label": string, "action"?: "search_jobs"|"search_training"|"search_web", "query"?: string }
- If the user asks to explore job types, suggest the core set: ${JOBS.join(', ')}.
- When the user picks a job, include 3–6 follow-up buttons like:
  • "What does it pay?" (no action, just a question)
  • "Entry certifications" (action: "search_training", query: "<job> certificate")
  • "Apprenticeships near me" (action: "search_training", query: "<job> apprenticeship")
  • "Find jobs" (action: "search_jobs", query: "<job> jobs")
Return JSON only (no extra text).`;

function isExploreJobs(text: string) {
  return /explore.*(job|skill)s?/i.test(text);
}

function detectJob(text: string) {
  const t = text.toLowerCase();
  return JOBS.find(j => t.includes(j.toLowerCase().split(' (')[0]));
}

export async function POST(req: NextRequest) {
  try {
    const { text, zip } = await req.json();
    const userText = String(text || '');
    const job = detectJob(userText);

    // If the user asked to explore job types, return the canonical job chips immediately.
    if (isExploreJobs(userText)) {
      return NextResponse.json({
        answer:
          'Pick a job family to dive in. I’ll show a quick overview and next steps.',
        buttons: JOBS.map(label => ({ label })),
        nav: [],
        facts: [],
      });
    }

    // Ask Gemini for a short answer + (optional) buttons
    const guided = await callGeminiJSON(userText, BASE_SYS);
    let buttons: any[] = Array.isArray(guided.buttons) ? guided.buttons : [];

    // Fallback buttons when a job is detected but Gemini didn’t return enough
    if (job && buttons.filter(b => b?.label).length < 3) {
      const near = zip ? ` near ${zip}` : '';
      buttons = [
        { label: 'What does it pay?' },
        { label: 'Entry certifications', action: 'search_training', query: `${job} certificate` },
        { label: 'Apprenticeships near me', action: 'search_training', query: `${job} apprenticeship${near}`.trim() },
        { label: 'Find jobs', action: 'search_jobs', query: `${job} jobs` },
      ];
    }

    // Minimum viable buttons if Gemini returned none and no job detected
    if (!buttons.length) {
      buttons = [
        { label: 'Explore by job types' },
        { label: 'Explore by salary range' },
        { label: 'Explore by training length' },
      ];
    }

    return NextResponse.json({
      answer: String(guided.answer || 'Here are ways to explore.'),
      buttons,
      nav: Array.isArray(guided.nav) ? guided.nav.slice(0, 6) : [],
      facts: Array.isArray(guided.facts) ? guided.facts.slice(0, 6) : [],
    });
  } catch (e) {
    console.error('chat error', e);
    return NextResponse.json({
      answer: 'Provider error. Try again.',
      buttons: [
        { label: 'Explore by job types' },
        { label: 'Explore by salary range' },
        { label: 'Explore by training length' },
      ],
      nav: [],
      facts: [],
    });
  }
}
