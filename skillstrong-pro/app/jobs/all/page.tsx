// /app/jobs/all/page.tsx
'use client';

import useSWR from 'swr';
import { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const fetcher = (u: string) => fetch(u).then(r => r.json());

function JobResults() {
    const searchParams = useSearchParams();
    const [filters, setFilters] = useState({
        q: searchParams.get('q') || '',
        location: searchParams.get('location') || '',
        // REMOVED: skills: searchParams.get('skills') || '',
        // REMOVED: apprenticeship: searchParams.get('apprenticeship') === '1' || false,
    });

    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        if (filters.q) sp.set('q', filters.q);
        if (filters.location) sp.set('location', filters.location);
        // REMOVED: if (filters.skills) sp.set('skills', filters.skills);
        // REMOVED: if (filters.apprenticeship) sp.set('apprenticeship', '1');
        return sp.toString();
    // UPDATED dependencies
    }, [filters.q, filters.location]);

    const { data, error } = useSWR(`/api/jobs?${qs}`, fetcher);
    const jobs = data?.jobs || [];
    const isLoading = !data && !error;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Job Listings</h1>
            <p className="text-gray-600 mb-6">Browse all available jobs or use the filters to narrow your search.</p>

            {/* --- UPDATED Filter Bar --- */}
            <div className="grid md:grid-cols-2 gap-3 p-4 border rounded-lg bg-white mb-6 sticky top-20 z-10 shadow-sm">
                <input className="border rounded-md p-2" placeholder="Search title or keyword"
                    value={filters.q} onChange={e => setFilters(s => ({ ...s, q: e.target.value }))} />
                <input className="border rounded-md p-2" placeholder="City, ST, or Zip"
                    value={filters.location} onChange={e => setFilters(s => ({ ...s, location: e.target.value }))} />

                {/* REMOVED Skills Input */}
                {/* REMOVED Apprenticeship Checkbox */}
            </div>
             {/* --- END UPDATED Filter Bar --- */}


            {isLoading && <p className="text-center p-8">Loading jobs...</p>}
            <div className="grid gap-4">
                {!isLoading && jobs.map((j: any) => (
                    <div key={j.id} className="p-4 border rounded-lg bg-white shadow-sm">
                        <div className="flex items-start justify-between flex-wrap gap-x-4">
                            <div>
                                <a href={j.apply_url || j.external_url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-blue-700 hover:underline">{j.title}</a>
                                <div className="text-sm text-gray-600 mt-1">{j.company} • {j.location} {j.apprenticeship ? '• Apprenticeship' : ''}</div>
                            </div>
                            {(j.pay_min || j.pay_max) && (
                                <div className="text-sm font-medium text-gray-800 mt-1 sm:mt-0 whitespace-nowrap">
                                    {j.pay_min && `$${Number(j.pay_min).toLocaleString()}`}
                                    {(j.pay_min && j.pay_max) && ' – '}
                                    {j.pay_max && `$${Number(j.pay_max).toLocaleString()}`}
                                    { (j.pay_min || j.pay_max) && ' / yr'}
                                </div>
                            )}
                        </div>
                        {j.description && <p className="text-sm mt-2 text-gray-700 line-clamp-3">{j.description}</p>} {/* Added line-clamp */}
                        {j.skills && j.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {j.skills.map((skill: string) => (
                                    <span key={skill} className="px-2 py-1 text-xs rounded-full bg-gray-100 border">{skill}</span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {!isLoading && jobs.length === 0 && <div className="p-6 text-center border rounded-lg bg-white">No jobs match your filters.</div>}
            </div>
        </div>
    );
}

export default function JobsListPage() {
    return (
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
            <JobResults />
        </Suspense>
    );
}
