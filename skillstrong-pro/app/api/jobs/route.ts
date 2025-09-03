// /app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { listJobs, addJob, addFeatured } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jobs = await listJobs();
    return NextResponse.json({ jobs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load jobs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title, company, location, description,
      skills, payMin, payMax, apprenticeship,
      externalUrl, applyUrl, featured,
    } = body;

    const job = await addJob({
      title,
      company,
      location,
      description,
      skills,
      pay_min: typeof payMin === 'number' ? payMin : undefined,
      pay_max: typeof payMax === 'number' ? payMax : undefined,
      apprenticeship: !!apprenticeship,
      external_url: externalUrl || null,
      apply_url: applyUrl || null,
      featured: !!featured,
    });

    if (featured) {
      await addFeatured({
        kind: 'job',
        ref_id: job.id,
        category_hint: title,
        metro_hint: location,
      });
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid job payload' }, { status: 400 });
  }
}
