// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim();
  const program_type = u.searchParams.get("program_type")?.trim();
  const state = u.searchParams.get("state")?.trim();
  const location = u.searchParams.get("location")?.trim(); // Expects "City, ST" from trend card
  const duration = u.searchParams.get("duration")?.trim();

  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  console.log("--- New Search Request ---");
  console.log(`Params: q='${q}', program_type='${program_type}', state='${state}', location='${location}', duration='${duration}'`);

  // --- Apply Filters ---

  let locationFilterApplied = false;

  // STRICT City, State Filtering (PRIORITY if 'location' param exists and is parsable)
  if (location && location.includes(',')) {
    const parts = location.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 2) {
        const city = parts[0];
        const stateAbbr = parts[1];
        console.log(`Applying STRICT location filter: City ILIKE '${city}' AND State = '${stateAbbr}'`);
        // Use ILIKE for city (case-insensitive partial match), EQ for state (exact match)
        query = query.ilike('city', `%${city}%`).eq('state', stateAbbr);
        locationFilterApplied = true; // Mark that we applied this specific filter
    } else {
         console.warn(`Could not parse location parameter '${location}' as City, State. Applying broad search.`);
         // Fallback to broad search if parsing fails
          query = query.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
          locationFilterApplied = true;
    }
  }

  // State Dropdown Filter (Applied only if strict location filter was NOT applied)
  if (!locationFilterApplied && state && state !== 'All States') {
    console.log(`Applying State Dropdown filter: State = '${state}'`);
    query = query.eq('state', state);
    locationFilterApplied = true;
  }

  // Broad Location Search (Applied if 'location' was single term and no state dropdown used)
  if (!locationFilterApplied && location) {
     console.log(`Applying BROAD location filter (single term): '${location}'`);
     query = query.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
     locationFilterApplied = true;
  }


  // Keyword/Program/School Filter (Search Box 'q')
  if (q) {
     console.log(`Applying Keyword filter: q='${q}'`);
     const durationMatch = q.match(/^(\d+)\s+weeks$/i);
     if (durationMatch) {
        const weeks = parseInt(durationMatch[1], 10);
         if (!isNaN(weeks)) {
            query = query.eq('length_weeks', weeks);
         }
     } else {
        // Apply general keyword search across title and school
        query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%`);
     }
  }

  // Duration Filter (from Trend Card)
  if (duration) {
      // Extract number, handle potential " weeks" suffix
      const weeks = parseInt(duration.replace(/\s*weeks/i, ''), 10);
      if (!isNaN(weeks)) {
          console.log(`Applying Duration filter: ${weeks} weeks`);
          query = query.eq('length_weeks', weeks);
      }
  }

  // Program Type Filter
  if (program_type && program_type !== 'all') {
    console.log(`Applying Program Type filter: '${program_type}'`);
    query = query.eq('program_type', program_type);
  }

  // --- Execute Query ---
  query = query.range(offset, offset + limit - 1);
  // Keep sorting consistent
  query = query.order("featured", { ascending: false }).order("state").order("city").order("school");

  console.log('Executing final query structure...'); // Log before execution

  const { data, error, count } = await query;

  if (error) {
    console.error("Program search error:", error);
    // Log the failing query structure if possible (Supabase might not expose it directly here)
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Query successful: Found ${count} results.`);

  return NextResponse.json({ programs: data, count, page, limit });
}
