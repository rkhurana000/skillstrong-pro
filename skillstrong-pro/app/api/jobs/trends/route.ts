// /app/api/jobs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('title, location, skills')
      .limit(1000); // Analyze the latest 1000 jobs

    if (error) throw error;

    // Aggregate Titles
    const titleCounts = jobs.reduce((acc, { title }) => {
      acc[title] = (acc[title] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topTitles = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(item => item[0]);

    // Aggregate Cities
    const locationCounts = jobs.reduce((acc, { location }) => {
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topCities = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(item => item[0]);

    // Aggregate Skills
    const skillCounts = jobs.reduce((acc, { skills }) => {
        if (Array.isArray(skills)) {
            skills.forEach(skill => {
                if(skill) acc[skill] = (acc[skill] || 0) + 1;
            });
        }
        return acc;
    }, {} as Record<string, number>);
    const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(item => item[0]);

    return NextResponse.json({
      jobTitles: topTitles,
      popularCities: topCities,
      inDemandSkills: topSkills,
    });

  } catch (e: any) {
    console.error("Error fetching job trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends' }, { status: 500 });
  }
}
