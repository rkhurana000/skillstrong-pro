// /app/programs/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Program = {
  id: string;
  school: string;
  title?: string;          // program title from source (optional)
  city?: string | null;
  state?: string | null;
  metro?: string | null;
  delivery?: 'in-person' | 'online' | 'hybrid' | null;
  lengthWeeks?: number | null;
  cost?: number | null;
  cip?: string | null;     // e.g. "4805", "150702"
  description?: string | null;
  url?: string | null;
  featured?: boolean | null;
};

// CIP lookup for friendly text
const CIP_INFO: Record<string, { name: string; blurb: string }> = {
  // Precision Metal Working (Welding & Machining)
  '4805': {
    name: 'Precision Metal Working (Welding & Machining)',
    blurb:
      'Hands-on metalworking: read drawings, set up CNC/lathes, and produce precise parts.',
  },
  // Quality Control Technology/Technician
  '150702': {
    name: 'Quality Control Technology/Technician',
    blurb:
      'Use measurement tools, SPC, and QA methods to keep product quality high.',
  },
};

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

export default function ProgramsPage() {
  const [q, setQ] = useState('');
  const [metro, setMetro] = useState('');
  const [delivery, setDelivery] = useState<'all' | 'in-person' | 'online' | 'hybrid'>('all');
  const [minWeeks, setMinWeeks] = useState<string>('');
  const [maxWeeks, setMaxWeeks] = useState<string>('');
  const [maxCost, setMaxCost] = useState<string>('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (metro) p.set('metro', metro);
    if (delivery !== 'all') p.set('delivery', delivery);
    if (minWeeks) p.set('lengthMin', minWeeks);
    if (maxWeeks) p.set('lengthMax', maxWeeks);
    if (maxCost) p.set('costMax', maxCost);
    // Only show rows that actually have a link
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
        {programs.map((p) => {
          // Friendly fields
          const place = [p.city, p.state].filter(Boolean).join(', ');
          const modality = p.delivery || 'in-person';
          const cipKey =
            (p.cip || '')
              .trim()
              .replace(/\D/g, '')
              .slice(0, 6) || '';
          const cipShort = cipKey.slice(0, 4); // “4805” bucket
          const cipInfo =
            CIP_INFO[cipKey] || CIP_INFO[cipShort] || null;

          const programName =
            cipInfo?.name || p.title || 'Manufacturing Program';

          const blurb =
            (p.description && p.description.trim() ? p.description.trim() : cipInfo?.blurb) ||
            'Hands-on training for modern manufacturing careers.';

          const metaBits: string[] = [];
          if (place) metaBits.push(place);
          if (p.metro) metaBits.push(p.metro);
          metaBits.push(modality);

          return (
            <article key={p.id} className="rounded-xl border p-4">
              <h3 className="text-xl font-semibold">{p.school}</h3>
              <div className="text-gray-600 mt-1">{metaBits.join(' • ')}</div>

              <div className="mt-3">
                <div className="font-medium">Program:</div>
                <div>{programName}</div>
              </div>

              <p className="text-gray-700 mt-2 line-clamp-3">{blurb}</p>

              <div className="text-sm text-gray-500 mt-2 flex gap-4">
                {typeof p.lengthWeeks === 'number' && p.lengthWeeks > 0 && (
                  <span>Length: ~{p.lengthWeeks} weeks</span>
                )}
                {typeof p.cost === 'number' && p.cost > 0 && (
                  <span>Est. cost: ${p.cost.toLocaleString()}</span>
                )}
              </div>

              {p.url && (
                <div className="mt-3">
                  <Link
                    href={p.url}
                    target="_blank"
                    className="inline-block px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Program page
                  </Link>
                </div>
              )}
            </article>
          );
        })}
        {!loading && programs.length === 0 && (
          <div className="text-gray-500">No programs match these filters.</div>
        )}
      </div>
    </div>
  );
}
