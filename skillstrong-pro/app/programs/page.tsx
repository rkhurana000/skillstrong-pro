// /app/programs/page.tsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';

type Program = {
  id: string;
  school: string;
  title?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  metro?: string | null;
  delivery?: 'in-person' | 'online' | 'hybrid' | null;
  lengthWeeks?: number | null;
  cost?: number | null;
  cip?: string | null;
  description?: string | null;
  url?: string | null;
  external_url?: string | null;
  featured?: boolean | null;
};

const CIP_INFO: Record<string, { name: string; blurb: string }> = {
  '4805': { name: 'Precision Metal Working (Welding & Machining)', blurb: 'Hands-on metal fabrication: cutting, forming, welding, and safe shop practices with print reading and CNC setup.' },
  '4803': { name: 'CNC Machining Technology', blurb: 'CNC setup & operation: read prints, CAM/G-code basics, tool selection, work offsets, and quality checks for precision parts.' },
  '1504': { name: 'Robotics & Automation', blurb: 'PLCs, sensors, motion systems, safety, and troubleshooting automated cells.' },
  '1506': { name: 'Industrial Maintenance', blurb: 'Mechanical, electrical, hydraulics, pneumatics, and PLC troubleshooting with preventive maintenance.' },
  '1507': { name: 'Quality Control / QA', blurb: 'GD&T, metrology, SPC and practical QA methods with common measurement tools.' },
  '150702': { name: 'Quality Control Technology/Technician', blurb: 'Use measurement tools, SPC, and QA methods to keep product quality high.' },
};

const METRO_CHIPS = [
  'Bay Area, CA', 'Los Angeles, CA', 'San Diego, CA', 'Phoenix, AZ', 'Tucson, AZ', 'Denver, CO',
  'Dallas–Fort Worth, TX', 'Houston, TX', 'Austin, TX', 'Seattle, WA', 'Portland, OR',
  'Chicago, IL', 'Detroit, MI', 'Columbus, OH', 'Boston, MA', 'New York City, NY',
  'Philadelphia, PA', 'Atlanta, GA', 'Miami, FL',
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
  const k = (String(p.cip || '')).trim().replace(/\D/g, '').slice(0, 6);
  return { full: k, short: k.slice(0, 4) };
}

export default function ProgramsPage() {
  const [q, setQ] = useState('');
  const [metro, setMetro] = useState('');
  const [delivery, setDelivery] = useState<'all' | 'in-person' | 'online' | 'hybrid'>('all');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;
  const totalPages = Math.ceil(count / limit);
  const isInitialMount = useRef(true);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (metro) p.set('metro', metro);
    if (delivery !== 'all') p.set('delivery', delivery);
    p.set('requireUrl', '1');
    p.set('page', String(currentPage));
    p.set('limit', String(limit));
    return p.toString();
  }, [q, metro, delivery, currentPage]);

  async function runSearch() {
    setLoading(true);
    try {
      const res = await fetch(`/api/programs?${queryString}`, { cache: 'no-store' });
      const data = await res.json();
      setPrograms(Array.isArray(data.programs) ? data.programs : []);
      setCount(typeof data.count === 'number' ? data.count : 0);
    } catch {
      setPrograms([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      if (isInitialMount.current) {
        runSearch();
        isInitialMount.current = false;
      } else {
        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          runSearch();
        }
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [q, metro, delivery]);

  useEffect(() => {
    if (!isInitialMount.current) {
        runSearch();
    }
  }, [currentPage]);

  const items = programs
    .filter(p => !!(p.url || p.external_url))
    .map(p => {
      const locParts = (p.city && p.state) ? { city: p.city, state: p.state } : cityStateFromLocation(p.location);
      const { full, short } = cipKeyFor(p);
      const cipInfo = CIP_INFO[full] || CIP_INFO[short] || null;
      const programName = cipInfo?.name || p.title || 'Manufacturing Program';
      const blurb = (p.description && p.description.trim()) ? p.description.trim() : (cipInfo?.blurb || 'Hands-on training for modern manufacturing careers.');
      const link = p.url || p.external_url || null;
      const domain = safeHostname(link);
      const metaBits: string[] = [];
      const place = [locParts.city, locParts.state].filter(Boolean).join(', ');
      if (place) metaBits.push(place);
      metaBits.push(p.delivery || 'in-person');
      return { id: p.id, school: p.school, programName, blurb, lengthWeeks: p.lengthWeeks, cost: p.cost, link, domain, meta: metaBits.join(' • ') };
    });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-extrabold mb-4">Training Programs</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-4 border rounded-lg bg-white sticky top-20 z-10 shadow-sm">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search program or school" className="md:col-span-2 border rounded-md px-3 py-2" />
        <input value={metro} onChange={(e) => setMetro(e.target.value)} placeholder="Metro (e.g., Phoenix, AZ)" className="border rounded-md px-3 py-2" />
        <select value={delivery} onChange={(e) => setDelivery(e.target.value as any)} className="border rounded-md px-3 py-2">
          <option value="all">Delivery (all)</option>
          <option value="in-person">In-person</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {METRO_CHIPS.map((m) => (
          <button key={m} onClick={() => { setMetro(m); }} className={`px-3 py-1 rounded-full border text-sm ${ metro === m ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50' }`}>
            {m}
          </button>
        ))}
      </div>

      <div className="grid gap-5">
        {loading && <p className="text-center py-10">Loading programs...</p>}
        {!loading && items.map((it) => (
          <article key={it.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">{it.programName}</h3>
            <div className="text-sm text-gray-500 mt-1">{it.meta}</div>
            <div className="text-md font-semibold text-gray-700 mt-3">{it.school}</div>
            <p className="text-gray-600 mt-2 line-clamp-3">{it.blurb}</p>

            <div className="text-sm text-gray-500 mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {typeof it.lengthWeeks === 'number' && it.lengthWeeks > 0 && (
                <span>Length: ~{it.lengthWeeks} weeks</span>
              )}
              {typeof it.cost === 'number' && it.cost > 0 && (
                <span>Est. cost: ${it.cost.toLocaleString()}</span>
              )}
            </div>

            {it.link && (
              <div className="mt-4">
                <Link href={it.link} target="_blank" className="inline-block px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
                  Program Page
                </Link>
              </div>
            )}
          </article>
        ))}
        {!loading && items.length === 0 && (
          <div className="text-center py-12 text-gray-500">No programs match your filters.</div>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading} className="px-4 py-2 rounded-md border disabled:opacity-50">
            Previous
          </button>
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading} className="px-4 py-2 rounded-md border disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
