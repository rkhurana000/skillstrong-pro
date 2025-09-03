'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewJobPage() {
  const r = useRouter();
  const [form, setForm] = useState({
    title: '', company: '', location: '',
    description: '', skills: '',
    payMin: '', payMax: '', apprenticeship: false,
    externalUrl: '', applyUrl: '',  // NEW
    featured: false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      company: form.company,
      location: form.location,
      description: form.description,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      payMin: form.payMin ? Number(form.payMin) : undefined,
      payMax: form.payMax ? Number(form.payMax) : undefined,
      apprenticeship: form.apprenticeship,
      externalUrl: form.externalUrl || undefined,  // NEW
      applyUrl: form.applyUrl || undefined,        // NEW
      featured: form.featured,
    };
    await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    r.push('/jobs');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Post a Job</h1>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* existing inputs unchanged... */}
          <input className="border rounded-md p-2" placeholder="Job title (e.g., CNC Machinist)" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
          <input className="border rounded-md p-2" placeholder="Company" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} required />
          <input className="border rounded-md p-2" placeholder="Location (City, ST)" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} required />
          <input className="border rounded-md p-2" placeholder="Skills (comma separated)" value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})} />
          <input className="border rounded-md p-2" placeholder="Pay min (e.g., 52000)" value={form.payMin} onChange={e=>setForm({...form,payMin:e.target.value})} />
          <input className="border rounded-md p-2" placeholder="Pay max (e.g., 74000)" value={form.payMax} onChange={e=>setForm({...form,payMax:e.target.value})} />
          <input className="border rounded-md p-2 md:col-span-2" placeholder="External posting URL (company/board)" value={form.externalUrl} onChange={e=>setForm({...form,externalUrl:e.target.value})} /> {/* NEW */}
          <input className="border rounded-md p-2 md:col-span-2" placeholder="Apply URL (where candidates apply)" value={form.applyUrl} onChange={e=>setForm({...form,applyUrl:e.target.value})} /> {/* NEW */}
        </div>
        <textarea className="border rounded-md p-2 w-full" rows={5} placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}></textarea>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.apprenticeship} onChange={e=>setForm({...form,apprenticeship:e.target.checked})} /> Apprenticeship</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={e=>setForm({...form,featured:e.target.checked})} /> Feature this</label>
        </div>
        <button disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{saving?'Saving…':'Publish'}</button>
      </form>
    </div>
  );
}
