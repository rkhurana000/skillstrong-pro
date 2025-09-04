// /app/api/ingest/programs/scorecard/route.ts
import { NextResponse } from 'next/server';
import { fetchSchoolsByCIP4, friendlyProgramTitle } from '@/lib/scorecard';
import { addProgram } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/programs/scorecard
 * body: { cip4: "4805", states?: ["CA","AZ",...], pages?: 2, perPage?: 100, featured?: boolean }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const cip4: string = (body.cip4 || '').toString();
    if (!cip4) return NextResponse.json({ error: 'cip4 is required' }, { status: 400 });

    const states: string[] = Array.isArray(body.states) ? body.states : [body.state].filter(Boolean);
    const pages: number = body.pages ?? 2;
    const perPage: number = body.perPage ?? 100;
    const featured: boolean = !!body.featured;

    const targets = states.length ? states : [undefined];
    const created: any[] = [];

    for (const st of targets) {
      const schools = await fetchSchoolsByCIP4({ cip4, state: st, perPage, pages });
      for (const s of schools) {
        const apiTitle = s['latest.programs.cip
