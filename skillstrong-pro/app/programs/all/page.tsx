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
        // REMOVED: program_type: searchParams.get('program_type') || 'all',
        location: searchParams.get('location') || '',
        duration: searchParams.get('duration') || '', // Added to read duration from URL
    });

    // Update filters if URL parameters change (e.g., from trend clicks)
    // This is important because useState only initializes once.
    const currentQ = searchParams.get('q') || '';
    const currentState = searchParams.get('state') || 'All States';
    const currentLocation = searchParams.get('location') || '';
    const currentDuration = searchParams.get('duration') || '';

    if (filters.q !== currentQ || filters.state !== currentState || filters.location !== currentLocation || filters.duration !== currentDuration) {
        setFilters({
            q: currentQ,
            state: currentState,
            location: currentLocation,
            duration: currentDuration
        });
    }


    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        if (filters.q) sp.set('q', filters.q);
        if (filters.state && filters.state !== 'All States') sp.set('state', filters.state);
        // REMOVED: if (filters.program_type && filters.program_type !== 'all') sp.set('program_type', filters.program_type);
        if (filters.location) sp.set('location', filters.location);
        if (filters.duration) sp.set('duration', filters.duration); // Pass duration if present
        return sp.toString();
    // UPDATED dependencies
    }, [filters.q, filters.state, filters.location, filters.duration]);

    // Pass duration filter value to SWR key so it re-fetches when duration changes
    const { data, error } = useSWR(`/api/programs?${qs}`, fetcher);
    const programs = data?.programs || [];
    const isLoading = !data && !error;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Program Listings</h1>
            <p className="text-gray-600 mb-6">Browse all available programs or use the filters to narrow your search.</p>

            {/* --- UPDATED Filter Bar --- */}
            <div className="grid md:grid-cols-3 gap-3 p-4 border rounded-lg bg-white mb-6 sticky top-20 z-10 shadow-sm">
                <input className="border rounded-md p-2" placeholder="Search program or school"
                    value={filters.q} onChange={e => setFilters(s => ({ ...s, q: e.target.value }))} />

                <input className="border rounded-md p-2" placeholder="Location (City, ST)"
                    value={filters.location} onChange={e => setFilters(s => ({ ...s, location: e.target.value, state: 'All States' }))} />

                <select className="border rounded-md p-2" value={filters.state} onChange={e => setFilters(s => ({...s, state: e.target.value, location: ''}))}>
                    {states.map(st => <option key={st} value={st}>{st}</option>)}
                </select>

                {/* REMOVED Program Type Select */}

                {/* Optional: Display duration if set by URL param */}
                {filters.duration && (
                    <div className="md:col-span-3 text-sm text-slate-600 px-1 pt-1">
                        Filtering by duration: {filters.duration}
                        <button onClick={() => setFilters(s => ({...s, duration: ''}))} className="ml-2 text-blue-600 hover:underline text-xs">(Clear)</button>
                    </div>
                )}
            </div>
             {/* --- END UPDATED Filter Bar --- */}


            {isLoading && <p className="text-center p-8">Loading programs...</p>}
            <div className="grid gap-4">
                {!isLoading && programs.map((p: any) => (
                    <div key={p.id} className="p-4 border rounded-lg bg-white shadow-sm">
                         <a
                           href={p.url || p.external_url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-lg font-semibold text-blue-700 hover:underline"
                         >
                           {p.title}
                         </a>
                         <div className="text-md font-semibold text-gray-700 mt-1">{p.school}</div>
                         {/* Display duration if available */}
                         <div className="text-sm text-gray-600 mt-1">{p.city}, {p.state} {p.program_type ? `• ${p.program_type}` : ''} {p.length_weeks ? `• ${p.length_weeks} weeks` : ''}</div>
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
