'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function JobsPage() {
  const [filters, set] = useState({
    q: '', location: '', skills: '', apprenticeship: false, payMin: '', payMax: ''
  });

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (filters.q) sp.set('q', filters.q);
    if (filters.location) sp.set('location', filters.location);
    if (filters.skills) sp.set('skills', filters.skills);
    if (filters.apprenticeship) sp.set('apprenticeship', '1');
    if (filters.payMin) sp.set('payMin', filters.payMin);
    if (filters.payMax) sp.set('payMax', filters.payMax);
    return sp.toString();
  }, [filters]);

  const { data } = useSWR(`/api/jobs${qs ? `?${qs}` : ''}`, fetcher);
  const jobs = data?.jobs || [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Manufacturing Jobs</h1>

      <div className="grid md:grid-cols-6 gap-3 p-4 border rounded-lg bg-white mb-6">
        <input className="border rounded-md p-2 md:col-span-2" placeholder="Search title/company"
          value={filters.q} onChange={e=>set(s=>({...s,q:e.target.value}))}/>
        <input className="border rounded-md p-2" placeholder="Metro (e.g., Phoenix, AZ)"
          value={filters.location} onChange={e=>set(s=>({...s,location:e.target.value}))}/>
        <input className="border rounded-md p-2" placeholder="Skills (comma)"
          value={filters.skills} onChange={e=>set(s=>({...s,skills:e.target.value}))}/>
        <input className="border rounded-md p-2" placeholder="Min Pay"
          value={filters.payMin} onChange={e=>set(s=>({...s,payMin:e.target.value}))}/>
        <input className="border rounded-md p-2" placeholder="Max Pay"
          value={filters.payMax} onChange={e=>set(s=>({...s,payMax:e.target.value}))}/>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={filters.apprenticeship}
            onChange={e=>set(s=>({...s,apprenticeship:e.target.checked}))}/>
          Apprenticeships only
        </label>
      </div>

      <div className="grid gap-4">
        {jobs.map((j: any) => (
          <div key={j.id} className="p-4 border rounded-lg bg-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{j.title}</div>
                <div className="text-sm text-gray-600">{j.company} • {j.location}</div>
              </div>
              <div className="text-sm">{j.pay_min || j.pay_max ? `$${j.pay_min ?? ''}–${j.pay_max ?? ''}` : ''}</div>
            </div>
            {j.description && <p className="text-sm mt-2">{j.description}</p>}
            <div className="flex gap-3 mt-3">
              {j.apply_url && <a className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" href={j.apply_url} target="_blank">Apply</a>}
              {j.external_url && <a className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200" href={j.external_url} target="_blank">View posting</a>}
            </div>
          </div>
        ))}
        {jobs.length === 0 && <div className="p-6 border rounded-lg bg-white">No jobs match your filters.</div>}
      </div>
    </div>
  );
}
