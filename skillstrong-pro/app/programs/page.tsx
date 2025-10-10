// /app/programs/page.tsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type Program = {
  id: string;
  school: string;
  title?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  metro?: string | null;
  delivery?: 'in-person' | 'online' | 'hybrid' | null;
  length_weeks?: number | null;
  cost?: number | null;
  program_type?: 'Certificate' | 'Associate Degree' | 'Apprenticeship' | 'Non-Credit';
  description?: string | null;
  url?: string | null;
  external_url?: string | null;
};

export default function ProgramsPage() {
  const [filters, setFilters] = useState({
      q: '',
      location: '',
      program_type: 'all',
  });
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;
  const totalPages = Math.ceil(count / limit);
  const isInitialMount = useRef(true);

  const { data: filtersData } = useSWR('/api/programs/filters', fetcher);
  const metroChips = filtersData?.metros || [];

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.q) p.set('q', filters.q);
    if (filters.location) p.set('location', filters.location);
    if (filters.program_type !== 'all') p.set('program_type', filters.program_type);
    p.set('page', String(currentPage));
    p.set('limit', String(limit));
    return p.toString();
  }, [filters, currentPage]);

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

    return () => clearTimeout(handler);
  }, [filters]);

  useEffect(() => {
    if (!isInitialMount.current) {
        runSearch();
    }
  }, [currentPage]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-extrabold mb-4">Training Programs</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-4 border rounded-lg bg-white sticky top-20 z-10 shadow-sm">
        <input value={filters.q} onChange={(e) => setFilters(s => ({...s, q: e.target.value}))} placeholder="Search program or school" className="md:col-span-3 border rounded-md px-3 py-2" />
        <input value={filters.location} onChange={(e) => setFilters(s => ({...s, location: e.target.value}))} placeholder="City, State, or ZIP" className="md:col-span-2 border rounded-md px-3 py-2" />
        
        <select value={filters.program_type} onChange={(e) => setFilters(s => ({...s, program_type: e.target.value}))} className="border rounded-md px-3 py-2">
          <option value="all">Program Type (All)</option>
          <option value="Certificate">Certificate</option>
          <option value="Associate Degree">Associate Degree</option>
          <option value="Apprenticeship">Apprenticeship</option>
          <option value="Non-Credit">Non-Credit</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {metroChips.map((m: string) => (
          <button key={m} onClick={() => setFilters(s => ({...s, location: m}))} className={`px-3 py-1 rounded-full border text-sm ${ filters.location === m ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50' }`}>
            {m}
          </button>
        ))}
      </div>

      <div className="grid gap-5">
        {loading && <p className="text-center py-10">Loading programs...</p>}
        {!loading && programs.map((p: any) => (
          <article key={p.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">{p.title}</h3>
            <div className="text-sm text-gray-500 mt-1">{p.city}, {p.state} • {p.program_type}</div>
            <div className="text-md font-semibold text-gray-700 mt-3">{p.school}</div>
            <p className="text-gray-600 mt-2 line-clamp-3">{p.description}</p>

            <div className="text-sm text-gray-500 mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {p.length_weeks && <span>Length: ~{p.length_weeks} weeks</span>}
              {p.cost && <span>Est. cost: ${p.cost.toLocaleString()}</span>}
            </div>

            {(p.url || p.external_url) && (
              <div className="mt-4">
                <Link href={p.url || p.external_url} target="_blank" className="inline-block px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
                  Program Page
                </Link>
              </div>
            )}
          </article>
        ))}
        {!loading && programs.length === 0 && (
          <div className="text-center py-12 text-gray-500">No programs match your filters. Try a broader search.</div>
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
