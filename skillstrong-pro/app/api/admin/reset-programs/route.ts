// app/api/admin/reset-programs/route.ts
/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- Next runtime ------------------------------------------------------------
export const runtime = 'nodejs';           // needed for supabase-js service role
export const dynamic = 'force-dynamic';    // avoid static optimization

// --- Env ---------------------------------------------------------------------
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // **service role**
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.ADMIN_RESET_SECRET || ''; // either works

// College Scorecard (either name works)
const SCORECARD_API_KEY =
  process.env.COLLEGE_SCORECARD_API_KEY || process.env.SCORECARD_API_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.warn(
    '[reset-programs] Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. Route will return 500.'
  );
}

// --- Supabase admin client ---------------------------------------------------
const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

// --- Helpers -----------------------------------------------------------------
type Delivery = 'in-person' | 'online' | 'hybrid';

type ProgramRow = {
  title: string;            // program name
  school: string;
  city: string | null;
  state: string | null;
  metro: string | null;
  delivery: Delivery;
  lengthWeeks: number | null;
  cost: number | null;
  cip: string | null;       // 4-digit code as string, e.g. "4805"
  description: string | null;
  url: string | null;       // program page preferred, fallback to school url
  featured: boolean;
  source: 'college_scorecard';
};

function okJson<T>(body: T, init?: number | ResponseInit) {
  return NextResponse.json(body as any, init as any);
}

function bad(message: string, code = 400) {
  return okJson({ ok: false, error: message }, { status: code });
}

function friendlyDelivery(modes: Delivery[]): Delivery {
  // Default to in-person if caller passes nothing
  if (!modes?.length) return 'in-person';
  // prefer concrete (not "all")
  if (modes.includes('in-person')) return 'in-person';
  if (modes.includes('hybrid')) return 'hybrid';
  if (modes.includes('online')) return 'online';
  return 'in-person';
}

// CIP labels + blurbs (caller can override with body.cipDescriptions)
const CIP_DEFAULTS: Record<string, { label: string; blurb: string }> = {
  '4805': {
    label: 'Metal Fabrication / Welding',
    blurb:
      'Hands-on metal fabrication: cutting, forming, and welding. Learn shop safety, print reading, and setup for multi-process welds & machining.',
  },
  '4803': {
    label: 'CNC / Precision Machining',
    blurb:
      'CNC setup & operation: read prints, CAM/G-code basics, tool selection, work offsets, and quality checks for precision parts.',
  },
  '1504': {
    label: 'Robotics / Automation',
    blurb:
      'Robotics & automation fundamentals: PLCs, sensors, motion, safety, and troubleshooting automated cells.',
  },
  '1506': {
    label: 'Industrial Maintenance',
    blurb:
      'Keep factories running: mechanical, electrical, hydraulics, pneumatics, and PLC troubleshooting with preventive maintenance.',
  },
  '1507': {
    label: 'Quality Control / Metrology',
    blurb:
      'Inspect & verify quality: GD&T, metrology, SPC/QA methods, and measurement tools.',
  },
};

// -----------------------  Bay Area mapping (preserved)  ----------------------
// Any city in this set will be normalized to the “Bay Area, CA” metro label.
const BAY_AREA_CITIES = new Set(
  [
    'san francisco', 'oakland', 'berkeley', 'richmond',
    'san leandro', 'hayward', 'fremont', 'union city',
    'san jose', 'santa clara', 'sunnyvale', 'mountain view',
    'palo alto', 'redwood city', 'menlo park', 'san mateo', 'daly city',
    'south san francisco', 'san bruno', 'millbrae', 'burlingame',
    'cupertino', 'milpitas', 'campbell', 'los gatos', 'morgan hill',
    'gilroy', 'newark', 'pleasanton', 'dublin', 'livermore',
    'walnut creek', 'concord', 'antioch', 'pittsburg', 'martinez',
    'san rafael', 'novato', 'petaluma', 'santa rosa', 'vallejo',
    'fairfield', 'vacaville', 'napa', 'san carlos', 'belmont',
    'foster city', 'san pablo', 'el cerrito', 'alameda',
  ].map((s) => s.toLowerCase())
);

