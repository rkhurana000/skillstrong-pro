// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log("--- Fetching Program Trends ---");
  try {
    // Fetch only the 'title' column for efficiency in counting
    const { data: programs, error } = await supabaseAdmin
      .from('programs')
      .select('title, city, state, length_weeks, program_type') // Keep other fields for other trends
      .limit(5000); // Increased limit

    if (error) {
        console.error("Supabase error fetching programs for trends:", error);
        throw error;
    }
    if (!programs) {
        console.error("No programs data returned from database for trends.");
        throw new Error("No programs data returned from database.");
    }
    console.log(`Fetched ${programs.length} programs for trend analysis.`);

    // 1. Trending Programs - Count NORMALIZED exact titles
    const titleCounts: Record<string, number> = {};
    const originalTitleMapping: Record<string, string> = {}; // Store original casing

    programs.forEach(({ title }) => {
        const originalTitle = String(title || '').trim(); // Ensure string and trim
        if (originalTitle.length > 3) { // Only count titles with some substance
            const normalizedTitle = originalTitle.toLowerCase(); // Normalize case
            titleCounts[normalizedTitle] = (titleCounts[normalizedTitle] || 0) + 1;
            // Keep the first encountered original casing
            if (!originalTitleMapping[normalizedTitle]) {
                originalTitleMapping[normalizedTitle] = originalTitle;
            }
        }
    });

    // Log the raw counts before sorting/slicing
    console.log("Raw Title Counts (Normalized):", JSON.stringify(titleCounts, null, 2)); // Detailed log

    // Sort by count (descending), take top 15
    const sortedTitles = Object.entries(titleCounts)
                               .sort(([, countA], [, countB]) => countB - countA);

    console.log(`Found ${sortedTitles.length} unique program titles.`); // Log unique count

    const topTitlesNormalized = sortedTitles.slice(0, 15); // Take top 15

    // Map back to original casing for the response
    const trendingPrograms = topTitlesNormalized.map(([normalizedTitle]) => originalTitleMapping[normalizedTitle] || normalizedTitle);

    console.log("Top 15 Trending Programs (Final):", trendingPrograms); // Log final list

    // --- Other Trends (Locations, Durations, Types) - Keep previous logic ---
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

    console.log("Trends calculation complete.");
    return NextResponse.json({
      trendingPrograms,
      popularLocations,
      commonDurations,
      availableProgramTypes: distinctProgramTypes
    });

  } catch (e: any) {
    console.error("Error in /api/programs/trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends', details: e.toString() }, { status: 500 });
  }
}
