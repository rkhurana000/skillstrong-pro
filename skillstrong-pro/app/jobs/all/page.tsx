// /app/jobs/all/page.tsx
'use client';

import useSWR from 'swr';
import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const fetcher = (u: string) => fetch(u).then(r => r.json());

function JobResults() {
    const searchParams = useSearchParams();
    const [filters, setFilters] = useState({
        q: searchParams.get('q') || '',
        location: searchParams.get('location') || '',
        skills: searchParams.get('skills') || '',
        apprenticeship: searchParams.get('apprenticeship') === '1' || false,
    });

    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        if (filters.q) sp.set('q', filters.q);
        if (filters.location) sp.set('location', filters.location);
        if (filters.skills) sp.set('skills', filters.skills);
        if (filters.apprenticeship) sp.set('apprenticeship', '1');
        return sp.toString();
    }, [filters]);

    const { data, error } = useSWR(`/api/jobs${qs ? `?${qs}` : ''}`, fetcher);
    const jobs = data?.jobs || [];
    const isLoading = !data && !error;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Job Listings</h1>
            <p className="text-gray-600 mb-6">Browse all available jobs or use the filters to narrow your search.</p>

            <div className="grid md:grid-cols-4 gap-3 p-4 border rounded-lg bg-white mb-6 sticky top-20 z-10">
                <input className="border rounded-md p-2 md:col-span-2" placeholder="Search title or keyword"
                    value={filters.q} onChange={e => setFilters(s => ({ ...s, q: e.target.value }))} />
                <input className="border rounded-md p-2" placeholder="City, ST"
                    value={filters.location} onChange={e => setFilters(s => ({ ...s, location: e.target.value }))} />
                <input className="border rounded-md p-2" placeholder="Skills (comma-separated)"
                    value={filters.skills} onChange={e => setFilters(s => ({ ...s, skills: e.target.value }))} />
                <label className="flex items-center gap-2 md:col-span-4">
                    <input type="checkbox" checked={filters.apprenticeship}
                        onChange={e => setFilters(s => ({ ...s, apprenticeship: e.target.checked }))} />
                    Apprenticeships only
                </label>
            </div>

            {isLoading && <p>Loading jobs...</p>}
            <div className="grid gap-4">
                {!isLoading && jobs.map((j: any) => (
                    <div key={j.id} className="p-4 border rounded-lg bg-white shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <a href={j.apply_url || j.external_url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-blue-700 hover:underline">{j.title}</a>
                                <div className="text-sm text-gray-600 mt-1">{j.company} • {j.location}</div>
                            </div>
                        </div>
                        {j.description && <p className="text-sm mt-2 text-gray-700">{j.description.substring(0, 250)}...</p>}
                        {j.skills && j.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {j.skills.map((skill: string) => (
                                    <span key={skill} className="px-2 py-1 text-xs rounded-full bg-gray-100 border">{skill}</span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {!isLoading && jobs.length === 0 && <div className="p-6 border rounded-lg bg-white">No jobs match your filters.</div>}
            </div>
        </div>
    );
}

export default function JobsListPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <JobResults />
        </Suspense>
    );
}
