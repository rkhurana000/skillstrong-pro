// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim(); // General keyword search
  const program_type = u.searchParams.get("program_type")?.trim();
  const state = u.searchParams.get("state")?.trim(); // From State dropdown
  const location = u.searchParams.get("location")?.trim(); // From Location trend card
  const duration = u.searchParams.get("duration")?.trim(); // From Duration trend card

  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  // --- Apply Filters ---

  // Specific Location Filter (from trend card click) - Highest Priority
  if (location) {
    const [city, stateAbbr] = location.split(',').map(s => s.trim());
    console.log(`Filtering by Location Trend: City='${city}', State='${stateAbbr}'`); // Debug log
    if (city) query = query.ilike('city', `%${city}%`);
    if (stateAbbr) query = query.eq('state', stateAbbr);
  }
  // State Filter (from dropdown) - Applied only if specific location isn't set
  else if (state && state !== 'All States') {
    console.log(`Filtering by State Dropdown: State='${state}'`); // Debug log
    query = query.eq('state', state);
  }

  // Keyword Filter (Search Box) - Applied alongside location/state filters
  if (q) {
    console.log(`Filtering by Keyword: q='${q}'`); // Debug log
    // Check if keyword looks like a duration ("XX weeks")
     const durationMatch = q.match(/^(\d+)\s+weeks$/i);
     if (durationMatch) {
        const weeks = parseInt(durationMatch[1], 10);
         if (!isNaN(weeks)) {
            console.log(`Keyword interpreted as Duration: ${weeks} weeks`); // Debug log
            query = query.eq('length_weeks', weeks);
         }
     } else {
        // Apply general keyword search across title and school
        query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%`);
     }
  }


  // Duration Filter (from trend card click)
  if (duration) {
      const weeks = parseInt(duration, 10);
      if (!isNaN(weeks)) {
          console.log(`Filtering by Duration Trend: ${weeks} weeks`); // Debug log
          query = query.eq('length_weeks', weeks);
      }
  }

  // Program Type Filter
  if (program_type && program_type !== 'all') {
    console.log(`Filtering by Program Type: '${program_type}'`); // Debug log
    query = query.eq('program_type', program_type);
  }

  // --- Execute Query ---
  query = query.range(offset, offset + limit - 1);
  query = query.order("featured", { ascending: false }).order("school", { ascending: true });

  console.log('Executing Query:', query); // Log the final query structure

  const { data, error, count } = await query;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Query successful: Found ${count} results.`); // Debug log

  return NextResponse.json({ programs: data, count, page, limit });
}
