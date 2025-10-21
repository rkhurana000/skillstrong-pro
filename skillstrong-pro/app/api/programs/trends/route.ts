// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch more programs to get a better sample for trends
    const { data: programs, error } = await supabaseAdmin
      .from('programs')
      .select('title, city, state, length_weeks, program_type') // Added program_type
      .limit(5000); // Increased limit further

    if (error) throw error;
    if (!programs) throw new Error("No programs data returned from database.");


    // 1. Trending Programs - Show most frequent titles containing keywords
    const keywords = [
        'welding', 'robotic', 'cnc', 'machinist', 'additive', 'quality',
        'manufacturing', 'metal work', 'maintenance', 'automation', 'technician',
        'fabrication', 'mechatronics', 'industrial'
    ];
    const titleCounts: Record<string, number> = {};
    programs.forEach(({ title }) => {
      // Ensure title is treated as a string, even if null/undefined
      const programTitle = String(title || '').toLowerCase();
      if (programTitle && keywords.some(kw => programTitle.includes(kw))) {
        // Use the original title casing for display
        const displayTitle = title || "Unknown Program";
        titleCounts[displayTitle] = (titleCounts[displayTitle] || 0) + 1;
      }
    });
    // Sort by count (descending), take top 10
    const trendingPrograms = Object.entries(titleCounts)
                                   .sort(([, countA], [, countB]) => countB - countA)
                                   .slice(0, 10)
                                   .map(([title]) => title); // Get only the title string


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
        // Ensure length_weeks is treated as a number, check > 0
        const weeks = Number(length_weeks);
        if (!isNaN(weeks) && weeks > 0) {
            durationCounts[weeks] = (durationCounts[weeks] || 0) + 1;
        }
    });
    const commonDurations = Object.entries(durationCounts)
        .sort((a, b) => Number(b[1]) - Number(a[1])) // Sort by count (numeric)
        .slice(0, 8)
        .map(item => `${item[0]} weeks`); // Format as "X weeks"

    // 4. (For Debugging/Confirming Program Types) - Get distinct program types present in data
    const distinctProgramTypes = Array.from(new Set(programs.map(p => p.program_type).filter(Boolean)));


    return NextResponse.json({
      trendingPrograms,
      popularLocations,
      commonDurations,
      // Include distinct types found, useful for frontend dropdown validation
      availableProgramTypes: distinctProgramTypes
    });

  } catch (e: any) {
    console.error("Error fetching program trends:", e);
    // Provide more detail in the error response if possible
    return NextResponse.json({ error: e.message || 'Failed to fetch trends', details: e.toString() }, { status: 500 });
  }
}
