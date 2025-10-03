// /app/jobs/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, ListChecks, Search, Bot, Wrench, Factory } from 'lucide-react';

// --- Static Data (for now) ---
const inDemandJobs = ['Machine Operator', 'CNC Machinist', 'Material Handler', 'Project Engineer', 'Maintenance Tech', 'Welder'];
const hotCities = ['Atlanta, GA', 'Houston, TX', 'Dallas, TX', 'Phoenix, AZ', 'Chicago, IL', 'Charlotte, NC'];
const inDemandSkills = ['CNC Lathe', 'RF Scanner', 'Fanuc Controls', 'MasterCAM', 'Deburring', 'Production Control'];
const featuredJobs = [
    { title: 'CNC Machinist', location: 'Houston, TX', company: 'XYZ Manufacturing', posted: '2 days ago' },
    { title: 'Robotics Technician', location: 'Detroit, MI', company: 'AutoFab Inc.', posted: '1 day ago' },
    { title: 'Welding Programmer', location: 'Cleveland, OH', company: 'Precision Parts Co.', posted: '4 days ago' },
];
const pathways = [
    { icon: Wrench, title: 'Entry-Level Jobs' },
    { icon: Wrench, title: 'Skilled Trades' },
    { icon: Wrench, title: 'Engineering & Leadership' },
];

export default function ManufacturingJobsPage() {
    const [keyword, setKeyword] = useState('');
    const [location, setLocation] = useState('');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            {/* Hero Section */}
            <section className="bg-slate-800 text-white p-12">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="max-w-xl">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Find Your Next Manufacturing Job</h1>
                        <p className="mb-6 text-lg text-slate-300">Curated opportunities for machine operators, technicians, and engineers. Search thousands of openings.</p>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Job Title / Skill" className="p-3 rounded-md w-full sm:w-2/5 text-black" />
                            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State, or Zip" className="p-3 rounded-md w-full sm:w-2/5 text-black" />
                            <Link href={`/jobs/all?q=${keyword}&location=${location}`} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-md text-white font-semibold flex-grow flex items-center justify-center">
                                <Search className="w-5 h-5 mr-2" />
                                Search
                            </Link>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <div className="w-56 h-56 bg-slate-700/50 rounded-lg flex items-center justify-center">
                            <Factory size={80} className="text-cyan-400" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Access Section */}
            <section className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto p-8 -mt-16 relative z-10">
                <div className="bg-white p-6 rounded-xl shadow-lg border">
                    <h2 className="flex items-center text-xl font-bold mb-4"><Briefcase className="mr-2 text-blue-600"/> In-Demand Job Titles</h2>
                    <div className="flex flex-wrap gap-2">
                        {inDemandJobs.map((job) => (
                            <Link key={job} href={`/jobs/all?q=${job}`} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200">{job}</Link>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border">
                    <h2 className="flex items-center text-xl font-bold mb-4"><MapPin className="mr-2 text-blue-600"/> Hot Cities</h2>
                    <div className="flex flex-wrap gap-2">
                        {hotCities.map((city) => (
                            <Link key={city} href={`/jobs/all?location=${city}`} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200">{city}</Link>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border">
                    <h2 className="flex items-center text-xl font-bold mb-4"><ListChecks className="mr-2 text-blue-600"/> In-Demand Skills</h2>
                    <div className="flex flex-wrap gap-2">
                        {inDemandSkills.map((skill) => (
                            <Link key={skill} href={`/jobs/all?skills=${skill}`} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200">{skill}</Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Job Stats */}
            <section className="bg-slate-100 py-12 text-center">
                <h2 className="text-3xl font-bold text-slate-800">10,000+ Manufacturing Jobs Available</h2>
                <p className="mt-2 text-lg text-slate-600">Hand-picked roles from trusted employers across the U.S.</p>
            </section>

            {/* Featured Jobs */}
            <section className="max-w-6xl mx-auto p-8">
                <h2 className="text-2xl font-bold mb-6">Featured Jobs</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {featuredJobs.map((job, index) => (
                        <div key={index} className="bg-white p-6 rounded-xl shadow border hover:shadow-lg transition-shadow">
                            <h3 className="font-bold text-lg">{job.title}</h3>
                            <p className="text-md text-gray-700">{job.location}</p>
                            <p className="text-sm text-gray-500 mt-2">{job.company} | Posted {job.posted}</p>
                            <Link href="/jobs/all" className="mt-4 inline-block bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 font-semibold">
                                View & Apply
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* Career Pathway CTA */}
            <section className="bg-slate-100 py-16">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-center text-3xl font-bold mb-8">Not Sure Where to Start?</h2>
                    <div className="flex flex-col md:flex-row justify-center gap-6">
                        {pathways.map((path) => (
                            <div key={path.title} className="bg-white p-8 rounded-xl shadow-md border w-full md:w-72 text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="bg-blue-100 p-3 rounded-full">
                                        <path.icon className="text-blue-600" size={32} />
                                    </div>
                                </div>
                                <h3 className="font-semibold text-lg">{path.title}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-800 text-slate-300 py-8 text-center">
                <div className="flex justify-center gap-6">
                    <Link href="/about" className="hover:text-white">About</Link>
                    <Link href="/programs" className="hover:text-white">Programs</Link>
                    <Link href="/contact" className="hover:text-white">Contact</Link>
                </div>
                <p className="mt-4 text-sm">&copy; {new Date().getFullYear()} SkillStrong. All rights reserved.</p>
            </footer>
        </div>
    );
}
