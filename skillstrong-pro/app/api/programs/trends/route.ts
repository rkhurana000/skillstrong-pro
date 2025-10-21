// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// SQL function remains the same (fetching top titles)
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
    p.title IS NOT NULL AND p.title <> ''
    AND length(p.title) < 80 -- Added length constraint
    AND p.title NOT ILIKE 'CIP %' -- Exclude raw CIP codes
  GROUP BY
    p.title
  ORDER BY
    count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
*/

interface TopTitleResult {
  title: string;
  count: number;
}

export async function GET() {
  console.log("--- Fetching Program Trends (API Update) ---");
  try {
    // 1. Trending Programs - Call the SQL function
    const { data: topTitlesData, error: titlesError } = await supabaseAdmin
      .rpc('get_top_program_titles', { limit_count: 15 });

    if (titlesError) {
      console.error("Supabase RPC error fetching top titles:", titlesError);
      // Don't throw immediately, try fetching others
    }

    let trendingPrograms: string[] = [];
    if (Array.isArray(topTitlesData)) {
        trendingPrograms = topTitlesData.map((item: TopTitleResult) => item.title);
    } else {
        console.warn("RPC data for top titles was not an array:", topTitlesData);
    }

    // --- Other Trends (Locations, Durations, Types) ---
    const { data: otherTrendsData, error: otherTrendsError } = await supabaseAdmin
      .from('programs')
      .select('city, state, length_weeks') // Removed program_type for trends calculation
      .limit(5000); // Increased limit slightly for better stats

     if (otherTrendsError) {
         console.error("Supabase error fetching data for other trends:", otherTrendsError);
         // Only fail if both fetches failed
         if (titlesError) throw otherTrendsError;
     }
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

    // 3. Common Course Durations (Return weeks as string)
    const durationCounts: Record<number, number> = {};
    safeOtherTrendsData.forEach(({ length_weeks }) => {
        const weeks = Number(length_weeks);
        // Only count common, reasonable durations (e.g., > 1 week, < 4 years)
        if (!isNaN(weeks) && weeks > 1 && weeks < 208) {
             // Maybe round to nearest 4 weeks for cleaner grouping? Optional.
            // const roundedWeeks = Math.round(weeks / 4) * 4;
            // if (roundedWeeks > 0) durationCounts[roundedWeeks] = (durationCounts[roundedWeeks] || 0) + 1;
            durationCounts[weeks] = (durationCounts[weeks] || 0) + 1;
        }
    });
    const commonDurations = Object.entries(durationCounts)
        .sort((a, b) => Number(b[1]) - Number(a[1])) // Sort by frequency
        .slice(0, 8)
        .map(item => `${item[0]} weeks`); // Return the week string

    // 4. REMOVED: Get distinct program types calculation

    console.log("Trends calculation complete.");
    return NextResponse.json({
      trendingPrograms,
      popularLocations,
      commonDurations,
      // REMOVED: availableProgramTypes: distinctProgramTypes
    });

  } catch (e: any) {
    console.error("Error in /api/programs/trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends', details: e.toString() }, { status: 500 });
  }
}
