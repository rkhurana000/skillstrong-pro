// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log("--- Fetching Program Trends (Direct Count Method) ---");
  try {
    // 1. Trending Programs - Direct SQL-like count and ranking
    const { data: topTitlesData, error: titlesError } = await supabaseAdmin
      .from('programs')
      .select('title, count', { count: 'exact' }) // Select title and count occurrences
      .not('title', 'is', null) // Ignore null titles
      .neq('title', '') // Ignore empty titles
      .order('count', { ascending: false }) // Order by count descending
      .limit(15); // Get the top 15

    if (titlesError) {
      console.error("Supabase error fetching top titles:", titlesError);
      throw titlesError;
    }

    // Extract just the titles from the result
    const trendingPrograms = topTitlesData ? topTitlesData.map(item => item.title) : [];
    console.log("Top 15 Trending Programs (Direct Query):", trendingPrograms);

    // --- Other Trends (Locations, Durations) - Fetch separately ---
    const { data: otherTrendsData, error: otherTrendsError } = await supabaseAdmin
      .from('programs')
      .select('city, state, length_weeks, program_type')
      .limit(5000); // Fetch data needed for other trends

    if (otherTrendsError) throw otherTrendsError;
    if (!otherTrendsData) throw new Error("Could not fetch data for other trends.");

    // 2. Popular Locations (City, State)
    const locationCounts: Record<string, number> = {};
    otherTrendsData.forEach(({ city, state }) => {
        if (city && state) {
            const location = `${city}, ${state}`;
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
    });
    const popularLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(item => item[0]);

    // 3. Common Course Durations
    const durationCounts: Record<number, number> = {};
    otherTrendsData.forEach(({ length_weeks }) => {
        const weeks = Number(length_weeks);
        if (!isNaN(weeks) && weeks > 0) {
            durationCounts[weeks] = (durationCounts[weeks] || 0) + 1;
        }
    });
    const commonDurations = Object.entries(durationCounts)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 8)
        .map(item => `${item[0]} weeks`);

    // 4. Get distinct program types
    const distinctProgramTypes = Array.from(new Set(otherTrendsData.map(p => p.program_type).filter(Boolean)));

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
