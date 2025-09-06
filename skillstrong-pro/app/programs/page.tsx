// /app/programs/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Program = {
  id: string;
  school: string;
  title?: string | null;
  location?: string | null; // "City, ST"
  city?: string | null;     // optional if your API already splits it
  state?: string | null;
  metro?: string | null;
  delivery?: 'in-person' | 'online' | 'hybrid' | null;
  lengthWeeks?: number | null;
  cost?: number | null;
  cip?: string | null;      // e.g. "4805", "150702"
  description?: string | null;
  url?: string | null;      // program page we link to
  external_url?: string | null; // fallback (school domain, catalog, etc.)
  featured?: boolean | null;
};

// Friendly CIP text (add more as you like)
const CIP_INFO: Record<string, { name: string; blurb: string }> = {
  '4805': {
    name: 'Precision Metal Working (Welding & Machining)',
    blurb:
      'Hands-on metal fabrication: cutting, forming, welding, and safe shop practices with print reading and CNC setup.',
  },
  '4803': {
    name: 'CNC Machining Technology',
    blurb:
      'CNC setup & operation: read prints, CAM/G-code basics, tool selection, work offsets, and quality checks for precision parts.',
  },
  '1504': {
    name: 'Robotics & Automation',
    blurb:
      'PLCs, sensors, motion systems, safety, and troubleshooting automated cells.',
  },
  '1506': {
    name: 'Industrial Maintenance',
    blurb:
      'Mechanical, electrical, hydraulics, pneumatics, and PLC troubleshooting with preventive maintenance.',
  },
  '1507': {
    name: 'Quality Control / QA',
    blurb:
      'GD&T, metrology, SPC and practical QA methods with common measurement tools.',
  },
  '150702': {
    name: 'Quality Control Technology/Technician',
    blurb:
      'Use measurement tools, SPC, and QA methods to keep product quality high.',
  },
};

// Quick metro chips
const METRO_CHIPS = [
  'Bay Area, CA',
  'Los Angeles, CA',
  'San Diego, CA',
  'Phoenix, AZ',
  'Tucson, AZ',
  'Denver, CO',
  'Dallas–Fort Worth, TX',
  'Houston, TX',
  'Austin, TX',
  'Seattle, WA',
  'Portland, OR',
  'Chicago, IL',
  'Detroit, MI',
  'Columbus, OH',
  'Boston, MA',
  'New York City, NY',
  'Philadelphia, PA',
  'Atlanta, GA',
  'Miami, FL',
];

function safeHostname(u?: string | null) {
  try {
    if (!u) return null;
    const h = new URL(u).hostname;
    return h.replace(/^www\./, '');
  } catch {
    return null;
  }
}
function cityStateFromLocation(loc?: string | null) {
  const [city = '', state = ''] = (loc || '').split(',').map(s => s.trim());
  return { city, state };
}
function cipKeyFor(p: Program) {
  const k = (p.cip || '').trim().replace(/\D/g, '').slice(0, 6);
  return { full: k, short: k.slice(0, 4) };
}

