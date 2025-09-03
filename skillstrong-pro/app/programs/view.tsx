'use client';
import useSWR from 'swr';
import Link from 'next/link';


const fetcher = (url: string) => fetch(url).then((r) => r.json());


export default function ProgramsClient() {
const { data } = useSWR('/api/programs', fetcher, { refreshInterval: 15000 });
const programs = (data?.programs || []) as Array<any>;


return (
<div className="max-w-5xl mx-auto p-6">
<div className="flex items-center justify-between mb-6">
<h1 className="text-2xl font-bold">Training Programs</h1>
<Link href="/programs/new" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">List a Program</Link>
</div>


<div className="grid gap-4">
{programs.length === 0 && (
<div className="p-6 border rounded-lg bg-white">No programs yet. Add your first one!</div>
)}
{programs.map((p: any) => (
<div key={p.id} className="p-5 border rounded-xl bg-white">
<div className="flex items-center justify-between">
<div>
<h3 className="text-lg font-semibold">{p.title}</h3>
<p className="text-sm text-gray-600">{p.school} • {p.location} • {p.delivery}</p>
</div>
<div className="text-sm font-medium text-gray-800">{p.lengthWeeks} weeks {p.cost ? `• $${p.cost}` : ''}</div>
</div>
<p className="mt-3 text-gray-700 whitespace-pre-line">{p.description}</p>
<div className="mt-3 flex flex-wrap gap-2">
{(p.certs || []).map((s: string) => (
<span key={s} className="px-2 py-1 text-xs rounded-full bg-gray-100 border">{s}</span>
))}
</div>
</div>
))}
</div>
</div>
);
}
