// /app/jobs/page.tsx
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, MapPin, ListChecks, Search, Bot } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const resourceLinks = [
    { name: "Apprenticeship Finder", url: "https://www.apprenticeship.gov/apprenticeship-job-finder", description: "Official U.S. government finder for paid, on-the-job training." },
    { name: "O*NET OnLine", url: "https://www.onetonline.org/", description: "Comprehensive occupation data from the U.S. Department of Labor." },
    { name: "Job Corps", url: "https://www.jobcorps.gov/", description: "Free vocational training and job assistance for young adults." },
];

const TrendCard = ({ title, icon, data, type }: { title: string; icon: React.ReactNode; data: string[]; type: 'q' | 'location' | 'skills' }) => (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
            {data?.map((item) => (
                <Link
                  key={item}
                  href={`/jobs/all?${type}=${encodeURIComponent(item)}`}
                  className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm font-medium hover:bg-blue-100 hover:text-blue-800 transition-colors"
                >
                    {item}
                </Link>
            ))}
        </div>
    </div>
);

export default function JobsPage() {
  const router = useRouter();
  const { data, error } = useSWR('/api/jobs/trends', fetcher);
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (location) params.set('location', location);
    router.push(`/jobs/all?${params.toString()}`);
  };

  const isLoading = !data && !error;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Find Your Next Manufacturing Job</h1>
          <p className="mb-8 text-lg text-slate-300">Explore opportunities for machine operators, technicians, and engineers.</p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <input 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Job Title or Skill (e.g., CNC)" 
              className="p-3 rounded-md flex-grow text-black" 
            />
            <input 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or State" 
              className="p-3 rounded-md sm:w-1/3 text-black" 
            />
            <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-md text-white font-semibold flex items-center justify-center">
              <Search className="w-5 h-5 mr-2" /> Search
            </button>
          </div>
        </div>
      </section>

      {/* Quick Access / Trends Section */}
      <section className="max-w-6xl mx-auto py-12 px-4">
        {isLoading && <p className="text-center">Loading job market trends...</p>}
        {error && <p className="text-center text-red-500">Failed to load job trends.</p>}
        
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TrendCard title="In-Demand Job Titles" icon={<Briefcase className="text-blue-600"/>} data={data.jobTitles} type="q" />
            <TrendCard title="Popular Cities" icon={<MapPin className="text-blue-600"/>} data={data.popularCities} type="location" />
            <TrendCard title="In-Demand Skills" icon={<ListChecks className="text-blue-600"/>} data={data.inDemandSkills} type="skills" />
          </div>
        )}
      </section>

      {/* Resources Section */}
      <section className="bg-slate-100 py-16">
        <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">Apprenticeships & Training Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resourceLinks.map(link => (
                    <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="block bg-white p-6 rounded-lg border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                        <h3 className="font-bold text-lg text-blue-700">{link.name}</h3>
                        <p className="text-sm text-gray-600 mt-2">{link.description}</p>
                    </a>
                ))}
            </div>
        </div>
      </section>
      
       {/* Final CTA */}
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
