// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Helper function to extract a core subject keyword from a title
function extractSubject(title: string | null): string | null {
    if (!title) return null;
    const lowerTitle = title.toLowerCase();

    // Prioritized keywords
    if (lowerTitle.includes('cnc')) return 'CNC Machining';
    if (lowerTitle.includes('machinist') || lowerTitle.includes('machining')) return 'Machining';
    if (lowerTitle.includes('welding')) return 'Welding';
    if (lowerTitle.includes('robotic')) return 'Robotics / Automation';
    if (lowerTitle.includes('additive') || lowerTitle.includes('3d print')) return 'Additive Manufacturing';
    if (lowerTitle.includes('quality control') || lowerTitle.includes('quality assurance') || lowerTitle.includes('inspector')) return 'Quality Control';
    if (lowerTitle.includes('maintenance') || lowerTitle.includes('industrial tech')) return 'Industrial Maintenance';
    if (lowerTitle.includes('mechatronics')) return 'Mechatronics';
    if (lowerTitle.includes('automation')) return 'Automation'; // Catch-all for automation if not robotics
    if (lowerTitle.includes('manufacturing')) return 'Manufacturing Technology'; // Generic fallback

    return null; // Return null if no specific keyword found
}


export async function GET() {
  try {
    const { data: programs, error } = await supabaseAdmin
      .from('programs')
      .select('title, city, state, length_weeks, program_type')
      .limit(5000); // Keep large limit for accuracy

    if (error) throw error;
    if (!programs) throw new Error("No programs data returned from database.");


    // 1. Trending Programs - Count core subjects extracted from titles
    const subjectCounts: Record<string, number> = {};
    programs.forEach(({ title }) => {
        const subject = extractSubject(title);
        if (subject) {
            subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
        }
    });
     // Sort subjects by count, take top 10
    const trendingPrograms = Object.entries(subjectCounts)
                                   .sort(([, countA], [, countB]) => countB - countA)
                                   .slice(0, 10)
                                   .map(([subject]) => subject);


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

    // 4. Get distinct program types
    const distinctProgramTypes = Array.from(new Set(programs.map(p => p.program_type).filter(Boolean)));


    return NextResponse.json({
      trendingPrograms, // Now contains subjects like 'Welding', 'CNC Machining', etc.
      popularLocations,
      commonDurations,
      availableProgramTypes: distinctProgramTypes
    });

  } catch (e: any) {
    console.error("Error fetching program trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends', details: e.toString() }, { status: 500 });
  }
}
