'use client';
import useSWR from 'swr';
import Link from 'next/link';


const fetcher = (url: string) => fetch(url).then((r) => r.json());


export default function JobsClient() {
const { data } = useSWR('/api/jobs', fetcher, { refreshInterval: 15000 });
const jobs = (data?.jobs || []) as Array<any>;


return (
<div className="max-w-5xl mx-auto p-6">
<div className="flex items-center justify-between mb-6">
<h1 className="text-2xl font-bold">Manufacturing Jobs & Apprenticeships</h1>
<Link href="/jobs/new" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Post a Job</Link>
</div>


<div className="grid gap-4">
{jobs.length === 0 && (
<div className="p-6 border rounded-lg bg-white">No jobs yet. Be the first to post!</div>
)}
{jobs.map((j: any) => (
<div key={j.id} className="p-5 border rounded-xl bg-white">
<div className="flex items-center justify-between">
<div>
<h3 className="text-lg font-semibold">{j.title}</h3>
<p className="text-sm text-gray-600">{j.company} • {j.location} {j.apprenticeship ? '• Apprenticeship' : ''}</p>
</div>
{typeof j.payMin !== 'undefined' && (
<div className="text-sm font-medium text-gray-800">${j.payMin}–${j.payMax} / yr</div>
)}
</div>
<p className="mt-3 text-gray-700 whitespace-pre-line">{j.description}</p>
<div className="mt-3 flex flex-wrap gap-2">
{(j.skills || []).map((s: string) => (
<span key={s} className="px-2 py-1 text-xs rounded-full bg-gray-100 border">{s}</span>
))}
</div>
</div>
))}
</div>
</div>
);
}
