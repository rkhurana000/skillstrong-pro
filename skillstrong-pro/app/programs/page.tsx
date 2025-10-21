// /app/programs/page.tsx
'use client';

import { useState, useEffect } from 'react'; // Added useEffect
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, MapPin, Clock, Search, Bot } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    }
    return res.json();
});

const TrendLink = ({ item, type }: { item: string; type: 'q' | 'location' | 'duration' }) => (
    <Link
      key={item}
      href={`/programs/all?${type}=${encodeURIComponent(item)}`}
      className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-blue-100 hover:text-blue-800 transition-colors"
    >
        {item}
    </Link>
);

const trendingKeywords = [
    'Welding', 'Robotics', 'CNC', 'Machinist', 'Additive', 'Quality Control',
    'Manufacturing', 'Maintenance', 'Automation', 'Technician', 'Fabrication', 'Mechatronics'
];

const states = ["All States", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export default function ProgramsPage() {
  const router = useRouter();
  // Fetch locations and durations
  const { data: trendData, error: trendError, isLoading: isLoadingTrends } = useSWR('/api/programs/trends', fetcher);
  const [keyword, setKeyword] = useState('');
  const [state, setState] = useState('All States');
  const [programType, setProgramType] = useState('all');

  // Add logging to see what's happening with the fetch
  useEffect(() => {
    console.log("Trend Data:", trendData);
    console.log("Trend Error:", trendError);
    console.log("Is Loading Trends:", isLoadingTrends);
  }, [trendData, trendError, isLoadingTrends]);


  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (state !== 'All States') params.set('state', state);
    if (programType !== 'all') params.set('program_type', programType);
    router.push(`/programs/all?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Search Bar Section */}
      <section className="bg-slate-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Find Your Training Program</h1>
          <p className="mb-8 text-lg text-slate-300 max-w-2xl mx-auto">
            Discover certificates, degrees, and apprenticeships to launch your manufacturing career.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto bg-white p-2 rounded-lg shadow-lg">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Program, School or Keyword"
              className="p-3 rounded-md flex-grow text-black border-gray-200 border"
            />
            <select value={state} onChange={e => setState(e.target.value)} className="p-3 rounded-md text-black border-gray-200 border">
                {states.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
             <select value={programType} onChange={e => setProgramType(e.target.value)} className="p-3 rounded-md text-black border-gray-200 border">
                <option value="all">Program Type (All)</option>
                <option value="Certificate">Certificate</option>
                <option value="Associate Degree">Associate Degree</option>
                <option value="Apprenticeship">Apprenticeship</option>
                <option value="Non-Credit">Non-Credit</option>
            </select>
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-md text-white font-semibold flex items-center justify-center"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Trends Section - Added More Robust Checks */}
      <section className="max-w-6xl mx-auto py-16 px-4">
        {isLoadingTrends && <p className="text-center text-lg font-semibold">Loading trends...</p>}
        {trendError && (
            <p className="text-center text-red-600 font-semibold">
                Failed to load trends: {trendError.message || "Unknown error"}
            </p>
        )}

        {/* Only render the grid if not loading and no error */}
        {!isLoadingTrends && !trendError && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Card 1: Hardcoded Keywords (Should always render if no error) */}
             <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                      <BookOpen className="text-blue-600"/>
                      <h2 className="text-xl font-bold text-gray-800">Explore Program Fields</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {trendingKeywords.map((kw) => (
                          <TrendLink key={kw} item={kw} type="q" />
                      ))}
                  </div>
              </div>

              {/* Card 2: Popular Locations (Check if data exists) */}
              {trendData && trendData.popularLocations && trendData.popularLocations.length > 0 ? (
                  <div className="bg-white p-6 rounded-lg border shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                          <MapPin className="text-blue-600"/>
                          <h2 className="text-xl font-bold text-gray-800">Popular Locations</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {trendData.popularLocations.map((loc: string) => (
                              <TrendLink key={loc} item={loc} type="location" />
                          ))}
                      </div>
                  </div>
              ) : (
                  <div className="bg-white p-6 rounded-lg border shadow-sm text-gray-500">No popular locations found.</div>
              )}

               {/* Card 3: Course Duration (Check if data exists) */}
              {trendData && trendData.commonDurations && trendData.commonDurations.length > 0 ? (
                  <div className="bg-white p-6 rounded-lg border shadow-sm">
                       <div className="flex items-center gap-3 mb-4">
                          <Clock className="text-blue-600"/>
                          <h2 className="text-xl font-bold text-gray-800">Common Durations</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {trendData.commonDurations.map((dur: string) => (
                               <TrendLink key={dur} item={dur} type="duration" />
                          ))}
                      </div>
                  </div>
              ) : (
                   <div className="bg-white p-6 rounded-lg border shadow-sm text-gray-500">No duration data found.</div>
              )}
          </div>
        )}
        {/* Render fallback message if data is empty even after loading without error */}
        {!isLoadingTrends && !trendError && !trendData && (
             <p className="text-center text-gray-500">Trend data could not be loaded.</p>
        )}
      </section>

      {/* CTA Section */}
      <section className="py-16 text-center px-4">
          <h2 className="text-3xl font-bold">Not Sure Where to Start?</h2>
          <p className="mt-2 text-slate-600">Let our AI coach guide you to the perfect manufacturing career.</p>
          <Link href="/chat" className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
              <Bot className="w-5 h-5 mr-2" /> Chat with Coach Mach
          </Link>
      </section>
    </div>
  );
}
