import { NextResponse } from 'next/server';
import { addProgram } from '@/lib/marketplace';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const location = searchParams.get('location') || undefined;
    const delivery = searchParams.get('delivery') || undefined; // in-person | online | hybrid
    const lenMin = searchParams.get('lengthMin');
    const lenMax = searchParams.get('lengthMax');
    const costMax = searchParams.get('costMax');
    const requireUrl = searchParams.get("requireUrl") === "1";
    let query = supabaseAdmin.from('programs').select('*');
    if (requireUrl) query = query.not("url", "is", null);
    if (q) query = query.or(`title.ilike.%${q}%,school.ilike.%${q}%,description.ilike.%${q}%`);
    if (location) query = query.ilike('location', `%${location}%`);
    if (delivery) query = query.eq('delivery', delivery);
    if (lenMin) query = query.gte('length_weeks', Number(lenMin));
    if (lenMax) query = query.lte('length_weeks', Number(lenMax));
    if (costMax) query = query.lte('cost', Number(costMax));

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ programs: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load programs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const program = await addProgram({
      school: body.school,
      title: body.title,
      location: body.location,
      delivery: body.delivery || 'in-person',
      length_weeks: typeof body.lengthWeeks === 'number' ? body.lengthWeeks : undefined,
      cost: typeof body.cost === 'number' ? body.cost : undefined,
      certs: body.certs,
      start_date: body.startDate || null,
      url: body.url || null,
      external_url: body.externalUrl || null,
      description: body.description,
      featured: !!body.featured,
    });
    return NextResponse.json({ program }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid program payload' }, { status: 400 });
  }
}