/** Normalize (city,state) to a metro label when we can. */
function pickMetro(city?: string | null, state?: string | null, explicit?: string | null) {
  if (explicit) return explicit;
  const c = (city || '').trim().toLowerCase();
  const s = (state || '').trim().toUpperCase();

  if (s === 'CA' && BAY_AREA_CITIES.has(c)) return 'Bay Area, CA';
  return null; // otherwise, let it be empty and show city/state in UI
}

// --- College Scorecard fetch --------------------------------------------------
type ScorecardSchool = {
  id: number;
  'school.name': string;
  'school.city': string;
  'school.state': string;
  'school.school_url': string | null;
  'school.price_calculator_url'?: string | null;
};

async function fetchScorecardPage(opts: {
  page: number;
  perPage: number;
  cips: string[];         // array of 4-digit CIP roots
  states?: string[];      // optional filter
}) {
  const { page, perPage, cips, states } = opts;

  const fields = [
    'id',
    'school.name',
    'school.city',
    'school.state',
    'school.school_url',
    'school.price_calculator_url',
  ].join(',');

  const cipRoots = cips.map((c) => c.replace(/\D/g, '').slice(0, 4));

  const params = new URLSearchParams({
    api_key: SCORECARD_API_KEY!,
    fields,
    page: String(page),
    per_page: String(perPage),
    // >= 4-digit prefix for program.cip_4_digit
    'latest.programs.cip_4_digit.code__in': cipRoots.join(','),
    // Only schools with some URL we can send users to
    'school.school_url__not': '',
  });

  if (states?.length) {
    params.set('school.state__in', states.join(','));
  }

  const url = `https://api.data.gov/ed/collegescorecard/v1/schools.json?${params.toString()}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Scorecard request failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ results: ScorecardSchool[]; metadata: any }>;
}

// Build a ProgramRow from a Scorecard result
function rowFromScorecard(
  school: ScorecardSchool,
  cip4: string,
  deliveryModes: Delivery[],
  cipDescriptions: Record<string, string>
): ProgramRow {
  const name = CIP_DEFAULTS[cip4]?.label ?? `CIP ${cip4}`;
  const city = (school['school.city'] || '').trim() || null;
  const state = (school['school.state'] || '').trim() || null;

  const overrideText = cipDescriptions[cip4];
  const blurb =
    overrideText ??
    CIP_DEFAULTS[cip4]?.blurb ??
    'Career-focused training program.';

  // Prefer a program page URL if you have one (Scorecard doesn’t expose program URLs,
  // so we fall back to the school homepage; UI already hides rows without links if requested)
  const schoolUrl = school['school.school_url'] || null;

  const metro = pickMetro(city, state, null);

  return {
    title: name,
    school: school['school.name'],
    city,
    state,
    metro,
    delivery: friendlyDelivery(deliveryModes),
    lengthWeeks: null,
    cost: null,
    cip: cip4,
    description: blurb,
    url: schoolUrl,
    featured: false,
    source: 'college_scorecard',
  };
}

// Batch insert with chunking to avoid payload limits
async function insertBatch(rows: ProgramRow[]) {
  if (!rows.length) return { inserted: 0 };

  const CHUNK = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);

    // IMPORTANT: never send empty strings into UUID columns accidentally
    // (we only insert columns known in ProgramRow; DB fills id/created_at, etc.)
    const { error, count } = await supabaseAdmin!
      .from('programs')
      .insert(chunk, { count: 'exact' });

    if (error) throw error;
    inserted += count ?? chunk.length;
  }
  return { inserted };
}

// --- Auth / protection bypass -------------------------------------------------
function assertAuthorized(req: NextRequest) {
  // 1) Admin secret
  const hdr = req.headers.get('x-admin-secret') || '';
  if (ADMIN_SECRET && hdr && hdr === ADMIN_SECRET) return true;

  // 2) Vercel bot check bypass (optional)
  const autoBypassEnv = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const autoHdr = req.headers.get('x-vercel-protection-bypass') || '';
  if (autoBypassEnv && autoHdr && autoHdr === autoBypassEnv) return true;

  return false;
}

// --- POST handler -------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin || !SUPABASE_URL || !SERVICE_ROLE) {
      return bad(
        'Server not configured for Supabase admin access (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
        500
      );
    }

    // Handle 307/security-checkpoint loops by disabling prefetch cache
    const url = new URL(req.url);
    url.searchParams.set('_ts', String(Date.now()));

    // Auth
    if (!assertAuthorized(req)) {
      return bad('Unauthorized', 401);
    }

    // Body with sensible defaults
    const body = (await req.json().catch(() => ({}))) as Partial<{
      wipe: boolean;
      onlyWithLinks: boolean;
      deliveryModes: Delivery[];
      cips: string[];
      cipDescriptions: Record<string, string>;
      metros: string[];     // optional, we still normalize Bay Area from city/state
      states: string[];
      limitPerMetro: number;
      limitPerState: number;
    }>;

    let {
      wipe = false,
      onlyWithLinks = true,
      deliveryModes = ['in-person', 'online', 'hybrid'],
      cips = ['4805', '4803', '1504', '1506', '1507'],
      cipDescriptions = {},
      // metros is optional: we still infer Bay Area from city/state
      metros = [],
      states = [],
      limitPerMetro = 80,
      limitPerState = 300,
    } = body;

    // Merge caller CIP blurbs into defaults
    const CIP_BLURBS = { ...Object.fromEntries(
      Object.entries(CIP_DEFAULTS).map(([k, v]) => [k, v.blurb])
    ), ...cipDescriptions };

    if (wipe) {
  const { error: delErr } = await supabaseAdmin
    .from('programs')
    .delete()
    .not('id', 'is', null);  // delete where id IS NOT NULL
  if (delErr) throw delErr;
}


    if (!SCORECARD_API_KEY) {
      return bad(
        'Missing COLLEGE_SCORECARD_API_KEY (or SCORECARD_API_KEY) in environment.',
        500
      );
    }

    // Pull schools from College Scorecard in pages until we hit our limits
    const PER_PAGE = 100;
    let page = 0;
    const acc: ProgramRow[] = [];

    // We'll collect per-state counts to respect limitPerState
    const stateCounts = new Map<string, number>();

    while (true) {
      page += 1;
      const data = await fetchScorecardPage({
        page,
        perPage: PER_PAGE,
        cips,
        states: states.length ? states : undefined,
      });

      const results = data.results || [];
      if (!results.length) break;

      for (const s of results) {
        const city = (s['school.city'] || '').trim();
        const state = (s['school.state'] || '').trim().toUpperCase();
        if (!city || !state) continue;

        // Per-state limit
        const countForState = stateCounts.get(state) || 0;
        if (countForState >= limitPerState) continue;

        // Build one row per CIP requested (Scorecard doesn’t return one row per CIP)
        for (const cip4 of cips) {
          const row = rowFromScorecard(s, cip4, deliveryModes, CIP_BLURBS);

          if (onlyWithLinks && !row.url) continue;

          // Optional metro filtering: if caller provided metros, only keep those
          if (metros.length) {
            const metro = row.metro;
            if (!metro || !metros.includes(metro)) continue;
          }

          acc.push(row);

          stateCounts.set(state, (stateCounts.get(state) || 0) + 1);
          if (acc.length >= limitPerMetro * Math.max(1, metros.length || 1)) break;
        }
      }

      // Stop early if we’ve collected enough
      const totalTarget = limitPerMetro * Math.max(1, metros.length || 1);
      if (acc.length >= totalTarget) break;

      // Safety valve: cap at 25 pages
      if (page >= 25) break;
    }

    // Deduplicate by (school, title, city, state, url)
    const seen = new Set<string>();
    const deduped: ProgramRow[] = [];
    for (const r of acc) {
      const key = [r.school, r.title, r.city, r.state, r.url].join('||').toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }

    // Insert in batches
    const { inserted } = await insertBatch(deduped);

    return okJson({ ok: true, inserted });
  } catch (err: any) {
    console.error('[reset-programs] Error:', err);
    return bad(String(err?.message || err), 500);
  }
}

// Optional: reject GET to make it obvious this route is POST-only
export async function GET() {
  return bad('Use POST with x-admin-secret to reseed programs.', 405);
}
