// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: programs, error } = await supabaseAdmin
      .from('programs')
      .select('title, city, state, length_weeks, program_type')
      .limit(5000); // Fetch a good sample size

    if (error) throw error;
    if (!programs) throw new Error("No programs data returned from database.");

    // 1. Trending Programs - Count NORMALIZED exact titles
    const titleCounts: Record<string, number> = {};
    const originalTitleMapping: Record<string, string> = {}; // To store original casing

    programs.forEach(({ title }) => {
        const originalTitle = String(title || '').trim();
        if (originalTitle) {
            const normalizedTitle = originalTitle.toLowerCase(); // Normalize
            titleCounts[normalizedTitle] = (titleCounts[normalizedTitle] || 0) + 1;
            // Store the first encountered original casing for this normalized title
            if (!originalTitleMapping[normalizedTitle]) {
                originalTitleMapping[normalizedTitle] = originalTitle;
            }
        }
    });

    // Log the counts before slicing (for debugging)
    console.log("Full Title Counts (Normalized):", titleCounts);

    // Sort by count (descending), take top 15
    const trendingProgramsNormalized = Object.entries(titleCounts)
                                   .sort(([, countA], [, countB]) => countB - countA)
                                   .slice(0, 15) // Show top 15
                                   .map(([normalizedTitle]) => originalTitleMapping[normalizedTitle] || normalizedTitle); // Map back to original casing

    console.log("Top 15 Trending Programs:", trendingProgramsNormalized); // Debug log

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
      trendingPrograms: trendingProgramsNormalized, // Use the titles with original casing
      popularLocations,
      commonDurations,
      availableProgramTypes: distinctProgramTypes
    });

  } catch (e: any) {
    console.error("Error fetching program trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends', details: e.toString() }, { status: 500 });
  }
}
