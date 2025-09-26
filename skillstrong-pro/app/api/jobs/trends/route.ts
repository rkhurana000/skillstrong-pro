// /app/api/jobs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch top 8 job titles
    const { data: titles, error: titlesError } = await supabaseAdmin
      .from('jobs')
      .select('title')
      .limit(500);
    if (titlesError) throw titlesError;
    const titleCounts = titles.reduce((acc, { title }) => {
      acc[title] = (acc[title] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topTitles = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(item => item[0]);

    // Fetch top 8 cities
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('jobs')
      .select('location')
      .limit(500);
    if (locationsError) throw locationsError;
    const locationCounts = locations.reduce((acc, { location }) => {
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topCities = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(item => item[0]);

    // Fetch top 12 skills
    const { data: skills, error: skillsError } = await supabaseAdmin
      .from('jobs')
      .select('skills')
      .limit(500);
    if (skillsError) throw skillsError;
    const skillCounts = skills.reduce((acc, { skills: skillArray }) => {
        if (Array.isArray(skillArray)) {
            skillArray.forEach(skill => {
                acc[skill] = (acc[skill] || 0) + 1;
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
