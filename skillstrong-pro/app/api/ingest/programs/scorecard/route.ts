// /app/api/ingest/programs/scorecard/route.ts
import { NextResponse } from 'next/server';
import { fetchSchoolsByCIP4, friendlyProgramTitle } from '@/lib/scorecard';
import { addProgram } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/programs/scorecard
 * body: { cip4:"4805", states?:["CA","OH",...], pages?:2, perPage?:100, featured?:boolean }
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
    let total = 0;
    const created: any[] = [];

    for (const st of targets) {
      const schools = await fetchSchoolsByCIP4({ cip4, state: st, perPage, pages });
      for (const s of schools) {
        const school = s['school.name'];
        const city = s['school.city'];
        const state = s['school.state'];
        const schoolUrl = s['school.school_url'] || null;
        const apiTitle = s['latest.programs.cip_4_digit.title'] || null;
        const title = friendlyProgramTitle(cip4, apiTitle);

        const program = await addProgram({
          school,
          title,
          location: `${city}, ${state}`,
          delivery: 'in-person',
          length_weeks: null,
          cost: null,
          certs: [],
          start_date: null,
          url: null,
          external_url: schoolUrl,
          description: `${title} at ${school}. Listed via College Scorecard (CIP ${cip4}).`,
          featured,
        });
        total++;
        created.push(program);
      }
    }

    return NextResponse.json({ ok: true, count: total, programs: created });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Scorecard ingest failed' }, { status: 500 });
  }
}
