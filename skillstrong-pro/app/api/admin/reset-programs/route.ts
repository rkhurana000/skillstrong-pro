/* app/api/admin/reset-programs/route.ts
 *
 * Admin-only seeding endpoint for programs.
 *
 * ✅ Keeps Bay Area → random city distribution
 * ✅ Uses existing schema (adds `cip` support)
 * ✅ Real links via body "sources" OR "sourcesTable" in Supabase
 * ✅ Honors onlyWithLinks, deliveryModes, per-metro/state limits
 * ✅ No invalid-UUID delete; safe wipe
 */

import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

// ---------------------------- Security --------------------------------------

const ADMIN_HEADER = 'x-admin-secret';
const VERCL_PROTECTION_BYPASS = 'x-vercel-protection-bypass';

/** Checks admin header against env */
function isAuthorized(req: NextRequest): boolean {
  const incoming = req.headers.get(ADMIN_HEADER);
  const expected = process.env.ADMIN_SECRET;
  return !!expected && incoming === expected;
}

// --------------------------- Constants / Helpers ----------------------------

const ALLOWED_DELIVERY = new Set(['in-person', 'online', 'hybrid']);

/ Any city in this set will be normalized to the “Bay Area, CA” metro label.
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



const CITY_TEMPLATES = [
  'Community College of {CITY}',
  '{CITY} Technical Institute',
  '{CITY} Workforce Center',
  '{CITY} Manufacturing Academy',
  '{CITY} Career Institute',
];

