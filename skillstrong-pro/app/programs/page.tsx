'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function ProgramsPage() {
  const [filters, set] = useState({
    q: '', location: '', delivery: '', lengthMin: '', lengthMax: '', costMax: ''
  });

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (filters.q) sp.set('q', filters.q);
    if (filters.location) sp.set('location', filters.location);
    if (filters.delivery) sp.set('delivery', filters.delivery);
    if (filters.lengthMin) sp.set('lengthMin', filters.lengthMin);
    if (filters.lengthMax) sp.set('lengthMax', filters.lengthMax);
    if (filters.costMax) sp.set('costMax', filters.costMax);
    return sp.toString();
  }, [filters]);

  const { data } = useSWR(`/api/programs${qs ? `?${qs}` : ''}`, fetcher);
  const programs = data?.programs || [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Training Programs</h1>

      <div className="grid md:grid-cols-6 gap-3 p-4 border rounded-lg bg-white mb-6">
        <input className="border rounded-md p-2 md:col-span-2" placeholder="Search program/school"
          value={filters.q} onChange={e=>set(s=>({...s,q:e.target.value}))}/>
        <input className="border rounded-md p-2" placeholder="Metro (e.g., Phoenix, AZ)"
          value={filters.location} onChange={e=>set(s=>({...s,location:e.target.value}))}/>
        <select className="border rounded-md p-2" value={filters.delivery}
          onChange={e=>set(s=>({...s,delivery:e.target.value}))}>
          <option value="">Delivery (all)</option>
          <option value="in-person">In-person</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <input className="border rounded-md p-2" placeholder="Min weeks"
          value={filters.lengthMin} onChange={e=>set(s=>({...s,lengthMin:e.target.value}))}/>
        <input className="border rounded-md p-2" placeholder="Max weeks"
          value={filters.lengthMax} onChange={e=>set(s=>({...s,lengthMax:e.target.value}))}/>
        <input className="border rounded-md p-2" placeholder="Max cost"
          value={filters.costMax} onChange={e=>set(s=>({...s,costMax:e.target.value}))}/>
      </div>

      <div className="grid gap-4">
        {programs.map((p: any) => (
          <div key={p.id} className="p-4 border rounded-lg bg-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{p.title}</div>
                <div className="text-sm text-gray-600">{p.school} • {p.location} • {p.delivery}</div>
              </div>
              <div className="text-sm">{p.length_weeks ? `${p.length_weeks} weeks` : ''}</div>
            </div>
            {p.description && <p className="text-sm mt-2">{p.description}</p>}
            <div className="flex gap-3 mt-3">
              {p.url && <a className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" href={p.url} target="_blank">Program page</a>}
              {p.external_url && <a className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200" href={p.external_url} target="_blank">School site</a>}
            </div>
          </div>
        ))}
        {programs.length === 0 && <div className="p-6 border rounded-lg bg-white">No programs match your filters.</div>}
      </div>
    </div>
  );
}

