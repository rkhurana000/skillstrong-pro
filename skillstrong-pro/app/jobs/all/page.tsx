// /app/jobs/all/page.tsx
'use client';

import useSWR from 'swr';
import { useMemo, useState, Suspense, useEffect } from 'react'; // Added useEffect
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const fetcher = (u: string) => fetch(u).then(r => r.json());

// State list
const states = ["All States", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

// Helper to parse location string "City, ST"
const parseLocationString = (locationStr: string | null): { city: string, state: string } => {
    if (!locationStr || !locationStr.includes(',')) return { city: '', state: '' };
    const parts = locationStr.split(',').map(s => s.trim());
    if (parts.length === 2 && parts[1].length === 2 && parts[1] === parts[1].toUpperCase()) {
        return { city: parts[0], state: parts[1] };
    }
     // Handle single state abbreviation?
     if (parts.length === 1 && parts[0].length === 2 && parts[0] === parts[0].toUpperCase() && states.includes(parts[0])) {
         return { city: '', state: parts[0] };
     }
      // Handle city only? Could check against a list, but risky. For now, assume invalid.
    return { city: '', state: '' }; // Invalid format
};


function JobResults() {
    const searchParams = useSearchParams();
     // Initialize state based on current URL parameters
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
            } else if (parsed.state && !parsed.city) { // Handle case where location is just "ST"
                 stateToSet = parsed.state;
            } else if (!parsed.state && initialLocation) { // Treat unparsed location as city? Risky.
                 // cityToSet = initialLocation; // Decided against this for now
            }
        }
         return {
            q: searchParams.get('q') || '',
            city: cityToSet,
            state: stateToSet,
        };
    });


     // Effect to synchronize state with URL params
    useEffect(() => {
        const currentQ = searchParams.get('q') || '';
        const currentCityParam = searchParams.get('city');
        const currentStateParam = searchParams.get('state') || 'All States';
        const currentLocationParam = searchParams.get('location');

        let cityToSet = currentCityParam || '';
        let stateToSet = currentStateParam;

        if (currentLocationParam && !currentCityParam && currentStateParam === 'All States') {
            const parsed = parseLocationString(currentLocationParam);
             if (parsed.city && parsed.state && states.includes(parsed.state)) {
                 cityToSet = parsed.city;
                 stateToSet = parsed.state;
             } else if (parsed.state && !parsed.city) {
                  stateToSet = parsed.state;
             }
        }

         setFilters(f => {
             if (f.q !== currentQ || f.city !== cityToSet || f.state !== stateToSet) {
                 return {
                     q: currentQ,
                     city: cityToSet,
                     state: stateToSet,
                 };
             }
             return f;
         });
    }, [searchParams]);


    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        if (filters.q) sp.set('q', filters.q);
        if (filters.city) sp.set('city', filters.city); // Use city param
        if (filters.state && filters.state !== 'All States') sp.set('state', filters.state); // Use state param
        return sp.toString();
    }, [filters.q, filters.city, filters.state]); // Updated dependencies

    const { data, error } = useSWR(`/api/jobs?${qs}`, fetcher);
    const jobs = data?.jobs || [];
    const isLoading = !data && !error;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Job Listings</h1>
            <p className="text-gray-600 mb-6">Browse all available jobs or use the filters to narrow your search.</p>

            {/* --- UPDATED Filter Bar --- */}
            <div className="grid md:grid-cols-3 gap-3 p-4 border rounded-lg bg-white mb-6 sticky top-20 z-10 shadow-sm">
                 <input className="border rounded-md p-2 md:col-span-3" placeholder="Search title or keyword"
                    value={filters.q} onChange={e => setFilters(s => ({ ...s, q: e.target.value }))} />

                {/* City Input */}
                <input className="border rounded-md p-2 md:col-span-1" placeholder="City (Optional)"
                    value={filters.city} onChange={e => setFilters(s => ({ ...s, city: e.target.value }))} />

                {/* State Dropdown */}
                <select className="border rounded-md p-2 md:col-span-2" value={filters.state} onChange={e => setFilters(s => ({...s, state: e.target.value}))}>
                    {states.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
            </div>
             {/* --- END UPDATED Filter Bar --- */}


            {isLoading && <p className="text-center p-8">Loading jobs...</p>}
            <div className="grid gap-4">
                {/* Results rendering */}
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
                                     { (j.pay_min || j.pay_max) && ' / hr'}
                                 </div>
                             )}
                         </div>
                         {j.description && <p className="text-sm mt-2 text-gray-700 line-clamp-3">{j.description}</p>}
                         {/* Skills display (still useful even if not filterable) */}
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
