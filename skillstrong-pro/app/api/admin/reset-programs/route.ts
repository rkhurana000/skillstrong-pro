import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// === Targets (expand anytime) ===
const CIP_TARGETS = [
  { cip4: '4805', label: 'Precision Metal Working (Welding & Machining)' },
  { cip4: '4803', label: 'Machine Tool Technology (CNC)' },
  { cip4: '1504', label: 'Robotics / Automation' },
  { cip4: '1506', label: 'Industrial Maintenance' },
  { cip4: '1418', label: 'Industrial Engineering Technology' },
  { cip4: '1507', label: 'Quality Control Technology / Technician' }, // NEW
];

const STATES = [
  'CA','TX','FL','NY','PA','IL','OH','GA','NC','MI',
  'AZ','WA','MA','TN','IN','MO','WI','CO','MN','PR'
];

function ensureAuth(req: NextRequest) {
  const hdr = req.headers.get('x-admin-secret');
  return hdr && hdr === process.env.ADMIN_RESET_SECRET;
}

async function fetchScorecard(cip4: string, state: string) {
  const url = new URL('https://api.data.gov/ed/collegescorecard/v1/schools.json');
  url.searchParams.set('api_key', process.env.COLLEGE_SCORECARD_API_KEY || 'DEMO_KEY');
  url.searchParams.set(
    'fields',
    [
      'school.name',
      'school.city',
      'school.state',
      'school.school_url',
      'school.online_only', // <-- for delivery
      'latest.programs.cip_4_digit.code',
      'latest.programs.cip_4_digit.title',
    ].join(',')
  );
  url.searchParams.set('latest.programs.cip_4_digit.code', cip4);
  url.searchParams.set('school.state', state);
  url.searchParams.set('per_page', '100');

  const r = await fetch(url.toString());
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results || []) as any[];
}

export async function POST(req: NextRequest) {
  if (!ensureAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1) wipe table
  await supabaseAdmin.from('programs').delete().neq('id', 0);

  // 2) seed
  let inserted = 0;

  for (const s of STATES) {
    for (const target of CIP_TARGETS) {
      const rows = await fetchScorecard(target.cip4, s);
      if (!rows.length) continue;

      const payload = rows.map((r: any) => {
        const title = r['latest.programs.cip_4_digit.title'] || target.label;
        const schoolUrl = (r['school.school_url'] || '') as string;
        const onlineOnly = r['school.online_only'] === 1 || r['school.online_only'] === true;

        // === delivery heuristic ===
        let delivery: 'online' | 'hybrid' | 'in-person' = 'in-person';
        if (onlineOnly) {
          delivery = 'online';
        } else if (
          /online/i.test(title || '') ||
          /online/i.test(schoolUrl || '')
        ) {
          delivery = 'hybrid';
        }

        return {
          school: r['school.name'],
          city: r['school.city'],
          state: r['school.state'],
          title,
          description: `Program in ${title}. Imported via College Scorecard.`,
          url: schoolUrl || null,
          delivery,                // <--- online / hybrid / in-person
          cip4: target.cip4,
          metro: null,
        };
      });

      const { error } = await supabaseAdmin.from('programs').insert(payload);
      if (!error) inserted += payload.length;
    }
  }

  return NextResponse.json({ ok: true, inserted });
}