type SeedBody = {
  wipe?: boolean;
  onlyWithLinks?: boolean;
  deliveryModes?: string[];
  cips?: string[];
  cipDescriptions?: Record<string, string>;
  metros?: string[];
  states?: string[];
  limitPerMetro?: number;
  limitPerState?: number;

  /** Inline real links (preferred for quick seeding) */
  sources?: Array<{
    school: string;
    title?: string;
    url: string;
    external_url?: string;
    city?: string;
    state?: string;
    metro?: string; // e.g. "Bay Area, CA"
    delivery?: 'in-person' | 'online' | 'hybrid';
    length_weeks?: number;
    cost?: number;
    description?: string;
    cip?: string; // optional; if not provided we’ll pick from provided cips[]
    start_date?: string; // YYYY-MM-DD
  }>;

  /** Name of a Supabase table to read source rows from (see SQL below) */
  sourcesTable?: string;
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cityFromMetro(metro: string): string {
  if (/bay area/i.test(metro)) return pick(BAY_AREA_CITIES);
  return metro.split(',')[0].trim();
}

function stateFromMetro(metro: string, fallback: string | null = null): string {
  const segs = metro.split(',').map(s => s.trim());
  const st = segs[segs.length - 1];
  return st && st.length <= 3 ? st : (fallback ?? 'CA');
}

function makeSchoolName(city: string) {
  return pick(CITY_TEMPLATES).replace('{CITY}', city);
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function monthStart(): string {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function sanitizeDelivery(modes?: string[]): Array<'in-person'|'online'|'hybrid'> {
  const safe = (modes ?? []).filter(m => ALLOWED_DELIVERY.has(m)) as any[];
  return (safe.length ? safe : ['in-person','online','hybrid']) as any;
}

function titleFromCipDesc(desc: string) {
  if (/quality/i.test(desc)) return 'Quality Control Technician';
  if (/robot|automation|PLC/i.test(desc)) return 'Robotics & Automation Technician';
  if (/maintenance|hydraulic|pneumatic/i.test(desc)) return 'Industrial Maintenance Technician';
  if (/CNC|G-code|machin/i.test(desc)) return 'CNC Operator / Machining';
  if (/weld|fabrication|metal/i.test(desc)) return 'Welding & Metal Fabrication';
  return 'Advanced Manufacturing Certificate';
}

function enrichDescription(desc: string, city: string, state: string, delivery: string, length_weeks: number, cost: number) {
  const line1 = (desc || 'Hands-on training for in-demand manufacturing roles.').trim().replace(/\s+/g, ' ').replace(/\.*$/, '.');
  const line2 = `Location: ${city}, ${state} · Delivery: ${delivery.replace('-', ' ')}`;
  const line3 = `Typical length: ${length_weeks} weeks · Est. cost: $${cost.toLocaleString()}`;
  return [line1, line2, line3].join('\n');
}

function hasUrl(s?: string | null) {
  return !!s && /^https?:\/\//i.test(s);
}

// --------------------------- Source acquisition -----------------------------

/**
 * Read candidate rows (with real links) from a Supabase table.
 * Expected columns (all optional except url): school, title, url, external_url,
 * city, state, metro, delivery, length_weeks, cost, description, cip, start_date
 */
async function fetchSourceRowsFromTable(
  table: string,
  {
    metros, states, onlyWithLinks, limitPerState
  }: { metros: string[]; states: string[]; onlyWithLinks: boolean; limitPerState: number; }
) {
  // Pull everything first; we’ll filter in memory—keeps SQL simple & robust.
  const { data, error } = await supabaseAdmin.from(table).select('*');
  if (error) throw error;
  const rows = (data ?? []) as any[];

  // Filter by link presence
  let filtered = rows.filter(r => hasUrl(r.url) || hasUrl(r.external_url));
  // Filter by metros/states if provided
  if (metros.length) {
    const metroSet = new Set(metros.map(m => m.toLowerCase()));
    filtered = filtered.filter(r => {
      const m = String(r.metro ?? '').toLowerCase();
      if (m) return metroSet.has(m);
      // fallback from city/state to "City, ST"
      if (r.city && r.state) {
        const implied = `${r.city}, ${r.state}`.toLowerCase();
        return [...metroSet].some(ms => implied.includes(ms.split(',')[1]?.trim() || '')); // matches state
      }
      return false;
    });
  } else if (states.length) {
    const stSet = new Set(states.map(s => s.toUpperCase()));
    filtered = filtered.filter(r => r.state && stSet.has(String(r.state).toUpperCase()));
  }

  // Cap by per-state (soft cap)
  const byState: Record<string, number> = {};
  const out: any[] = [];
  for (const r of filtered) {
    const st = String(r.state ?? '').toUpperCase() || 'XX';
    byState[st] ??= 0;
    if (byState[st] >= limitPerState) continue;
    byState[st] += 1;
    out.push(r);
  }
  return out;
}

// ------------------------------ Handler ------------------------------------

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Presence of bypass header is handled by Vercel; we just don’t block on it.
    req.headers.get(VERCL_PROTECTION_BYPASS);

    const body = (await req.json().catch(() => ({}))) as SeedBody;

    const {
      wipe = false,
      onlyWithLinks = true,
      deliveryModes = ['in-person','online','hybrid'],
      cips = [],
      cipDescriptions = {},
      metros = [],
      states = [],
      limitPerMetro = 50,
      limitPerState = 200,
      sources = [],
      sourcesTable
    } = body;

    const deliveries = sanitizeDelivery(deliveryModes);

    // Optional wipe (safe)
    if (wipe) {
      const { error: delErr } = await supabaseAdmin.from('programs').delete().not('id', 'is', null);
      if (delErr) throw delErr;
    }

    // If onlyWithLinks and no sources/sourcesTable, nothing to insert.
    if (onlyWithLinks && !sourcesTable && (!sources || sources.length === 0)) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        note: 'onlyWithLinks=true but no sources or sourcesTable provided.'
      });
    }

    // 1) Gather source rows (with links) if provided
    let sourceRows: any[] = [];
    if (sourcesTable) {
      const pulled = await fetchSourceRowsFromTable(sourcesTable, {
        metros, states, onlyWithLinks, limitPerState
      });
      sourceRows = pulled;
    }
    if (Array.isArray(sources) && sources.length) {
      // inline sources win (append & later dedup by URL)
      sourceRows.push(...sources);
    }

    // Dedup source rows by URL
    if (sourceRows.length) {
      const seen = new Set<string>();
      sourceRows = sourceRows.filter(r => {
        const url = String(r.url || r.external_url || '').trim();
        if (!hasUrl(url)) return false;
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
    }

    // 2) Build rows per metro, taking from sources when available.
    const perMetro = Math.max(1, Math.min(limitPerMetro, 500));
    const perState = Math.max(1, Math.min(limitPerState, 2000));
    const insertedByState: Record<string, number> = {};

    const output: any[] = [];
    const sourceByStateQueue: Record<string, any[]> = {};

    // Bucket sources by state for balanced pick
    if (sourceRows.length) {
      for (const s of sourceRows) {
        const st = String(s.state ?? '').toUpperCase() || 'XX';
        (sourceByStateQueue[st] ??= []).push(s);
      }
      // Shuffle each bucket lightly
      for (const st of Object.keys(sourceByStateQueue)) {
        sourceByStateQueue[st].sort(() => Math.random() - 0.5);
      }
    }

    for (const metro of metros.length ? metros : ['Bay Area, CA']) {
      const st = stateFromMetro(metro, states.find(s => metro.endsWith(s)) ?? null);
      insertedByState[st] ??= 0;

      let addedForMetro = 0;

      // Try to pull from sources first (real links)
      while (addedForMetro < perMetro && insertedByState[st] < perState) {
        let picked: any | null = null;

        // find a source row in same state (if any)
        const bucket = sourceByStateQueue[st];
        if (bucket && bucket.length) {
          picked = bucket.shift()!;
        }

        if (picked) {
          // Normalize & fill gaps
          const city = picked.city || cityFromMetro(metro);
          const state = (picked.state || st).toUpperCase();
          const delivery = (picked.delivery && ALLOWED_DELIVERY.has(picked.delivery)) ? picked.delivery : pick(deliveries);
          const cip = picked.cip || (cips.length ? pick(cips) : null);
          const cipDesc = cip ? (cipDescriptions[cip] || '') : '';
          const title = picked.title || (cipDesc ? titleFromCipDesc(cipDesc) : 'Advanced Manufacturing Program');
          const length_weeks = picked.length_weeks ?? randInt(8, 36);
          const cost = picked.cost ?? randInt(500, 6500);
          const school = picked.school || makeSchoolName(city);
          const url = hasUrl(picked.url) ? picked.url : picked.external_url;
          const start_date = picked.start_date || monthStart();
          const description = picked.description
            ? picked.description
            : enrichDescription(cipDesc, city, state, delivery, length_weeks, cost);

          // Enforce link presence if onlyWithLinks
          if (onlyWithLinks && !hasUrl(url)) {
            // skip this item
          } else {
            output.push({
              school,
              title,
              location: `${city}, ${state}`,
              description,
              length_weeks,
              cost,
              delivery,
              certs: cip ? [`CIP-${cip}`] : [],
              cip: cip ?? null,
              start_date,
              url,
              external_url: url,
              featured: false,
            });
            addedForMetro += 1;
            insertedByState[st] += 1;
          }
          continue;
        }

        // No source rows available for this state
        // If onlyWithLinks is true, stop creating synthetic ones
        if (onlyWithLinks) break;

        // Synthetic fallback (will create placeholder links — you likely want onlyWithLinks=false to allow these)
        const city = cityFromMetro(metro);
        const delivery = pick(deliveries);
        const cip = cips.length ? pick(cips) : null;
        const cipDesc = cip ? (cipDescriptions[cip] || '') : '';
        const title = cipDesc ? titleFromCipDesc(cipDesc) : 'Advanced Manufacturing Program';
        const length_weeks = randInt(8, 36);
        const cost = randInt(500, 6500);
        const school = makeSchoolName(city);
        const state = st.toUpperCase();
        const url = `https://example.edu/${encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}`;
        const description = enrichDescription(cipDesc, city, state, delivery, length_weeks, cost);

        output.push({
          school,
          title,
          location: `${city}, ${state}`,
          description,
          length_weeks,
          cost,
          delivery,
          certs: cip ? [`CIP-${cip}`] : [],
          cip: cip ?? null,
          start_date: monthStart(),
          url,
          external_url: url,
          featured: false,
        });
        addedForMetro += 1;
        insertedByState[st] += 1;
      }
    }

    if (!output.length) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        note: onlyWithLinks
          ? 'No rows inserted because onlyWithLinks=true and no valid links found in sources.'
          : 'No rows generated (check limits or inputs).'
      });
    }

    // Chunked insert
    let inserted = 0;
    const CHUNK = 500;
    for (let i = 0; i < output.length; i += CHUNK) {
      const chunk = output.slice(i, i + CHUNK);
      const { error } = await supabaseAdmin.from('programs').insert(chunk);
      if (error) throw error;
      inserted += chunk.length;
    }

    return NextResponse.json({ ok: true, inserted });

  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
