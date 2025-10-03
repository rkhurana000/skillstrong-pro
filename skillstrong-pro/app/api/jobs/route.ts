// /app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const location = searchParams.get('location') || undefined;
    const skills = (searchParams.get('skills') || '').split(',').map(s => s.trim()).filter(Boolean);
    const apprenticeship = searchParams.get('apprenticeship') === '1';

    let query = supabaseAdmin.from('jobs').select('*');

    // THIS IS THE FIX: Chain filters correctly as AND conditions
    if (q) {
      query = query.or(`title.ilike.%${q}%,company.ilike.%${q}%,description.ilike.%${q}%`);
    }
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }
    if (skills.length) {
      query = query.overlaps('skills', skills);
    }
    if (apprenticeship) {
      query = query.eq('apprenticeship', true);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ jobs: data });
  } catch (e: any) {
    console.error("Job search error:", e);
    return NextResponse.json({ error: e.message || 'Failed to load jobs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const job = await addJob({
      title: body.title,
      company: body.company,
      location: body.location,
      description: body.description,
      skills: body.skills,
      pay_min: typeof body.payMin === 'number' ? body.payMin : undefined,
      pay_max: typeof body.payMax === 'number' ? body.payMax : undefined,
      apprenticeship: !!body.apprenticeship,
      external_url: body.externalUrl || null,
      apply_url: body.applyUrl || null,
      featured: !!body.featured,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid job payload' }, { status: 400 });
  }
}
