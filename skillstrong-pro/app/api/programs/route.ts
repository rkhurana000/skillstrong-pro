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

  // Start building the query
  let queryBuilder = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  console.log("--- New Search Request ---");
  console.log(`Params: q='${q}', program_type='${program_type}', state='${state}', location='${location}', duration='${duration}'`);

  // --- Apply Filters Sequentially ---

  let locationFilterApplied = false;

  // STRICT City, State Filtering (PRIORITY)
  if (location && location.includes(',')) {
    const parts = location.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 2) {
        const city = parts[0];
        const stateAbbr = parts[1];
        console.log(`Applying STRICT location filter: City ILIKE '%${city}%' AND State = '${stateAbbr}'`);
        // Apply filters directly and reassign queryBuilder
        queryBuilder = queryBuilder.ilike('city', `%${city}%`).eq('state', stateAbbr);
        locationFilterApplied = true;
    } else {
         console.warn(`Could not parse location parameter '${location}' as City, State. Applying broad search.`);
         queryBuilder = queryBuilder.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`);
         locationFilterApplied = true;
    }
  }

  // State Dropdown Filter (Only if strict location wasn't applied)
  if (!locationFilterApplied && state && state !== 'All States') {
    console.log(`Applying State Dropdown filter: State = '${state}'`);
    queryBuilder = queryBuilder.eq('state', state); // Apply filter
    locationFilterApplied = true;
  }

  // Broad Location Search (Single term 'location', no state dropdown)
  if (!locationFilterApplied && location) {
     console.log(`Applying BROAD location filter (single term): '${location}'`);
     queryBuilder = queryBuilder.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`); // Apply filter
     locationFilterApplied = true;
  }


  // Keyword/Program/School Filter ('q')
  if (q) {
     console.log(`Applying Keyword filter: q='${q}'`);
     const durationMatch = q.match(/^(\d+)\s+weeks$/i);
     if (durationMatch) {
        const weeks = parseInt(durationMatch[1], 10);
         if (!isNaN(weeks)) {
            queryBuilder = queryBuilder.eq('length_weeks', weeks); // Apply filter
         }
     } else {
        queryBuilder = queryBuilder.or(`school.ilike.%${q}%,title.ilike.%${q}%`); // Apply filter
     }
  }

  // Duration Filter (from Trend Card)
  if (duration) {
      const weeks = parseInt(duration.replace(/\s*weeks/i, ''), 10);
      if (!isNaN(weeks)) {
          console.log(`Applying Duration filter: ${weeks} weeks`);
          queryBuilder = queryBuilder.eq('length_weeks', weeks); // Apply filter
      }
  }

  // Program Type Filter
  if (program_type && program_type !== 'all') {
    console.log(`Applying Program Type filter: '${program_type}'`);
    queryBuilder = queryBuilder.eq('program_type', program_type); // Apply filter
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
