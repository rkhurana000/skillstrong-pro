"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function ProgramsPage() {
  const [filters, set] = useState({
    q: "", location: "", delivery: "", lengthMin: "", lengthMax: "", costMax: ""
  });

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (filters.q) sp.set("q", filters.q);
    if (filters.location) sp.set("location", filters.location);
    if (filters.delivery) sp.set("delivery", filters.delivery);
    if (filters.lengthMin) sp.set("lengthMin", filters.lengthMin);
    if (filters.lengthMax) sp.set("lengthMax", filters.lengthMax);
    if (filters.costMax) sp.set("costMax", filters.costMax);
    // only show rows that have a program URL
    sp.set("requireUrl", "1");
    return sp.toString();
  }, [filters]);

  const { data } = useSWR(`/api/programs${qs ? `?${qs}` : ""}`, fetcher);
  const programs = (data?.programs || []).filter((p: any) => !!p.url);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Training Programs</h1>

      <div className="grid md:grid-cols-6 gap-3 p-4 border rounded-lg bg-white mb-6">
        <input className="border rounded-md p-2 md:col-span-2"
          placeholder="Search program or school"
          value={filters.q}
          onChange={e=>set(s=>({...s,q:e.target.value}))}/>
        <input className="border rounded-md p-2"
          placeholder="Metro (e.g., Columbus, OH)"
          value={filters.location}
          onChange={e=>set(s=>({...s,location:e.target.value}))}/>
        <select className="border rounded-md p-2"
          value={filters.delivery}
          onChange={e=>set(s=>({...s,delivery:e.target.value}))}>
          <option value="">Delivery (all)</option>
          <option value="in-person">In-person</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <input className="border rounded-md p-2"
          placeholder="Min weeks"
          value={filters.lengthMin}
          onChange={e=>set(s=>({...s,lengthMin:e.target.value}))}/>
        <input className="border rounded-md p-2"
          placeholder="Max weeks"
          value={filters.lengthMax}
          onChange={e=>set(s=>({...s,lengthMax:e.target.value}))}/>
        <input className="border rounded-md p-2"
          placeholder="Max cost"
          value={filters.costMax}
          onChange={e=>set(s=>({...s,costMax:e.target.value}))}/>
      </div>

      <div className="grid gap-4">
{programs.map(p => {
  const where = [p.city, p.state].filter(Boolean).join(', ');
  const modality = p.delivery || 'in-person';
  const offered = p.title || 'Manufacturing program';
  const desc =
    (p.description || '')
      .replace(/\s+/g, ' ')
      .trim() || 'Program listed via College Scorecard.';

  const link =
    p.url ||
    `https://www.google.com/search?q=${encodeURIComponent(`${p.school} ${offered} site:.edu`)}`;

  return (
    <div key={p.id} className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold">{p.school}</h3>
      <p className="text-gray-600 mt-1">{where} • {modality}</p>

      <p className="mt-3 font-medium">
        <span className="text-gray-500">Program offered:</span> {offered}
      </p>

      <p className="mt-2 text-gray-700 line-clamp-3">
        {desc}
      </p>

      <div className="mt-4">
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Program page
        </a>
      </div>
    </div>
  );
})}

        {programs.length === 0 && (
          <div className="p-6 border rounded-lg bg-white">
            No programs yet. Try a different metro or run the metro seeding job below.
          </div>
        )}
      </div>
    </div>
  );
}
