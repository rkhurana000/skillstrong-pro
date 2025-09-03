// /app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { addProgram, addJob, addFeatured } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Call once: POST /api/seed
 * Optional query: ?featured=1 to also mark as featured
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const markFeatured = searchParams.get('featured') === '1';

  // --- Seed Programs (your two examples) ---
  const programs = [
    {
      school: 'Cuesta College (Career Training Online)',
      title: 'CNC Machinist',
      location: 'San Luis Obispo, CA',
      delivery: 'online' as const,
      lengthWeeks: 24,
      cost: null,
      certs: ['NIMS-aligned'],
      startDate: null,
      url: null,
      externalUrl: 'https://careertraining.cuesta.edu/training-programs/cnc-machinist/?Category=construction-and-trades-trades',
      description: 'Online CNC Machinist career training program.',
      featured: markFeatured,
    },
    {
      school: 'Maricopa Community Colleges',
      title: 'AAS in Semiconductor Manufacturing',
      location: 'Phoenix, AZ',
      delivery: 'in-person' as const,
      lengthWeeks: 64,
      cost: null,
      certs: ['Semiconductor Tech'],
      startDate: null,
      url: null,
      externalUrl: 'https://www.maricopa.edu/degrees-certificates/science-technology-engineering-mathematics/semiconductor-manufacturing-3168-aas',
      description: 'Associate in Applied Science focused on semiconductor manufacturing.',
      featured: markFeatured,
    },
  ];

  // --- Seed Jobs (sample realistic placeholders with external/apply URLs) ---
  const jobs = [
    {
      title: 'CNC Machinist',
      company: 'Precision Dynamics',
      location: 'Cleveland, OH',
      description: 'Operate 3- and 5-axis CNC mills and lathes. Read blueprints, set tooling, hold tight tolerances.',
      skills: ['CNC', 'GD&T', 'Mastercam'],
      payMin: 52000,
      payMax: 72000,
      apprenticeship: false,
      externalUrl: 'https://www.indeed.com/',
      applyUrl: 'https://www.indeed.com/', // replace with the real apply link if available
      featured: markFeatured,
    },
    {
      title: 'Robotics Technician (Apprentice)',
      company: 'AutoFab Systems',
      location: 'Grand Rapids, MI',
      description: 'Assist with install & maintenance of industrial robots (Fanuc/Kuka). Learn PLC basics.',
      skills: ['Robotics', 'Troubleshooting', 'PLC basics'],
      payMin: 42000,
      payMax: 58000,
      apprenticeship: true,
      externalUrl: 'https://www.indeed.com/',
      applyUrl: 'https://www.indeed.com/',
      featured: markFeatured,
    },
  ];

  const createdPrograms = [];
  for (const p of programs) {
    const prg = await addProgram(p as any);
    if (markFeatured) await addFeatured({ kind: 'program', ref_id: prg.id, category_hint: prg.title, metro_hint: prg.location });
    createdPrograms.push(prg);
  }

  const createdJobs = [];
  for (const j of jobs) {
    const job = await addJob({
      title: j.title,
      company: j.company,
      location: j.location,
      description: j.description,
      skills: j.skills,
      pay_min: j.payMin,
      pay_max: j.payMax,
      apprenticeship: j.apprenticeship,
      external_url: j.externalUrl,
      apply_url: j.applyUrl,
      featured: j.featured,
    } as any);
    if (markFeatured) await addFeatured({ kind: 'job', ref_id: job.id, category_hint: job.title, metro_hint: job.location });
    createdJobs.push(job);
  }

  return NextResponse.json({ ok: true, programs: createdPrograms, jobs: createdJobs });
}
