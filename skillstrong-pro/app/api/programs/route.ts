// /app/api/programs/route.ts
import { NextResponse } from 'next/server';
import { listPrograms, addProgram, addFeatured } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const programs = await listPrograms();
    return NextResponse.json({ programs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load programs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      school, title, location, delivery, lengthWeeks, cost,
      certs, startDate, url, externalUrl, description, featured,
    } = body;

    const program = await addProgram({
      school,
      title,
      location,
      delivery: delivery || 'in-person',
      length_weeks: typeof lengthWeeks === 'number' ? lengthWeeks : undefined,
      cost: typeof cost === 'number' ? cost : undefined,
      certs,
      start_date: startDate || null,
      url: url || null,
      external_url: externalUrl || null,
      description,
      featured: !!featured,
    });

    if (featured) {
      await addFeatured({
        kind: 'program',
        ref_id: program.id,
        category_hint: title,
        metro_hint: location,
      });
    }

    return NextResponse.json({ program }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid program payload' }, { status: 400 });
  }
}
