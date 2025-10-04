// /app/api/ingest/jobs/cse/route.ts
import { NextResponse } from 'next/server';
import { cseSearch } from '@/lib/cse';
import { addJob } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    let title = rawTitle
        .replace(/-\s*Indeed.*$/i, '')
        .replace(/-\s*[A-Za-z\s]+,\s*[A-Z]{2}.*$/, '')
        .replace(/\(.*\)|\[.*\]/g, '');
    
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
    const maxPer = Math.min(10, body.maxPerQuery ?? 10);

    const queries: string[] = Array.isArray(body.queries) && body.queries.length 
        ? body.queries 
        : ['site:indeed.com/viewjob (manufacturing OR machinist OR welder OR robotics)'];

    let createdCount = 0;
    for (const q of queries) {
      const items = await cseSearch(q, maxPer);
      for (const it of items) {
        const locMatch = it.snippet?.match(/\b([A-Z][a-zA-Z\s.-]+,)\s*([A-Z]{2})\b/);

        if (!locMatch || !locMatch[0]) {
            continue; 
        }
        const location = locMatch[0];

        const title = normalizeTitle(it.title || '');
        const fullText = `${title} ${it.snippet || ''}`;
        const skills = extractSkills(fullText);

        if (title.toLowerCase().includes('manufacturing job') || title.length < 5) {
            continue;
        }

        await addJob({
          title,
          company: it.displayLink?.replace(/^www\./, '') || 'Manufacturing Company',
          location,
          description: it.snippet || undefined,
          skills,
          apprenticeship: /apprentice/i.test(title),
          external_url: it.link,
          apply_url: it.link,
          featured,
        });
        createdCount++;
      }
    }

    return NextResponse.json({ ok: true, count: createdCount });
  } catch (e: any) {
    console.error("CSE Ingest Error:", e);
    return NextResponse.json({ error: e.message || 'CSE ingest failed' }, { status: 500 });
  }
}
