// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: programs, error } = await supabaseAdmin
      .from('programs')
      .select('title, city, state, length_weeks')
      .limit(3000); // Increased limit to get a better sample size

    if (error) throw error;

    // 1. Trending Programs in key fields
    const keywords = ['welding', 'robotic', 'cnc', 'machinist', 'additive', 'quality', 'manufacturing'];
    const titleCounts: Record<string, number> = {};
    programs.forEach(({ title }) => {
      if (title && keywords.some(kw => title.toLowerCase().includes(kw))) {
        titleCounts[title] = (titleCounts[title] || 0) + 1;
      }
    });
    const trendingPrograms = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(item => item[0]);

    // 2. Popular Locations (City, State)
    const locationCounts: Record<string, number> = {};
    programs.forEach(({ city, state }) => {
        if (city && state) {
            const location = `${city}, ${state}`;
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
    });
    const popularLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(item => item[0]);

    // 3. Common Course Durations
    const durationCounts: Record<number, number> = {};
    programs.forEach(({ length_weeks }) => {
        if (length_weeks && length_weeks > 0) {
            durationCounts[length_weeks] = (durationCounts[length_weeks] || 0) + 1;
        }
    });
    const commonDurations = Object.entries(durationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(item => `${item[0]} weeks`);

    return NextResponse.json({
      trendingPrograms,
      popularLocations,
      commonDurations,
    });

  } catch (e: any) {
    console.error("Error fetching program trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends' }, { status: 500 });
  }
}
