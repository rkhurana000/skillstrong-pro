'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProgramPage() {
  const r = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    school: '',
    title: '',
    location: '',
    delivery: 'in-person',
    lengthWeeks: '',
    cost: '',
    certs: '',
    startDate: '',
    url: '',
    externalUrl: '', // NEW field for source page
    description: '',
    featured: false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      school: form.school,
      title: form.title,
      location: form.location,
      delivery: form.delivery as 'in-person' | 'online' | 'hybrid',
      lengthWeeks: form.lengthWeeks ? Number(form.lengthWeeks) : undefined,
      cost: form.cost ? Number(form.cost) : undefined,
      certs: form.certs.split(',').map((s) => s.trim()).filter(Boolean),
      startDate: form.startDate || undefined,
      url: form.url || undefined,
      externalUrl: form.externalUrl || undefined, // pass through
      description: form.description || undefined,
      featured: form.featured,
    };

    await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    r.push('/programs');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">List a Training Program</h1>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            className="border rounded-md p-2"
            placeholder="School / Provider"
            value={form.school}
            onChange={(e) => setForm({ ...form, school: e.target.value })}
            required
          />
          <input
            className="border rounded-md p-2"
            placeholder="Program title (e.g., CNC Machinist)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            className="border rounded-md p-2"
            placeholder="Location (City, ST)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
          />
          <select
            className="border rounded-md p-2"
            value={form.delivery}
            onChange={(e) => setForm({ ...form, delivery: e.target.value })}
          >
            <option value="in-person">In-person</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <input
            className="border rounded-md p-2"
            placeholder="Length (weeks)"
            value={form.lengthWeeks}
            onChange={(e) => setForm({ ...form, lengthWeeks: e.target.value })}
          />
          <input
            className="border rounded-md p-2"
            placeholder="Cost (USD)"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
          />
          <input
            className="border rounded-md p-2"
            placeholder="Certs (comma separated)"
            value={form.certs}
            onChange={(e) => setForm({ ...form, certs: e.target.value })}
          />
          <input
            className="border rounded-md p-2"
            placeholder="Next start date (optional)"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <input
            className="border rounded-md p-2 md:col-span-2"
            placeholder="Program URL on your site (optional)"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <input
            className="border rounded-md p-2 md:col-span-2"
            placeholder="External program URL (college/provider page)"
            value={form.externalUrl}
            onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
          />
        </div>

        <textarea
          className="border rounded-md p-2 w-full"
          rows={5}
          placeholder="Short description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          />
          Feature this
        </label>

        <button
          disabled={saving}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Publish'}
        </button>
      </form>
    </div>
  );
}
