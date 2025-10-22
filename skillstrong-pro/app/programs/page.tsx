// /app/programs/page.tsx
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, MapPin, Clock, Search, Bot } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Function to convert weeks to a month string
const weeksToMonthsStr = (weeks: number): string => {
    if (isNaN(weeks) || weeks <= 0) return ""; // Handle invalid input
    if (weeks <= 4) return "1 month";
    const months = Math.round(weeks / 4.33); // Use average weeks per month
    return `${months} months`;
};


const TrendCard = ({ title, icon, data, type, isDuration = false }: { title: string; icon: React.ReactNode; data: string[]; type: 'q' | 'location' | 'duration'; isDuration?: boolean }) => (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
            {data?.map((item) => {
                // If it's duration data, convert weeks number string to months string for display
                const displayItem = isDuration ? weeksToMonthsStr(parseInt(item.replace(/\D/g,''), 10)) : item;
                // Keep the link parameter as weeks for filtering consistency
                const linkParam = item; // Link always uses original value (weeks or location string)

                // Skip rendering if displayItem is empty (e.g., invalid duration)
                if (!displayItem) return null;

                return (
                    <Link
                      key={item} // Use original item for key
                      href={`/programs/all?${type}=${encodeURIComponent(linkParam)}`}
                      className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-blue-100 hover:text-blue-800 transition-colors"
                    >
                        {displayItem}
                    </Link>
                );
            })}
        </div>
    </div>
);


const states = ["All States", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export default function ProgramsPage() {
  const router = useRouter();
  const { data, error } = useSWR('/api/programs/trends', fetcher);
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState(''); // NEW city state
  const [state, setState] = useState('All States');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (city) params.set('city', city); // Use city param
    if (state !== 'All States') params.set('state', state);
    router.push(`/programs/all?${params.toString()}`);
  };

  const isLoading = !data && !error;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <section className="bg-slate-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Find Your Training Program</h1>
          <p className="mb-8 text-lg text-slate-300 max-w-2xl mx-auto">
            Discover certificates, degrees, and apprenticeships to launch your manufacturing career.
          </p>
          {/* --- UPDATED Search Bar --- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-2xl mx-auto bg-white p-2 rounded-lg shadow-lg">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Program or School"
              className="p-3 rounded-md text-black border-gray-200 border w-full sm:col-span-1" // Adjusted width
            />
            {/* NEW City Input */}
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (Optional)"
              className="p-3 rounded-md text-black border-gray-200 border w-full sm:col-span-1" // Adjusted width
            />
            {/* State Dropdown */}
            <div className="flex gap-2 sm:col-span-1"> {/* Wrapper for dropdown and button */}
                <select value={state} onChange={e => setState(e.target.value)} className="p-3 rounded-md text-black border-gray-200 border flex-grow">
                    {states.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-md text-white font-semibold flex items-center justify-center" // Adjusted padding
                >
                  <Search className="w-5 h-5" />
                </button>
            </div>
          </div>
          {/* --- END UPDATED Search Bar --- */}
        </div>
      </section>

      {/* Trend Cards and CTA sections */}
      <section className="max-w-6xl mx-auto py-16 px-4">
             {isLoading && <p className="text-center">Loading program trends...</p>}
             {error && <p className="text-center text-red-500">Failed to load program trends.</p>}
             {data && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <TrendCard title="Trending Programs" icon={<BookOpen className="text-blue-600"/>} data={data.trendingPrograms || []} type="q" />
                 {/* Update Trend Card link generation if needed, though location string might still work */}
                 <TrendCard title="Popular Locations" icon={<MapPin className="text-blue-600"/>} data={data.popularLocations || []} type="location" />
                 <TrendCard title="Course Duration" icon={<Clock className="text-blue-600"/>} data={data.commonDurations || []} type="duration" isDuration={true}/>
               </div>
             )}
      </section>
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
