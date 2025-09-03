// /app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { db, addJob } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ jobs: db.jobs });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const job = addJob(body);
    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid job payload' }, { status: 400 });
  }
