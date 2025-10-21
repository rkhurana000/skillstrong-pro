// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: programs, error } = await supabaseAdmin
      .from('programs')
      // Select only necessary columns
      .select('title, city, state, length_weeks, program_type')
      .limit(5000); // Fetch a good sample size

    if (error) throw error;
    if (!programs) throw new Error("No programs data returned from database.");

    // 1. Trending Programs - Count exact titles
    const titleCounts: Record<string, number> = {};
    programs.forEach(({ title }) => {
        // Ensure title is treated as a string, handle nulls/undefined
        const programTitle = String(title || '').trim();
        // Only count non-empty titles
        if (programTitle) {
            titleCounts[programTitle] = (titleCounts[programTitle] || 0) + 1;
        }
    });
    // Sort by count (descending), take top 15
    const trendingPrograms = Object.entries(titleCounts)
                                   .sort(([, countA], [, countB]) => countB - countA)
                                   .slice(0, 15) // Show top 15
                                   .map(([title]) => title); // Get only the title string

    // 2. Popular Locations (City, State) - Logic remains the same
    const locationCounts: Record<string, number> = {};
    programs.forEach(({ city, state }) => {
        if (city && state) {
            const location = `${city}, ${state}`;
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
    });
    const popularLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(item => item[0]);

    // 3. Common Course Durations - Logic remains the same
    const durationCounts: Record<number, number> = {};
    programs.forEach(({ length_weeks }) => {
        const weeks = Number(length_weeks);
        if (!isNaN(weeks) && weeks > 0) {
            durationCounts[weeks] = (durationCounts[weeks] || 0) + 1;
        }
    });
    const commonDurations = Object.entries(durationCounts)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 8)
        .map(item => `${item[0]} weeks`);

    // 4. Get distinct program types actually present in the data
    const distinctProgramTypes = Array.from(new Set(programs.map(p => p.program_type).filter(Boolean)));

    return NextResponse.json({
      trendingPrograms, // Now contains exact titles
      popularLocations,
      commonDurations,
      availableProgramTypes: distinctProgramTypes
    });

  } catch (e: any) {
    console.error("Error fetching program trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends', details: e.toString() }, { status: 500 });
  }
}
