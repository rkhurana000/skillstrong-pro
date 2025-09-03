'use client';

import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function SchoolDash() {
  const { data } = useSWR('/api/programs', fetcher);
  const programs = data?.programs || [];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">School Dashboard</h1>
        <Link
          href="/programs/new"
          className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          List a Program
        </Link>
      </div>

      <div className="grid gap-3">
        {programs.map((p: any) => (
          <div
            key={p.id}
            className="p-4 border rounded-lg bg-white flex items-center justify-between"
          >
            <div>
              <div className="font-semibold">{p.title}</div>
              <div className="text-sm text-gray-600">
                {p.school} • {p.location}
              </div>
            </div>
            <div className="text-sm">
              {new Date(p.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}

        {programs.length === 0 && (
          <div className="p-6 border rounded-lg bg-white">No programs yet.</div>
        )}
      </div>
    </div>
  );
}
