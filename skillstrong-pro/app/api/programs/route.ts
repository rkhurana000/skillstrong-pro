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

  // Start base query
  let queryBuilder = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  console.log("--- New Search Request ---");
  console.log(`Params: q='${q}', program_type='${program_type}', state='${state}', location='${location}', duration='${duration}'`);

  // --- Apply Filters Sequentially ---
  let locationFilterApplied = false;

  // Filter 1: STRICT City, State (Highest Priority)
  // Check if location exists, contains a comma, and results in exactly two non-empty parts
  if (location) {
      const parts = location.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length === 2) {
          const city = parts[0];
          const stateAbbr = parts[1];
          // Basic validation for state abbreviation format
          if (stateAbbr.length === 2 && stateAbbr === stateAbbr.toUpperCase()) {
              console.log(`Applying STRICT location filter: City ILIKE '%${city}%' AND State = '${stateAbbr}'`);
              // Apply the filters directly using AND logic
              queryBuilder = queryBuilder.ilike('city', `%${city}%`).eq('state', stateAbbr);
              locationFilterApplied = true; // Mark that this specific filter was used
          } else {
              console.warn(`Invalid State format in location parameter '${location}'. Applying broad location search instead.`);
              queryBuilder = queryBuilder.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
              locationFilterApplied = true;
          }
      }
      // If location exists but isn't "City, ST" format, handle it later as a broad search
  }


  // Filter 2: State Dropdown (Only if strict location wasn't applied)
  if (!locationFilterApplied && state && state !== 'All States') {
    console.log(`Applying State Dropdown filter: State = '${state}'`);
    queryBuilder = queryBuilder.eq('state', state); // Modify query
    locationFilterApplied = true;
  }

  // Filter 3: Broad Location (Single term 'location', no state dropdown, strict filter failed/not applicable)
  // This handles cases where 'location' is just a city, zip, or metro without a state, OR if parsing failed above
   if (!locationFilterApplied && location) {
     console.log(`Applying BROAD location filter (single term or failed parse): '${location}'`);
     queryBuilder = queryBuilder.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`); // Modify query
     locationFilterApplied = true;
  }


  // Filter 4: Keyword/Program/School ('q')
  if (q) {
     console.log(`Applying Keyword filter: q='${q}'`);
     const durationMatch = q.match(/^(\d+)\s+weeks$/i);
     if (durationMatch) {
        const weeks = parseInt(durationMatch[1], 10);
         if (!isNaN(weeks)) {
            queryBuilder = queryBuilder.eq('length_weeks', weeks); // Modify query
         }
     } else {
        queryBuilder = queryBuilder.or(`school.ilike.%${q}%,title.ilike.%${q}%`); // Modify query
     }
  }

  // Filter 5: Duration (from Trend Card)
  if (duration) {
      const weeks = parseInt(duration.replace(/\s*weeks/i, ''), 10);
      if (!isNaN(weeks)) {
          console.log(`Applying Duration filter: ${weeks} weeks`);
          queryBuilder = queryBuilder.eq('length_weeks', weeks); // Modify query
      }
  }

  // Filter 6: Program Type
  if (program_type && program_type !== 'all') {
    console.log(`Applying Program Type filter: '${program_type}'`);
    queryBuilder = queryBuilder.eq('program_type', program_type); // Modify query
  }

  // --- Add Pagination and Ordering AFTER all filters ---
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);
  queryBuilder = queryBuilder.order("featured", { ascending: false }).order("state").order("city").order("school");

  console.log('Executing final query...');

  // Execute the query *after* all filters have been chained
  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Query successful: Found ${count} results.`); // This count should now reflect the filters

  return NextResponse.json({ programs: data, count, page, limit });
}
