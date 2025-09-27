// /app/api/jobs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('title, location, skills')
      .limit(1000);

    if (error) throw error;

    // Aggregate Titles
    const titleCounts: Record<string, number> = {};
    jobs.forEach(({ title }) => {
        // Simple normalization: take text before first comma or parenthesis
        const cleanTitle = title.split(/, | \(/)[0].trim();
        if (cleanTitle.length > 5 && cleanTitle.length < 50) { // Filter out noise
            titleCounts[cleanTitle] = (titleCounts[cleanTitle] || 0) + 1;
        }
    });
    const topTitles = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(item => item[0]);

    // Aggregate Cities, filtering out generic/invalid locations
    const locationCounts: Record<string, number> = {};
    const excludedLocations = new Set(['United States', 'Remote']);
    jobs.forEach(({ location }) => {
        if (location && !excludedLocations.has(location)) {
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
    });
    const topCities = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(item => item[0]);

    // Aggregate Skills
    const skillCounts: Record<string, number> = {};
    jobs.forEach(({ skills }) => {
        if (Array.isArray(skills)) {
            skills.forEach(skill => {
                if(skill) skillCounts[skill] = (skillCounts[skill] || 0) + 1;
            });
        }
    });
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
