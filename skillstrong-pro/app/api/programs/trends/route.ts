// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Create this SQL function in your Supabase SQL Editor ONCE:
/*
CREATE OR REPLACE FUNCTION get_top_program_titles(limit_count integer)
RETURNS TABLE(title text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.title,
    COUNT(p.id) as count
  FROM
    public.programs p
  WHERE
    p.title IS NOT NULL AND p.title <> '' -- Ignore null or empty titles
  GROUP BY
    p.title
  ORDER BY
    count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
*/

export async function GET() {
  console.log("--- Fetching Program Trends (RPC Method) ---");
  try {
    // 1. Trending Programs - Call the SQL function
    const { data: topTitlesData, error: titlesError } = await supabaseAdmin
      .rpc('get_top_program_titles', { limit_count: 15 }); // Call the function

    if (titlesError) {
      console.error("Supabase RPC error fetching top titles:", titlesError);
      // Try to return a valid empty structure on error
      return NextResponse.json({
          trendingPrograms: [], popularLocations: [], commonDurations: [], availableProgramTypes: []
      }, { status: 500, statusText: titlesError.message });
    }

    // Extract just the titles
    const trendingPrograms = topTitlesData ? topTitlesData.map(item => item.title) : [];
    console.log("Top 15 Trending Programs (RPC Query):", trendingPrograms);


    // --- Other Trends (Locations, Durations, Types) - Fetch separately for efficiency ---
    // Note: Fetching less data here as titles are handled by RPC
    const { data: otherTrendsData, error: otherTrendsError } = await supabaseAdmin
      .from('programs')
      .select('city, state, length_weeks, program_type')
      .limit(5000); // Fetch data needed for other trends

     if (otherTrendsError) {
         // Log the error but potentially continue if possible, or return error
         console.error("Supabase error fetching data for other trends:", otherTrendsError);
         // Depending on requirements, you might want to return an error or partial data
         // For now, let's try returning what we have if titles worked
         if(!topTitlesData) throw otherTrendsError; // Only throw if titles also failed
     }

    // Safely process other trends even if data fetching failed partially
    const safeOtherTrendsData = otherTrendsData || [];

    // 2. Popular Locations
    const locationCounts: Record<string, number> = {};
    safeOtherTrendsData.forEach(({ city, state }) => {
        if (city && state) {
            const location = `${city}, ${state}`;
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
    });
    const popularLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(item => item[0]);

    // 3. Common Course Durations
    const durationCounts: Record<number, number> = {};
    safeOtherTrendsData.forEach(({ length_weeks }) => {
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
    const distinctProgramTypes = Array.from(new Set(safeOtherTrendsData.map(p => p.program_type).filter(Boolean)));

    console.log("Trends calculation complete.");
    return NextResponse.json({
      trendingPrograms,
      popularLocations,
      commonDurations,
      availableProgramTypes: distinctProgramTypes
    });

  } catch (e: any) {
    console.error("Error in /api/programs/trends:", e);
    // Ensure a JSON response even on unexpected errors
    return NextResponse.json({ error: e.message || 'Failed to fetch trends', details: e.toString() }, { status: 500 });
  }
}
