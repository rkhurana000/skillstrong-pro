// /app/api/maintenance/programs/enrich/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { cseSearchMany } from '@/lib/cse';
import { CIP4_NAMES } from '@/lib/scorecard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** simple keyword hints per family */
const FAMILY_HINTS: Record<string, string[]> = {
  'Precision Metal Working': ['welding', 'CNC', 'machining', 'tool & die', 'manufacturing'],
  'Electromechanical & Mechatronics': ['mechatronics', 'robotics', 'electromechanical'],
  'Industrial & Manufacturing Production': ['manufacturing technology', 'industrial maintenance', 'production tech'],
};

function familyFromTitle(title: string) {
  if (/precision metal/i.test(title)) return 'Precision Metal Working';
  if (/mechatronics|electromechanical|robotic/i.test(title)) return 'Electromechanical & Mechatronics';
  if (/industrial|manufacturing production/i.test(title)) return 'Industrial & Manufacturing Production';
  // loose mapping from our CIP map text
  for (const k of Object.values(CIP4_NAMES)) {
    if (title.toLowerCase().includes(k.split('(')[0].trim().toLowerCase()))
      return k.includes('Mechatronics') ? 'Electromechanical & Mechatronics'
           : k.includes('Precision Metal') ? 'Precision Metal Working'
           : 'Industrial & Manufacturing Production';
  }
  return 'Industrial & Manufacturing Production';
}

function score(item: { link: string; displayLink?: string; title: string }, school: string) {
  const url = item.link.toLowerCase();
  const host = (item.displayLink || '').toLowerCase();
  const s = school.toLowerCase();
  let pts = 0;
  if (host.endsWith('.edu')) pts += 3;
  if (url.includes('program') || url.includes('/academic') || url.includes('/career')) pts += 2;
  if (url.includes('certificate') || url.includes('cert') || url.includes('aas')) pts += 1;
  if (s && (url.includes(s.replace(/[^a-z]/g, '')) || host.includes(s.replace(/[^a-z]/g, '')))) pts += 2;
  if (url.endsWith('.pdf')) pts -= 2;
  return pts;
}

async function tryFetchAndParse(url: string) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!res.ok) return {};
    const html = await res.text();
    // length
    const w = html.match(/(\d{1,3})\s?(?:weeks|week|wks|wk)\b/i);
    const m = html.match(/(\d{1,2})\s?(?:months|month|mos|mo)\b/i);
    // cost
    const c = html.match(/\$ ?([0-9][0-9,]{2,6})(?:\.\d{2})?/);
    const length_weeks =
      w ? parseInt(w[1], 10)
        : m ? parseInt(m[1], 10) * 4
        : undefined;
    const cost = c ? parseInt(c[1].replace(/,/g, ''), 10) : undefined;
    return { length_weeks, cost };
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit: number = Math.min(body.limit ?? 60, 100);
    // Pick rows missing url or still having boilerplate description
    const { data, error } = await supabaseAdmin
      .from('programs')
      .select('id, school, title, location, description, url')
      .or('url.is.null,description.ilike.%College Scorecard%')
      .order('id', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: 'Nothing to enrich' });
    }

    let updated = 0;
    for (const row of data) {
      const family = familyFromTitle(row.title || '');
      const hintWords = FAMILY_HINTS[family] || ['manufacturing'];
      const city = (row.location || '').split(',')[0] || '';
      const base = `${row.school} ${hintWords[0]} program`;
      const queries = [
        `${base} ${city}`,
        `${row.school} ${hintWords.join(' ')} program`,
        `site:.edu ${row.school} ${hintWords[0]} program`,
        `${row.school} ${family} program`,
      ];

      const items = await cseSearchMany(queries, 4);
      if (!items.length) continue;

      // pick the best candidate
      items.sort((a, b) => score(b, row.school) - score(a, row.school));
      const best = items[0];
      if (!best?.link) continue;

      const parsed = await tryFetchAndParse(best.link);

      const desc =
        (best.snippet || '').trim().slice(0, 240) ||
        `Learn ${hintWords[0]} at ${row.school}.`;

      const patch: Record<string, any> = {
        url: best.link,
        description: desc,
      };
      if (parsed.length_weeks && !Number.isNaN(parsed.length_weeks)) patch.length_weeks = parsed.length_weeks;
      if (parsed.cost && !Number.isNaN(parsed.cost)) patch.cost = parsed.cost;

      const { error: upErr } = await supabaseAdmin
        .from('programs')
        .update(patch)
        .eq('id', row.id);

      if (!upErr) updated++;
      await new Promise(r => setTimeout(r, 300)); // keep it gentle
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'enrich failed' }, { status: 500 });
  }
}
