// /app/api/maintenance/programs/backfill-titles/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { CIP4_NAMES, friendlyProgramTitle } from '@/lib/scorecard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/maintenance/programs/backfill-titles
 * Rewrites titles like "CIP 4805" → "Precision Metal Working (Welding & Machining) — Certificate / AAS"
 */
export async function POST() {
  try {
    const { data, error } = await supabaseAdmin
      .from('programs')
      .select('id,title,description')
      .ilike('title', 'CIP %')
      .limit(5000);

    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ ok: true, updated: 0 });

    let updated = 0;
    for (const row of data) {
      const m = row.title.match(/CIP\s+(\d{4})/i) || row.description?.match(/\(CIP\s*(\d{4})\)/i);
      if (!m) continue;
      const cip4 = m[1];
      const newTitle = friendlyProgramTitle(cip4, null);
      if (!newTitle) continue;

      const { error: upErr } = await supabaseAdmin
        .from('programs')
        .update({ title: newTitle })
        .eq('id', row.id);
      if (upErr) continue;
      updated++;
    }

    return NextResponse.json({ ok: true, updated, knownFamilies: Object.keys(CIP4_NAMES) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Backfill failed' }, { status: 500 });
  }
}
