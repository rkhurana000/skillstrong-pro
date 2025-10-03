// /app/jobs/page.tsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Briefcase, MapPin, ListChecks } from 'lucide-react';

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
        <div className="flex flex-wrap gap-x-3 gap-y-2">
            {data?.map((item) => (
                <Link
                  key={item}
                  href={`/jobs/all?${type}=${encodeURIComponent(item)}`}
                  className="text-gray-600 hover:text-blue-600 hover:underline after:content-['•'] after:ml-3 last:after:content-['']"
                >
                    {item}
                </Link>
            ))}
        </div>
        <Link href="/jobs/all" className="text-blue-600 font-semibold mt-6 block">Browse All »</Link>
    </div>
);

export default function JobsPage() {
  const { data, error } = useSWR('/api/jobs/trends', fetcher);
  const isLoading = !data && !error;

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900">Manufacturing Job Market Trends</h1>
          <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
            Discover in-demand roles, skills, and locations based on current job openings across the manufacturing sector.
          </p>
        </div>

        {isLoading && <p className="text-center text-lg">Loading job market data...</p>}
        {error && <p className="text-center text-red-500">Could not load job trends at this time.</p>}
        
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TrendCard title="In-Demand Job Titles" icon={<Briefcase className="text-blue-600"/>} data={data.jobTitles} type="q" />
            <TrendCard title="Popular Cities" icon={<MapPin className="text-blue-600"/>} data={data.popularCities} type="location" />
            <TrendCard title="In-Demand Skills" icon={<ListChecks className="text-blue-600"/>} data={data.inDemandSkills} type="skills" />
          </div>
        )}
        
        <p className="text-center text-sm text-gray-500 mt-4">
            In-demand job titles and skills are based on the most recent jobs in our database. Last updated today!
        </p>

        <div className="mt-16">
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
      </div>
    </div>
  );
}
