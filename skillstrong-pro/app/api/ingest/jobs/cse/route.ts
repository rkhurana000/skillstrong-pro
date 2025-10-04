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
    const queries: string[] = Array.isArray(body.queries) ? body.queries : [];
    
    console.log(`--- Starting Job Ingestion for ${queries.length} queries ---`);
    let createdCount = 0;

    for (const q of queries) {
      const items = await cseSearch(q, 10);
      console.log(`Query: "${q}" --- Found ${items.length} items.`);

      for (const it of items) {
        console.log(`\n--- Processing Item ---`);
        console.log(`  Raw Title: ${it.title}`);
        console.log(`  Raw Snippet: ${it.snippet}`);

        const locMatch = it.snippet?.match(/\b([A-Z][a-zA-Z\s.-]+,)\s*([A-Z]{2})\b/);
        
        if (!locMatch || !locMatch[0]) {
            console.log(`  [SKIPPED] Reason: No valid location found.`);
            continue; 
        }
        
        const location = locMatch[0];
        const title = normalizeTitle(it.title || '');

        if (title.toLowerCase().includes('manufacturing job') || title.length < 5) {
            console.log(`  [SKIPPED] Reason: Generic or short title.`);
            continue;
        }

        const skills = extractSkills(`${title} ${it.snippet || ''}`);

        console.log(`  => Parsed Title: ${title}`);
        console.log(`  => Parsed Location: ${location}`);
        console.log(`  => Parsed Skills: [${skills.join(', ')}]`);

        await addJob({
          title,
          company: it.displayLink?.replace(/^www\./, '') || 'Manufacturing Company',
          location,
          description: it.snippet || undefined,
          skills,
          apprenticeship: /apprentice/i.test(title),
          external_url: it.link,
          apply_url: it.link,
          featured: false,
        });
        createdCount++;
        console.log(`  [SUCCESS] Job saved to database.`);
      }
    }

    console.log(`--- Job Ingestion Complete. Total Jobs Created: ${createdCount} ---`);
    return NextResponse.json({ ok: true, count: createdCount });
  } catch (e: any) {
    console.error("FATAL CSE INGEST ERROR:", e);
    return NextResponse.json({ error: e.message || 'CSE ingest failed' }, { status: 500 });
  }
}

