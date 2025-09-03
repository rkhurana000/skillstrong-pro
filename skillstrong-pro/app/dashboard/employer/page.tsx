// /app/dashboard/employer/page.tsx
import useSWR from 'swr';
import Link from 'next/link';


const fetcher = (u: string) => fetch(u).then(r=>r.json());


export default function EmployerDash() {
const { data } = useSWR('/api/jobs', fetcher, { next: { revalidate: 0 } as any });
const jobs = data?.jobs || [];
return (
<div className="max-w-5xl mx-auto p-6">
<div className="flex items-center justify-between mb-6">
<h1 className="text-2xl font-bold">Employer Dashboard</h1>
<Link href="/jobs/new" className="px-3 py-2 rounded-md bg-blue-600 text-white">Post a Job</Link>
</div>
<div className="grid gap-3">
{jobs.map((j:any)=> (
<div key={j.id} className="p-4 border rounded-lg bg-white flex items-center justify-between">
<div>
<div className="font-semibold">{j.title}</div>
<div className="text-sm text-gray-600">{j.company} • {j.location}</div>
</div>
<div className="text-sm">{new Date(j.createdAt).toLocaleDateString()}</div>
</div>
))}
{jobs.length===0 && <div className="p-6 border rounded-lg bg-white">No postings yet.</div>}
</div>
</div>
)
}
