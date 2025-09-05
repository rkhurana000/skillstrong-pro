// app/api/programs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // don't cache this in Vercel

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'skillstrong-public' } },
  });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getPublicClient();
    const sp = req.nextUrl.searchParams;

    const q         = (sp.get('q') || '').trim();
    const metro     = (sp.get('metro') || '').trim();
    const delivery  = (sp.get('delivery') || '').trim();
    const costMax   = sp.get('costMax') ? Number(sp.get('costMax')) : undefined;
    const lenMin    = sp.get('lengthMin') ? Number(sp.get('lengthMin')) : undefined;
    const lenMax    = sp.get('lengthMax') ? Number(sp.get('lengthMax')) : undefined;
    const requireUrl = sp.get('requireUrl') === '1';

    let query = supabase
      .from('programs')
      .select('*')
      .order('school', { ascending: true })
      .limit(1000);

    if (requireUrl) query = query.not('url', 'is', null);
    if (q) query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
    if (metro) query = query.eq('metro', metro);
    if (delivery) query = query.eq('delivery', delivery);
    if (typeof costMax === 'number') query = query.lte('cost', costMax);
    if (typeof lenMin === 'number') query = query.gte('length_weeks', lenMin);
    if (typeof lenMax === 'number') query = query.lte('length_weeks', lenMax);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ programs: data ?? [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}
