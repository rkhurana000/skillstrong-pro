// /app/jobs/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, MapPin, ListChecks, Search, Bot, ChevronLeft, ChevronRight } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TrendCard = ({ title, icon, data, type }: { title: string; icon: React.ReactNode; data: string[]; type: 'q' | 'location' }) => (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
            {data?.map((item) => (
                <Link
                  key={item}
                  // For location trends, pass as 'location'; for skills/titles pass as 'q'
                  href={`/jobs/all?${type}=${encodeURIComponent(item)}`}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-blue-100 hover:text-blue-800 transition-colors"
                >
                    {item}
                </Link>
            ))}
        </div>
    </div>
);


// FeaturedJobsCarousel component (keep as is)
const FeaturedJobsCarousel = () => {
    const { data: featuredData, error: featuredError } = useSWR('/api/jobs?featured=true', fetcher);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (featuredError) {
        console.error("Failed to load featured jobs:", featuredError);
        return <div className="text-center text-red-500 py-8">Could not load featured jobs.</div>;
    }
    if (!featuredData) {
        return <div className="text-center py-8">Loading featured jobs...</div>; // Loading state
    }
    if (!featuredData.jobs || featuredData.jobs.length === 0) {
        return null; // Don't render the section if there are no featured jobs
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.offsetWidth * 0.8; // Scroll 80% width
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section className="bg-slate-100 py-16">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-800">Featured Jobs</h2>
                    <div className="flex gap-2">
                        <button onClick={()={() => scroll('left')} className="p-2 rounded-full bg-white border shadow-sm hover:bg-slate-50 disabled:opacity-50" disabled={!scrollContainerRef.current || scrollContainerRef.current.scrollLeft === 0}>
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={() => scroll('right')} className="p-2 rounded-full bg-white border shadow-sm hover:bg-slate-50 disabled:opacity-50" disabled={!scrollContainerRef.current || scrollContainerRef.current.scrollLeft + scrollContainerRef.current.offsetWidth >= scrollContainerRef.current.scrollWidth}>
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
                <div
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory" // Added snap scrolling
                >
                    {featuredData.jobs.map((job: any) => (
                        <div key={job.id} className="bg-white p-6 rounded-xl shadow-md border flex-shrink-0 w-full sm:w-[48%] lg:w-[31%] snap-start" > {/* Adjusted width and snap alignment */}
                            <h3 className="font-bold text-lg text-blue-700 truncate">{job.title}</h3> {/* Added truncate */}
                            <p className="text-md text-gray-700">{job.location}</p>
                            <p className="text-sm text-gray-500 mt-1 truncate">{job.company}</p> {/* Added truncate */}
                             {/* Pay range display */}
                             {(job.pay_min || job.pay_max) && (
                                <p className="text-sm font-medium text-gray-800 mt-2">
                                    {job.pay_min && `$${Number(job.pay_min).toLocaleString()}`}
                                    {(job.pay_min && job.pay_max) && ' – '}
                                    {job.pay_max && `$${Number(job.pay_max).toLocaleString()}`}
                                    { (job.pay_min || job.pay_max) && ' / yr'}
                                </p>
                            )}
                            <a href={job.apply_url || job.external_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 font-semibold text-sm"> {/* Smaller text */}
                                View & Apply
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};


// State list
const states = ["All States", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export default function JobsPage() {
  const router = useRouter();
  const { data, error } = useSWR('/api/jobs/trends', fetcher);
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState(''); // NEW city state
  const [state, setState] = useState('All States'); // NEW state state

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (city) params.set('city', city); // Use city param
    if (state !== 'All States') params.set('state', state); // Use state param
    router.push(`/jobs/all?${params.toString()}`);
  };

  const isLoading = !data && !error;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Hero Section */}
      <section className="bg-slate-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Find Your Next Manufacturing Job</h1>
          <p className="mb-8 text-lg text-slate-300 max-w-2xl mx-auto">
            Curated opportunities for machine operators, technicians, and engineers. Search thousands of openings.
          </p>
           {/* --- UPDATED Search Bar --- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-2xl mx-auto bg-white p-2 rounded-lg shadow-lg">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Job Title / Skill"
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
                     {/* Use the same states array */}
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

      {/* Trend Cards, Featured Jobs, CTA sections */}
       <section className="max-w-6xl mx-auto py-16 px-4">
             {isLoading && <p className="text-center">Loading job market trends...</p>}
             {error && <p className="text-center text-red-500">Failed to load job trends.</p>}
             {data && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <TrendCard title="In-Demand Job Titles" icon={<Briefcase className="text-blue-600"/>} data={data.jobTitles || []} type="q" />
                  {/* Pass location string directly */}
                 <TrendCard title="Hot Cities" icon={<MapPin className="text-blue-600"/>} data={data.popularCities || []} type="location" />
                 {/* Pass skills as 'q' */}
                 <TrendCard title="In-Demand Skills" icon={<ListChecks className="text-blue-600"/>} data={data.inDemandSkills || []} type="q" />
               </div>
             )}
       </section>
       <FeaturedJobsCarousel />
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

// Add scrollbar-hide utility if not already present in globals.css
/*
@layer utilities {
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
}
*/
