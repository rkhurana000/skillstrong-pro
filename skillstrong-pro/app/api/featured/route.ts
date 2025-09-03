// /app/api/featured/route.ts
import { NextResponse } from 'next/server';
import { listFeatured, addFeatured } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind') as 'job' | 'program' | null;
    const featured = await listFeatured(kind ?? undefined);
    return NextResponse.json({ featured });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load featured' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = await addFeatured(body);
    return NextResponse.json({ featured: item }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid featured payload' }, { status: 400 });
  }
}
