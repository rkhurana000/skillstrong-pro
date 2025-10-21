// /app/programs/all/page.tsx
'use client';

import useSWR from 'swr';
import { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const fetcher = (u: string) => fetch(u).then(r => r.json());

const states = ["All States", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

function ProgramResults() {
    const searchParams = useSearchParams();
    const [filters, setFilters] = useState({
        q: searchParams.get('q') || '',
        state: searchParams.get('state') || 'All States',
        program_type: searchParams.get('program_type') || 'all',
        location: searchParams.get('location') || '', // ADDED
    });

    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        if (filters.q) sp.set('q', filters.q);
        if (filters.state && filters.state !== 'All States') sp.set('state', filters.state);
        if (filters.program_type && filters.program_type !== 'all') sp.set('program_type', filters.program_type);
        if (filters.location) sp.set('location', filters.location); // ADDED
        return sp.toString();
    }, [filters.q, filters.state, filters.program_type, filters.location]); // UPDATED dependencies

    const { data, error } = useSWR(`/api/programs?${qs}`, fetcher);
    const programs = data?.programs || [];
    const isLoading = !data && !error;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Program Listings</h1>
            <p className="text-gray-600 mb-6">Browse all available programs or use the filters to narrow your search.</p>

            {/* UPDATED: Added location input and changed grid cols */}
            <div className="grid md:grid-cols-4 gap-3 p-4 border rounded-lg bg-white mb-6 sticky top-20 z-10 shadow-sm">
                <input className="border rounded-md p-2 md:col-span-2" placeholder="Search program or school"
                    value={filters.q} onChange={e => setFilters(s => ({ ...s, q: e.target.value }))} />
                
                <input className="border rounded-md p-2 md:col-span-2" placeholder="Location (City, ST)"
                    value={filters.location} onChange={e => setFilters(s => ({ ...s, location: e.target.value, state: 'All States' }))} />
                
                <select className="border rounded-md p-2 md:col-span-2" value={filters.state} onChange={e => setFilters(s => ({...s, state: e.target.value, location: ''}))}>
                    {states.map(st => <option key={st} value={st}>{st}</option>)}
                </select>

                <select className="border rounded-md p-2 md:col-span-2" value={filters.program_type} onChange={e => setFilters(s => ({...s, program_type: e.target.value}))}>
                    <option value="all">Program Type (All)</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Associate Degree">Associate Degree</option>
                    <option value="Apprenticeship">Apprenticeship</option>
                    <option value="Non-Credit">Non-Credit</option>
                </select>
            </div>

            {isLoading && <p className="text-center p-8">Loading programs...</p>}
            <div className="grid gap-4">
                {!isLoading && programs.map((p: any) => (
                    <div key={p.id} className="p-4 border rounded-lg bg-white shadow-sm">
                         {/* CHANGED: Wrapped title in a link */}
                         <a 
                           href={p.url || p.external_url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-lg font-semibold text-blue-700 hover:underline"
                         >
                           {p.title}
                         </a>
                         <div className="text-md font-semibold text-gray-700 mt-1">{p.school}</div>
                         <div className="text-sm text-gray-600 mt-1">{p.city}, {p.state} • {p.program_type}</div>
                        {p.description && <p className="text-sm mt-2 text-gray-700">{p.description.substring(0, 250)}...</p>}
                    </div>
                ))}
                {!isLoading && programs.length === 0 && <div className="p-6 text-center border rounded-lg bg-white">No programs match your filters.</div>}
            </div>
        </div>
    );
}

export default function ProgramsListPage() {
    return (
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
            <ProgramResults />
        </Suspense>
    );
}
