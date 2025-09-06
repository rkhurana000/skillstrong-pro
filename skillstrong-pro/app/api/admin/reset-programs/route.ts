// app/api/admin/reset-programs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_SECRET = process.env.ADMIN_RESET_SECRET!;
const SCORECARD_API_KEY =
  process.env.COLLEGE_SCORECARD_API_KEY || process.env.SCORECARD_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[reset-programs] Missing Supabase envs: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'
  );
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Friendly defaults for common CIPs */
const CIP_DEFAULTS: Record<
  string,
  { name: string; blurb: string }
> = {
  // 48.05 — Precision Metal Working (incl. welding/machining)
  '4805': {
    name: 'Precision Metal Working (Welding & Machining)',
    blurb:
      'Hands-on metal fabrication: cutting, forming, and welding. Learn shop safety, print reading, and setup for multi-process welds & machining.',
  },
  // 48.03 — Machine Shop Technology (CNC)
  '4803': {
    name: 'CNC Machining / Machine Tool Technology',
    blurb:
      'CNC setup & operation: read prints, CAM/G-code basics, tool selection, work offsets, and quality checks for precision parts.',
  },
  // 15.04 — Robotics & Automation
  '1504': {
    name: 'Robotics & Automation Technology',
    blurb:
      'Robotics/automation fundamentals: PLCs, sensors, motion systems, safety, and troubleshooting automated cells.',
  },
  // 15.06 — Industrial Maintenance
  '1506': {
    name: 'Industrial Maintenance Technology',
    blurb:
      'Keep factories running: mechanical, electrical, hydraulics, pneumatics, and PLC troubleshooting with preventive maintenance.',
  },
  // 15.07 — Quality Control / Quality Tech
  '1507': {
    name: 'Quality Control Technology/Technician',
    blurb:
      'Inspect & verify quality: GD&T, metrology, SPC/QA methods, and tools.',
  },
};

type Body = {
  wipe?: boolean;
  onlyWithLinks?: boolean;
  deliveryModes?: Array<'in-person' | 'online' | 'hybrid' | string>;
  cips?: string[]; // 4-digit (e.g., "4805", "1507")
  cipDescriptions?: Record<string, string>; // optional overrides
  metros?: string[]; // human labels e.g., "Bay Area, CA"
  states?: string[]; // e.g. ["CA","AZ",...]
  limitPerMetro?: number;
  limitPerState?: number;
};

type ScorecardSchool = {
  id: number;
  'school.name': string;
  'school.city': string;
  'school.state': string;
  'school.school_url'?: string;
  // nested programs
  'latest.programs.cip_4_digit'?: Array<{
    code: string; // "4805"
    title?: string; // official title
  }>;
};

const BAY_AREA_CITIES = new Set([
  'San Jose',
  'San Francisco',
  'Oakland',
  'Fremont',
  'Santa Clara',
  'Sunnyvale',
  'Mountain View',
  'Redwood City',
  'San Mateo',
  'Palo Alto',
  'Hayward',
  'Berkeley',
  'San Leandro',
]);

function normalizeMetro(
  city: string | null | undefined,
  state: string | null | undefined,
  metros: string[] | undefined
): string | null {
  if (!city || !state || !metros || !metros.length) return null;

  const labelExact = `${city}, ${state}`;
  if (metros.includes(labelExact)) return labelExact;

  if (state === 'CA' && BAY_AREA_CITIES.has(city)) {
    const ba = metros.find((m) => /^bay area, ca$/i.test(m));
    if (ba) return ba;
  }
  // Fallback: best-effort state match (first metro with same state suffix)
  const candidate = metros.find((m) => m.endsWith(`, ${state}`));
  return candidate || null;
}

function pickDelivery(modes?: Body['deliveryModes']): 'in-person' | 'online' | 'hybrid' {
  const pool = (modes?.length ? modes : ['in-person', 'online', 'hybrid']) as string[];
  const chosen = pool[Math.floor(Math.random() * pool.length)] as any;
  return ['in-person', 'online', 'hybrid'].includes(chosen) ? chosen : 'in-person';
}

function cipLabelAndBlurb(
  cip4: string,
  officialTitle?: string,
  overrides?: Record<string, string>
): { name: string; blurb: string } {
  const short = cip4.slice(0, 4);
  // override blurb if provided
  const overrideBlurb = overrides?.[cip4] || overrides?.[short];

  // prefer nice default, fall back to official title
  const def = CIP_DEFAULTS[cip4] || CIP_DEFAULTS[short];
  const name = def?.name || officialTitle || 'Manufacturing Program';
  const blurb =
    overrideBlurb ||
    def?.blurb ||
    'Hands-on training for modern manufacturing careers.';

  return { name, blurb };
}

