// /app/programs/all/page.tsx
'use client';

import useSWR from 'swr';
import { useMemo, useState, Suspense, useEffect } from 'react'; // Added useEffect
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const fetcher = (u: string) => fetch(u).then(r => r.json());

const states = ["All States", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

// Helper to parse location string "City, ST"
const parseLocationString = (locationStr: string | null): { city: string, state: string } => {
    if (!locationStr || !locationStr.includes(',')) return { city: '', state: '' };
    const parts = locationStr.split(',').map(s => s.trim());
    if (parts.length === 2 && parts[1].length === 2 && parts[1] === parts[1].toUpperCase()) {
        return { city: parts[0], state: parts[1] };
    }
    return { city: '', state: '' }; // Invalid format
};


function ProgramResults() {
    const searchParams = useSearchParams();
    // Initialize state based on current URL parameters for consistency
    const [filters, setFilters] = useState(() => {
        const initialLocation = searchParams.get('location');
        const initialCity = searchParams.get('city');
        const initialState = searchParams.get('state') || 'All States';
        let cityToSet = initialCity || '';
        let stateToSet = initialState;

        if (initialLocation && !initialCity && initialState === 'All States') {
            const parsed = parseLocationString(initialLocation);
            if (parsed.city && parsed.state && states.includes(parsed.state)) {
                cityToSet = parsed.city;
                stateToSet = parsed.state;
            }
        }
         return {
            q: searchParams.get('q') || '',
            city: cityToSet,
            state: stateToSet,
            duration: searchParams.get('duration') || '',
        };
    });


    // Effect to synchronize state with URL params if they change externally (e.g., back button)
     useEffect(() => {
        const currentQ = searchParams.get('q') || '';
        const currentCityParam = searchParams.get('city');
        const currentStateParam = searchParams.get('state') || 'All States';
        const currentDuration = searchParams.get('duration') || '';
        const currentLocationParam = searchParams.get('location');

        let cityToSet = currentCityParam || '';
        let stateToSet = currentStateParam;

        // If location param is present and others aren't, parse it
        if (currentLocationParam && !currentCityParam && currentStateParam === 'All States') {
             const parsed = parseLocationString(currentLocationParam);
             if (parsed.city && parsed.state && states.includes(parsed.state)) {
                 cityToSet = parsed.city;
                 stateToSet = parsed.state;
             }
        }


        setFilters(f => {
             // Only update if the derived values differ from current state
             if (f.q !== currentQ || f.city !== cityToSet || f.state !== stateToSet || f.duration !== currentDuration) {
                 return {
                     q: currentQ,
                     city: cityToSet,
                     state: stateToSet,
                     duration: currentDuration,
                 };
             }
             return f; // No change needed
         });
    }, [searchParams]); // Re-run when URL params change


    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        if (filters.q) sp.set('q', filters.q);
        if (filters.city) sp.set('city', filters.city); // Use city param
        if (filters.state && filters.state !== 'All States') sp.set('state', filters.state);
        if (filters.duration) sp.set('duration', filters.duration);
        return sp.toString();
    }, [filters.q, filters.city, filters.state, filters.duration]); // Updated dependencies

    const { data, error } = useSWR(`/api/programs?${qs}`, fetcher);
    const programs = data?.programs || [];
    const isLoading = !data && !error;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Program Listings</h1>
            <p className="text-gray-600 mb-6">Browse available programs or use the filters to narrow your search.</p>

            {/* --- UPDATED Filter Bar --- */}
            <div className="grid md:grid-cols-3 gap-3 p-4 border rounded-lg bg-white mb-6 sticky top-20 z-10 shadow-sm">
                <input className="border rounded-md p-2 md:col-span-3" placeholder="Search program or school"
                    value={filters.q} onChange={e => setFilters(s => ({ ...s, q: e.target.value }))} />

                {/* City Input */}
                <input className="border rounded-md p-2 md:col-span-1" placeholder="City (Optional)"
                    value={filters.city} onChange={e => setFilters(s => ({ ...s, city: e.target.value }))} />

                {/* State Dropdown */}
                <select className="border rounded-md p-2 md:col-span-2" value={filters.state} onChange={e => setFilters(s => ({...s, state: e.target.value}))}>
                    {states.map(st => <option key={st} value={st}>{st}</option>)}
                </select>

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
                {/* Results rendering */}
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
                          <div className="text-sm text-gray-600 mt-1">{p.city}, {p.state} {p.length_weeks ? `• ${p.length_weeks} weeks` : ''}</div>
                         {p.description && <p className="text-sm mt-2 text-gray-700 line-clamp-3">{p.description}</p>}
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
