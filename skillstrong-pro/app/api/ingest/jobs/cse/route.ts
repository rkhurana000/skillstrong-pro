// /app/api/ingest/jobs/cse/route.ts
import { NextResponse } from 'next/server';
import { cseSearch } from '@/lib/cse';
import { addJob } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A predefined list of skills to look for in job descriptions
const SKILL_KEYWORDS = [
    'CNC', 'Machinist', 'Welder', 'Robotics', 'Maintenance', 'Quality Control', 'QC', 'QA',
    'PLC', 'CAD', 'CAM', 'SolidWorks', 'Mastercam', 'Fanuc', 'Blueprint Reading', 'GD&T',
    'Metrology', 'CMM', 'ISO 9001', 'Six Sigma', 'Lean Manufacturing', '5S', 'Hydraulics',
    'Pneumatics', 'TIG', 'MIG', 'Welding', 'Fabrication', 'Logistics', 'Supply Chain', 'APICS',
    'Forklift', 'Shipping', 'Receiving', 'ERP', 'SAP', 'OSHA', 'Safety', 'Automation',
    'RF Scanner', 'Pulling Orders', 'Deburring', 'Production Control'
];

function normalizeTitle(rawTitle: string): string {
    if (!rawTitle) return "Manufacturing Role";
    // Remove locations, job board names, and other noise
    let title = rawTitle
        .replace(/-\s*Indeed.*$/i, '')
        .replace(/-\s*[A-Za-z\s]+,\s*[A-Z]{2}.*$/, '')
        .replace(/\(.*\)|\[.*\]/g, ''); // Remove anything in parentheses or brackets
    
    // Take the part before the first separator
    title = title.split(/ - | \| /)[0];
    
    return title.trim();
}

function extractSkills(text: string): string[] {
    const foundSkills = new Set<string>();
    const textLower = text.toLowerCase();
    SKILL_KEYWORDS.forEach(skill => {
        const regex = new RegExp(`\\b${skill.toLowerCase().replace(/\s/g, '\\s')}\\b`, 'i');
        if (regex.test(textLower)) {
            foundSkills.add(skill);
        }
    });
    return Array.from(foundSkills);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const featured = !!body.featured;
    const maxPer = Math.min(10, body.maxPerQuery ?? 6);

    const queries: string[] = Array.isArray(body.queries) && body.queries.length 
        ? body.queries 
        : ['site:indeed.com/viewjob (manufacturing OR machinist OR welder OR robotics)'];

    const created: any[] = [];
    for (const q of queries) {
      const items = await cseSearch(q, maxPer);
      for (const it of items) {
        const locMatch = it.snippet?.match(/[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}/);
        const title = normalizeTitle(it.title || '');
        const fullText = `${title} ${it.snippet || ''}`;
        const skills = extractSkills(fullText);

        const job = await addJob({
          title,
          company: it.displayLink?.replace(/^www\./, '') || 'Job Board',
          location: locMatch?.[0] || 'Remote', // Use a better default than "United States"
          description: it.snippet || undefined,
          skills,
          pay_min: null,
          pay_max: null,
          apprenticeship: /apprentice/i.test(title),
          external_url: it.link,
          apply_url: it.link,
          featured,
        });
        created.push(job);
      }
    }

    return NextResponse.json({ ok: true, count: created.length, jobs: created });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'CSE ingest failed' }, { status: 500 });
  }
}