async function fetchScorecardPage(params: {
  cip4: string;
  state?: string;
  page?: number;
  perPage?: number;
}): Promise<{ results: ScorecardSchool[]; total?: number }> {
  if (!SCORECARD_API_KEY) {
    throw new Error(
      'Missing COLLEGE_SCORECARD_API_KEY (or SCORECARD_API_KEY) in environment.'
    );
  }

  const { cip4, state, page = 0, perPage = 100 } = params;

  const fields = [
    'id',
    'school.name',
    'school.city',
    'school.state',
    'school.school_url',
    'latest.programs.cip_4_digit',
  ].join(',');

  // Filter schools that have that CIP code; optionally by state
  const qs = new URLSearchParams({
    api_key: SCORECARD_API_KEY,
    fields,
    per_page: String(perPage),
    page: String(page),
    'latest.programs.cip_4_digit.code': cip4,
  });
  if (state) qs.set('school.state', state);

  const url = `https://api.data.gov/ed/collegescorecard/v1/schools?${qs.toString()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `Scorecard error ${res.status} ${res.statusText}: ${t.substring(0, 400)}`
    );
  }
  const json = await res.json();
  return {
    results: (json?.results || []) as ScorecardSchool[],
    total: json?.metadata?.total,
  };
}

async function collectSchoolsForState(
  cip4: string,
  state?: string,
  hardLimit = 300
): Promise<ScorecardSchool[]> {
  const out: ScorecardSchool[] = [];
  let page = 0;
  while (out.length < hardLimit) {
    const { results } = await fetchScorecardPage({ cip4, state, page, perPage: 100 });
    if (!results.length) break;
    out.push(...results);
    if (results.length < 100) break; // last page
    page += 1;
  }
  return out;
}

function shapeRow(
  school: ScorecardSchool,
  cip4: string,
  metros?: string[],
  deliveryModes?: Body['deliveryModes'],
  cipDesc?: Record<string, string>
) {
  const city = (school['school.city'] || '').trim();
  const state = (school['school.state'] || '').trim();
  const metro = normalizeMetro(city, state, metros);
  const schoolUrl = (school['school.school_url'] || '').trim() || null;

  // Find official CIP title in this school’s program list if present
  const official = school['latest.programs.cip_4_digit']?.find(
    (p) => (p.code || '').slice(0, 4) === cip4.slice(0, 4)
  )?.title;

  const { name, blurb } = cipLabelAndBlurb(cip4, official, cipDesc);

  return {
    title: name, // presented as "Program"
    school: school['school.name'],
    city: city || null,
    state: state || null,
    metro: metro || null,
    delivery: pickDelivery(deliveryModes),
    lengthWeeks: null as number | null,
    cost: null as number | null,
    cip: cip4,
    description: blurb,
    url: schoolUrl, // program page if you have one; fallback to school homepage
    featured: false,
    source: 'college_scorecard' as const,
  };
}

async function insertBatch(rows: any[]) {
  if (!rows.length) return { count: 0, error: null };
  const { error, count } = await supabaseAdmin
    .from('programs')
    .insert(rows, { count: 'exact' });
  if (error) throw error;
  return { count: count || rows.length, error: null };
}

export async function POST(req: NextRequest) {
  // --- auth guard ---
  const secret = req.headers.get('x-admin-secret') || '';
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad JSON' }, { status: 400 });
  }

  const {
    wipe = false,
    onlyWithLinks = true,
    deliveryModes = ['in-person', 'online', 'hybrid'],
    cips = ['4805', '4803', '1504', '1506', '1507'],
    cipDescriptions = {},
    metros = [],
    states = [],
    limitPerMetro = 80,
    limitPerState = 300,
  } = body;

  try {
    if (wipe) {
      // delete everything in programs
      const { error: delErr } = await supabaseAdmin
        .from('programs')
        .delete()
        .neq('id', ''); // matches all rows
      if (delErr) throw delErr;
    }

    if (!SCORECARD_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Missing COLLEGE_SCORECARD_API_KEY (or SCORECARD_API_KEY). Set it in your environment and redeploy.',
        },
        { status: 500 }
      );
    }

    // If states not provided, derive from metros (tokens after comma)
    const statesToUse =
      states.length > 0
        ? states
        : Array.from(
            new Set(
              metros
                .map((m) => (m.split(',').pop() || '').trim())
                .filter(Boolean)
            )
          );

    let inserted = 0;

    for (const cipRaw of cips) {
      const cip4 = (cipRaw || '').replace(/\D/g, '').slice(0, 4);
      if (!cip4) continue;

      for (const st of statesToUse.length ? statesToUse : [undefined]) {
        const schools = await collectSchoolsForState(cip4, st, limitPerState);

        // Limit per metro (best-effort): group by computed metro and cap
        const byMetro = new Map<string, any[]>();
        for (const s of schools) {
          const row = shapeRow(s, cip4, metros, deliveryModes, cipDescriptions);
          // respect onlyWithLinks (accept school homepage as valid link)
          if (onlyWithLinks && !row.url) continue;

          const key = row.metro || `${row.state || '??'}`;
          if (!byMetro.has(key)) byMetro.set(key, []);
          const arr = byMetro.get(key)!;
          if (arr.length < limitPerMetro) arr.push(row);
        }

        // Insert in batches of 200
        const allRows = Array.from(byMetro.values()).flat();
        for (let i = 0; i < allRows.length; i += 200) {
          const chunk = allRows.slice(i, i + 200);
          const { count } = await insertBatch(chunk);
          inserted += count;
        }
      }
    }

    return NextResponse.json({ ok: true, inserted });
  } catch (e: any) {
    console.error('[reset-programs] Error:', e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
