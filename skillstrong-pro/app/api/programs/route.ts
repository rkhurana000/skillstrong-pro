// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim();
  const program_type = u.searchParams.get("program_type")?.trim();
  const state = u.searchParams.get("state")?.trim();
  const location = u.searchParams.get("location")?.trim(); // Expects "City, ST"
  const duration = u.searchParams.get("duration")?.trim();

  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  // Start base query builder
  let queryBuilder = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  console.log("--- New Search Request ---");
  console.log(`Params: q='${q}', program_type='${program_type}', state='${state}', location='${location}', duration='${duration}'`);

  // --- Apply Filters Sequentially ---

  let specificLocationApplied = false;

  // 1. STRICT City, State Filtering (Highest Priority)
  if (location && location.includes(',') && location.split(',').map(s => s.trim()).filter(Boolean).length === 2) {
      const parts = location.split(',').map(s => s.trim());
      const city = parts[0];
      const stateAbbr = parts[1];

      // Check for valid state abbreviation format
      if (city && stateAbbr && stateAbbr.length === 2 && stateAbbr === stateAbbr.toUpperCase()) {
          console.log(`Applying STRICT location filter: City ILIKE '%${city}%' AND State = '${stateAbbr}'`);
          // Directly apply AND filters
          queryBuilder = queryBuilder.ilike('city', `%${city}%`).eq('state', stateAbbr);
          specificLocationApplied = true; // Mark that this specific filter took precedence
      } else {
          console.warn(`Location parameter '${location}' looked like City, State but failed validation. Applying broad search.`);
          // Fallback to broad search if format is invalid
          queryBuilder = queryBuilder.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
          specificLocationApplied = true; // Still counts as a location filter applied
      }
  }

  // 2. State Dropdown Filter (Only if STRICT City, State filter wasn't applied)
  if (!specificLocationApplied && state && state !== 'All States') {
      console.log(`Applying State Dropdown filter: State = '${state}'`);
      queryBuilder = queryBuilder.eq('state', state);
      // specificLocationApplied = true; // Not needed here as it's an alternative path
  }
   // 3. Broad Location Search (Only if NEITHER strict city/state nor state dropdown applied, but location exists)
   else if (!specificLocationApplied && location) {
       console.log(`Applying BROAD location filter (single term or failed parse): '${location}'`);
       queryBuilder = queryBuilder.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
       // specificLocationApplied = true; // Not needed here
   }


  // 4. Keyword/Program/School Filter ('q') - Always applied if present
  if (q) {
     console.log(`Applying Keyword filter: q='${q}'`);
     queryBuilder = queryBuilder.or(`school.ilike.%${q}%,title.ilike.%${q}%`);
  }

  // 5. Duration Filter (from Trend Card or 'q') - Always applied if present/valid
  let durationWeeks: number | null = null;
  if (duration) {
      const weeks = parseInt(duration.replace(/\s*weeks/i, ''), 10);
      if (!isNaN(weeks)) durationWeeks = weeks;
  } else if (q && q.match(/^(\d+)\s+weeks$/i)) {
      const weeks = parseInt(q.match(/^(\d+)\s+weeks$/i)![1], 10);
      if (!isNaN(weeks)) durationWeeks = weeks;
  }
  if (durationWeeks !== null) {
      console.log(`Applying Duration filter: ${durationWeeks} weeks`);
      queryBuilder = queryBuilder.eq('length_weeks', durationWeeks);
  }

  // 6. Program Type Filter - Always applied if present
  if (program_type && program_type !== 'all') {
    console.log(`Applying Program Type filter: '${program_type}'`);
    queryBuilder = queryBuilder.eq('program_type', program_type);
  }

  // --- Add Pagination and Ordering AFTER all filters ---
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);
  queryBuilder = queryBuilder.order("featured", { ascending: false }).order("state").order("city").order("school");

  console.log('Executing final query...');

  // Execute the query
  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Query successful: Found ${count} results.`); // This count should now reflect the filters

  return NextResponse.json({ programs: data, count, page, limit });
}
