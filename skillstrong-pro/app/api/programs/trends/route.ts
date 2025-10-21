// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log("--- Fetching Program Trends (JS Count Method) ---"); // Updated log
  try {
    // Fetch necessary columns for all trend types
    const { data: programs, error } = await supabaseAdmin
      .from('programs')
      .select('title, city, state, length_weeks, program_type')
      .limit(5000); // Keep large limit

    if (error) {
        console.error("Supabase error fetching programs for trends:", error);
        // Return a specific error response
        return NextResponse.json({ error: `Supabase error: ${error.message}` }, { status: 500 });
    }
    if (!programs) {
        console.error("No programs data returned from database for trends.");
         // Return a specific error response
        return NextResponse.json({ error: "No program data found in database." }, { status: 404 });
    }
    console.log(`Fetched ${programs.length} programs for trend analysis.`);

    // 1. Trending Programs - Count NORMALIZED exact titles using JavaScript
    const titleCounts: Record<string, number> = {};
    const originalTitleMapping: Record<string, string> = {}; // Store original casing

    programs.forEach(({ title }) => {
        const originalTitle = String(title || '').trim();
        if (originalTitle.length > 3) {
            const normalizedTitle = originalTitle.toLowerCase();
            titleCounts[normalizedTitle] = (titleCounts[normalizedTitle] || 0) + 1;
            if (!originalTitleMapping[normalizedTitle]) {
                originalTitleMapping[normalizedTitle] = originalTitle;
            }
        }
    });

    console.log("Raw Title Counts (Normalized):", JSON.stringify(Object.entries(titleCounts).slice(0, 50), null, 2)); // Log first 50 counts

    const sortedTitles = Object.entries(titleCounts)
                               .sort(([, countA], [, countB]) => countB - countA);

    console.log(`Found ${sortedTitles.length} unique program titles.`);

    const topTitlesNormalized = sortedTitles.slice(0, 15);

    const trendingPrograms = topTitlesNormalized.map(([normalizedTitle]) => originalTitleMapping[normalizedTitle] || normalizedTitle);

    console.log("Top 15 Trending Programs (Final):", trendingPrograms);


    // --- Other Trends (Locations, Durations, Types) - Keep previous logic ---
    const locationCounts: Record<string, number> = {};
    programs.forEach(({ city, state }) => {
        if (city && state) {
            const location = `${city}, ${state}`;
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
    });
    const popularLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(item => item[0]);

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

    const distinctProgramTypes = Array.from(new Set(programs.map(p => p.program_type).filter(Boolean)));

    console.log("Trends calculation complete. Sending response.");
    // Ensure response is always valid JSON, even if arrays are empty
    return NextResponse.json({
      trendingPrograms: trendingPrograms || [],
      popularLocations: popularLocations || [],
      commonDurations: commonDurations || [],
      availableProgramTypes: distinctProgramTypes || []
    });

  } catch (e: any) {
    // Catch any unexpected errors during processing
    console.error("Unhandled error in /api/programs/trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends', details: e.toString() }, { status: 500 });
  }
}
