// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim(); // General keyword/program/school search
  const program_type = u.searchParams.get("program_type")?.trim();
  const state = u.searchParams.get("state")?.trim(); // State dropdown
  const location = u.searchParams.get("location")?.trim(); // Location term (from Trend card "City, ST")
  const duration = u.searchParams.get("duration")?.trim(); // Duration term

  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  // --- Apply Filters ---

  // **STRICT City, State Filtering (from location trend card)**
  if (location && location.includes(',')) {
    const parts = location.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 2) {
        const city = parts[0];
        const stateAbbr = parts[1];
        console.log(`Applying STRICT location filter: City='${city}', State='${stateAbbr}'`);
        // Use .eq for exact match (case-insensitive depends on DB collation, ilike is safer for city)
        query = query.ilike('city', city).eq('state', stateAbbr); // Strict AND
    } else {
         console.warn(`Could not parse location parameter: '${location}'`);
         // Apply broader filter as fallback if parsing fails
         query = query.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
    }
  }
  // State Filter (from dropdown) - Applied only if specific location isn't set
  else if (state && state !== 'All States') {
    console.log(`Filtering by State Dropdown: State='${state}'`);
    query = query.eq('state', state);
  }
  // If only a single term was passed via 'location' (e.g., just "Sacramento"), treat it broadly
  else if (location) {
     console.log(`Applying BROAD location filter (single term): '${location}'`);
     query = query.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
  }


  // Keyword/Program/School Filter (Search Box 'q')
  // This is applied *in addition* to any location filters
  if (q) {
     console.log(`Filtering by Keyword: q='${q}'`);
     const durationMatch = q.match(/^(\d+)\s+weeks$/i);
     if (durationMatch) {
        const weeks = parseInt(durationMatch[1], 10);
         if (!isNaN(weeks)) {
            query = query.eq('length_weeks', weeks);
         }
     } else {
        query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%`);
     }
  }

  // Duration Filter (from Trend Card)
  if (duration) {
      const weeks = parseInt(duration.split(' ')[0], 10);
      if (!isNaN(weeks)) {
          console.log(`Filtering by Duration Trend: ${weeks} weeks`);
          query = query.eq('length_weeks', weeks);
      }
  }

  // Program Type Filter
  if (program_type && program_type !== 'all') {
    console.log(`Filtering by Program Type: '${program_type}'`);
    query = query.eq('program_type', program_type);
  }

  // --- Execute Query ---
  query = query.range(offset, offset + limit - 1);
  query = query.order("featured", { ascending: false }).order("created_at", { ascending: false });

  console.log('Executing Query...');

  const { data, error, count } = await query;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Query successful: Found ${count} results.`);

  return NextResponse.json({ programs: data, count, page, limit });
}
