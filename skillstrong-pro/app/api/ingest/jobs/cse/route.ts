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
    'Forklift', 'Shipping', 'Receiving', 'ERP', 'SAP', 'OSHA', 'Safety', 'Automation'
];

function normalizeTitle(rawTitle: string): string {
    if (!rawTitle) return "Manufacturing Role";
    let title = rawTitle
        .replace(/-\s*Indeed.*$/i, '')
        .replace(/-\s*[A-Za-z\s]+,\s*[A-Z]{2}.*$/, '')
        .replace(/\(.*\)|\[.*\]/g, '');
    
    title = title.split(/ - | \| /)[0].trim();
    
    const titleParts = title.split(' in ');
    return titleParts[0].trim();
}

function extractSkills(text: string): string[] {
    const foundSkills = new Set<string>();
    const textLower = text.toLowerCase();
    SKILL_KEYWORDS.forEach(skill => {
        const regex = new RegExp(`\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(textLower)) {
            foundSkills.add(skill);
        }
    });
    return Array.from(foundSkills);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { queries, location } = body; 

    if (!Array.isArray(queries) || queries.length === 0 || !location) {
        return NextResponse.json({ error: 'A queries array and a location are required.' }, { status: 400 });
    }

    let createdCount = 0;
    for (const q of queries) {
      const items = await cseSearch(q, 10);
      for (const it of items) {
        const title = normalizeTitle(it.title || '');
        const skills = extractSkills(`${title} ${it.snippet || ''}`);

        if (title.toLowerCase().includes('manufacturing job') || title.length < 5 || title.toLowerCase().includes('driver') || title.toLowerCase().includes('account manager')) {
            continue;
        }

        await addJob({
          title,
          company: it.displayLink?.replace(/^www\./, '') || 'Manufacturing Company',
          location: location, 
          description: it.snippet || undefined,
          skills,
          apprenticeship: /apprentice/i.test(title),
          external_url: it.link,
          apply_url: it.link,
          featured: false,
        });
        createdCount++;
      }
    }

    return NextResponse.json({ ok: true, count: createdCount, query: queries[0] });
  } catch (e: any) {
    console.error("CSE Ingest Error:", e);
    return NextResponse.json({ error: e.message || 'CSE ingest failed' }, { status: 500 });
  }
}