export default function ProgramsPage() {
  const [q, setQ] = useState('');
  const [metro, setMetro] = useState('');
  const [delivery, setDelivery] = useState<'all' | 'in-person' | 'online' | 'hybrid'>('all');
  const [minWeeks, setMinWeeks] = useState('');
  const [maxWeeks, setMaxWeeks] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  // Build query string for /api/programs
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (metro) p.set('metro', metro);
    if (delivery !== 'all') p.set('delivery', delivery);
    if (minWeeks) p.set('lengthMin', minWeeks);
    if (maxWeeks) p.set('lengthMax', maxWeeks);
    if (maxCost) p.set('costMax', maxCost);
    // important: only request rows that actually have a link
    p.set('requireUrl', '1');
    return p.toString();
  }, [q, metro, delivery, minWeeks, maxWeeks, maxCost]);

  async function runSearch() {
    setLoading(true);
    try {
      const res = await fetch(`/api/programs?${queryString}`, { cache: 'no-store' });
      const data = await res.json();
      setPrograms(Array.isArray(data.programs) ? data.programs : []);
      setCount(typeof data.count === 'number' ? data.count : null);
    } catch {
      setPrograms([]);
      setCount(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- transform for display (this is where your snippet lives) ----
  const items = programs
    .filter(p => !!(p.url || p.external_url)) // hide entries that don’t link anywhere
    .map(p => {
      // Derive city/state if your API only returns `location`
      const locParts = (p.city && p.state)
        ? { city: p.city, state: p.state }
        : cityStateFromLocation(p.location);

      const { full, short } = cipKeyFor(p);
      const cipInfo = CIP_INFO[full] || CIP_INFO[short] || null;

      // What we’ll show as program title and blurb
      const programName = cipInfo?.name || p.title || 'Manufacturing Program';
      const blurb =
        (p.description && p.description.trim())
          ? p.description.trim()
          : (cipInfo?.blurb || 'Hands-on training for modern manufacturing careers.');

      const link = p.url || p.external_url || null;
      const domain = safeHostname(link || undefined);

      const metaBits: string[] = [];
      const place = [locParts.city, locParts.state].filter(Boolean).join(', ');
      if (place) metaBits.push(place);
      if (p.metro) metaBits.push(p.metro);
      metaBits.push(p.delivery || 'in-person');

      return {
        id: p.id,
        school: p.school,
        programName,
        blurb,
        lengthWeeks: p.lengthWeeks,
        cost: p.cost,
        link,
        domain,
        meta: metaBits.join(' • '),
      };
    });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-extrabold mb-4">Training Programs</h1>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search program or school"
          className="md:col-span-2 border rounded-md px-3 py-2"
        />
        <input
          value={metro}
          onChange={(e) => setMetro(e.target.value)}
          placeholder="Metro (e.g., Phoenix, AZ)"
          className="border rounded-md px-3 py-2"
        />
        <select
          value={delivery}
          onChange={(e) => setDelivery(e.target.value as any)}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">Delivery (all)</option>
          <option value="in-person">In-person</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <div className="flex gap-2">
          <input
            value={minWeeks}
            onChange={(e) => setMinWeeks(e.target.value)}
            placeholder="Min weeks"
            className="w-full border rounded-md px-3 py-2"
          />
          <input
            value={maxWeeks}
            onChange={(e) => setMaxWeeks(e.target.value)}
            placeholder="Max weeks"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <input
          value={maxCost}
          onChange={(e) => setMaxCost(e.target.value)}
          placeholder="Max cost"
          className="border rounded-md px-3 py-2 md:col-span-1"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={runSearch}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
        <button
          onClick={() => {
            setQ(''); setMetro(''); setDelivery('all');
            setMinWeeks(''); setMaxWeeks(''); setMaxCost('');
            setTimeout(runSearch, 0);
          }}
          className="px-4 py-2 rounded-md border"
          disabled={loading}
        >
          Clear
        </button>
        <div className="ml-auto text-sm text-gray-500">
          {typeof count === 'number' ? `${count} results` : ''}
        </div>
      </div>

      {/* Metro chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {METRO_CHIPS.map((m) => (
          <button
            key={m}
            onClick={() => { setMetro(m); setTimeout(runSearch, 0); }}
            className={`px-3 py-1 rounded-full border text-sm ${
              metro === m ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="grid gap-4">
        {items.map((it) => (
          <article key={it.id} className="rounded-xl border p-4">
            <h3 className="text-xl font-semibold">{it.school}</h3>
            <div className="text-gray-600 mt-1">{it.meta}</div>

            <div className="mt-3">
              <div className="font-medium">Program:</div>
              <div>{it.programName}</div>
            </div>

            <p className="text-gray-700 mt-2 line-clamp-3">{it.blurb}</p>

            <div className="text-sm text-gray-500 mt-2 flex gap-4">
              {typeof it.lengthWeeks === 'number' && it.lengthWeeks > 0 && (
                <span>Length: ~{it.lengthWeeks} weeks</span>
              )}
              {typeof it.cost === 'number' && it.cost > 0 && (
                <span>Est. cost: ${it.cost.toLocaleString()}</span>
              )}
              {it.domain && <span>{it.domain}</span>}
            </div>

            {it.link && (
              <div className="mt-3">
                <Link
                  href={it.link}
                  target="_blank"
                  className="inline-block px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Program page
                </Link>
              </div>
            )}
          </article>
        ))}
        {!loading && items.length === 0 && (
          <div className="text-gray-500">No programs match these filters.</div>
        )}
      </div>
    </div>
  );
}
