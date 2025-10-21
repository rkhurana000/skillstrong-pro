// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log("--- Fetching Program Trends (Focused JS Count) ---");
  try {
    const { data: programs, error } = await supabaseAdmin
      .from('programs')
      .select('title, city, state, length_weeks, program_type')
      .limit(5000); // Fetch a large sample

    if (error) {
        console.error("Supabase error fetching programs for trends:", error);
        return NextResponse.json({ error: `Supabase error: ${error.message}` }, { status: 500 });
    }
    if (!programs || programs.length === 0) { // Check for empty array too
        console.error("No programs data returned from database for trends.");
        return NextResponse.json({ error: "No program data found." }, { status: 404 });
    }
    console.log(`Fetched ${programs.length} programs for trend analysis.`);

    // 1. Trending Programs - Count NORMALIZED (lowercase, trimmed) exact titles
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
    const sortedCounts = Object.entries(titleCounts).sort(([, countA], [, countB]) => countB - countA);
    console.log(`Found ${sortedCounts.length} unique normalized titles.`);
    console.log("Raw Title Counts (Top 50 Normalized):", sortedCounts.slice(0, 50)); // Log top 50 counts

    // Get the top 15 titles using original casing
    const trendingPrograms = sortedCounts.slice(0, 15).map(([normalizedTitle]) => originalTitleMapping[normalizedTitle] || normalizedTitle);
    console.log("Top 15 Trending Programs (Final):", trendingPrograms);

    // --- Other Trends (Keep as before) ---
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

    console.log("Trends calculation complete.");
    return NextResponse.json({
      trendingPrograms: trendingPrograms || [],
      popularLocations: popularLocations || [],
      commonDurations: commonDurations || [],
      availableProgramTypes: distinctProgramTypes || []
    });

  } catch (e: any) {
    console.error("Unhandled error in /api/programs/trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends', details: e.toString() }, { status: 500 });
  }
}
