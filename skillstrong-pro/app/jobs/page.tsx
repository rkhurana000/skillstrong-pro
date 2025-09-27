// /app/jobs/page.tsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Briefcase, MapPin, ListChecks, School } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const resourceLinks = [
    { name: "Apprenticeship Finder", url: "https://www.apprenticeship.gov/apprenticeship-job-finder", description: "Official U.S. government finder for paid, on-the-job training." },
    { name: "O*NET OnLine", url: "https://www.onetonline.org/", description: "Comprehensive occupation data from the U.S. Department of Labor." },
    { name: "Job Corps", url: "https://www.jobcorps.gov/", description: "Free vocational training and job assistance for young adults." },
];

const TrendCard = ({ title, icon, data }: { title: string; icon: React.ReactNode; data: string[] }) => (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
            {data?.map((item) => (
                <span key={item} className="text-gray-600 after:content-['•'] after:ml-4 last:after:content-['']">{item}</span>
            ))}
        </div>
        <Link href="/jobs/all" className="text-blue-600 font-semibold mt-4 block">Browse All »</Link>
    </div>
);

export default function JobsPage() {
  const { data, error } = useSWR('/api/jobs/trends', fetcher);

  const isLoading = !data && !error;

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900">Manufacturing Job Market</h1>
          <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
            Explore in-demand roles, skills, and locations based on current job openings across the manufacturing sector.
          </p>
        </div>

        {isLoading && <p className="text-center">Loading job market trends...</p>}
        {error && <p className="text-center text-red-500">Failed to load job trends.</p>}
        
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TrendCard title="In-Demand Job Titles" icon={<Briefcase className="text-blue-600"/>} data={data.jobTitles} />
            <TrendCard title="Popular Cities" icon={<MapPin className="text-blue-600"/>} data={data.popularCities} />
            <TrendCard title="In-Demand Skills" icon={<ListChecks className="text-blue-600"/>} data={data.inDemandSkills} />
          </div>
        )}

        <div className="mt-12">
            <h2 className="text-2xl font-bold text-center mb-6">Apprenticeships & Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resourceLinks.map(link => (
                    <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="block bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="font-bold text-lg text-blue-700">{link.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                    </a>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
