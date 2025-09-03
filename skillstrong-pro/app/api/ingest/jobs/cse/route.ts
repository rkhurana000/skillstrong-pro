// /app/api/ingest/jobs/cse/route.ts
import { NextResponse } from 'next/server';
import { cseSearch } from '@/lib/cse';
import { addJob } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/jobs/cse
 * body: { queries?: string[], maxPerQuery?: number, featured?: boolean }
 * Defaults will pull a few manufacturing queries from Indeed and ManufacturingJobs.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const featured = !!body.featured;
    const maxPer = Math.min(10, body.maxPerQuery ?? 6);

    const defaults = [
      'site:indeed.com/viewjob (manufacturing OR machinist OR welder OR robotics)',
      'site:manufacturingjobs.com (manufacturing OR machinist OR welder OR robotics)',
    ];
    const queries: string[] = Array.isArray(body.queries) && body.queries.length ? body.queries : defaults;

    const created: any[] = [];
    for (const q of queries) {
      const items = await cseSearch(q, maxPer);
      for (const it of items) {
        // Basic heuristics for company/location from snippet
        const companyGuess = it.displayLink?.replace(/^www\./, '') || 'Job board';
        const locMatch = it.snippet?.match(/[A-Z][a-zA-Z]+,\s*[A-Z]{2}/);
        const title = it.title?.replace(/\s*-\s*Indeed.*$/i, '').trim();

        const job = await addJob({
          title: title || it.title || 'Manufacturing Role',
          company: companyGuess,
          location: locMatch?.[0] || 'United States',
          description: it.snippet || undefined,
          skills: [],
          pay_min: null,
          pay_max: null,
          apprenticeship: false,
          external_url: it.link,
          apply_url: it.link,
          featured,
        });
        created.push(job);
      }
    }

    return NextResponse.json({ ok: true, count: created.length, jobs: created });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'CSE ingest failed' }, { status: 500 });
  }
}
