// /app/api/featured/route.ts
import { NextResponse } from 'next/server';
import { db, addFeatured } from '@/lib/marketplace';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(req: Request) {
const { searchParams } = new URL(req.url);
const kind = searchParams.get('kind'); // optional filter
const out = kind ? db.featured.filter((f) => f.kind === kind) : db.featured;
return NextResponse.json({ featured: out });
}


export async function POST(req: Request) {
try {
const body = await req.json();
const feat = addFeatured(body);
return NextResponse.json({ featured: feat }, { status: 201 });
} catch (e) {
return NextResponse.json({ error: 'Invalid featured payload' }, { status: 400 });
}
}
