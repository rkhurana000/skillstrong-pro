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

  let queryBuilder = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  console.log("--- New Search Request ---");
  console.log(`Params: q='${q}', program_type='${program_type}', state='${state}', location='${location}', duration='${duration}'`);

  // --- Apply Filters Sequentially ---

  let locationFilterApplied = false;

  // STRICT City, State Filtering (PRIORITY if 'location' param exists and is "City, ST")
  if (location && location.includes(',')) {
    const parts = location.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 2) {
        const city = parts[0];
        const stateAbbr = parts[1];
        // Validate state abbreviation format (optional but good practice)
        if (stateAbbr.length === 2 && stateAbbr === stateAbbr.toUpperCase()) {
            console.log(`Applying STRICT location filter: City ILIKE '%${city}%' AND State = '${stateAbbr}'`);
            // Apply the filters directly using AND logic
            queryBuilder = queryBuilder.ilike('city', `%${city}%`).eq('state', stateAbbr);
            locationFilterApplied = true;
        } else {
             console.warn(`Invalid State format in location parameter '${location}'. Applying broad search.`);
             queryBuilder = queryBuilder.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
             locationFilterApplied = true; // Still mark as applied to prevent state dropdown override
        }
    } else {
         console.warn(`Could not parse location parameter '${location}' as City, State. Applying broad search.`);
         queryBuilder = queryBuilder.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
         locationFilterApplied = true;
    }
  }

  // State Dropdown Filter (Only if strict location wasn't applied)
  if (!locationFilterApplied && state && state !== 'All States') {
    console.log(`Applying State Dropdown filter: State = '${state}'`);
    queryBuilder = queryBuilder.eq('state', state);
    locationFilterApplied = true;
  }

  // Broad Location Search (Single term 'location', no state dropdown, strict filter failed/not applicable)
  if (!locationFilterApplied && location) {
     console.log(`Applying BROAD location filter (single term): '${location}'`);
     queryBuilder = queryBuilder.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
     locationFilterApplied = true;
  }


  // Keyword/Program/School Filter ('q')
  if (q) {
     console.log(`Applying Keyword filter: q='${q}'`);
     const durationMatch = q.match(/^(\d+)\s+weeks$/i);
     if (durationMatch) {
        const weeks = parseInt(durationMatch[1], 10);
         if (!isNaN(weeks)) {
            queryBuilder = queryBuilder.eq('length_weeks', weeks);
         }
     } else {
        queryBuilder = queryBuilder.or(`school.ilike.%${q}%,title.ilike.%${q}%`);
     }
  }

  // Duration Filter (from Trend Card)
  if (duration) {
      const weeks = parseInt(duration.replace(/\s*weeks/i, ''), 10);
      if (!isNaN(weeks)) {
          console.log(`Applying Duration filter: ${weeks} weeks`);
          queryBuilder = queryBuilder.eq('length_weeks', weeks);
      }
  }

  // Program Type Filter
  if (program_type && program_type !== 'all') {
    console.log(`Applying Program Type filter: '${program_type}'`);
    queryBuilder = queryBuilder.eq('program_type', program_type);
  }

  // --- Add Pagination and Ordering AFTER all filters ---
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);
  queryBuilder = queryBuilder.order("featured", { ascending: false }).order("state").order("city").order("school");

  console.log('Executing final query...');

  // Execute the fully built query
  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Query successful: Found ${count} results.`);

  return NextResponse.json({ programs: data, count, page, limit });
}
