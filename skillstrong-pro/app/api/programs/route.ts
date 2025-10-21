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
  let query = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  console.log("--- New Search Request ---");
  console.log(`Params: q='${q}', program_type='${program_type}', state='${state}', location='${location}', duration='${duration}'`);

  // --- Apply Filters ---

  let locationFilterApplied = false;

  // Filter 1: STRICT City, State (Highest Priority)
  if (location && location.includes(',') && location.split(',').map(s => s.trim()).filter(Boolean).length === 2) {
    const parts = location.split(',').map(s => s.trim());
    const city = parts[0];
    const stateAbbr = parts[1];
    if (stateAbbr && stateAbbr.length === 2 && stateAbbr === stateAbbr.toUpperCase()) {
        console.log(`Applying STRICT location filter: City ILIKE '%${city}%' AND State = '${stateAbbr}'`);
        query = query.ilike('city', `%${city}%`).eq('state', stateAbbr); // Modify query
        locationFilterApplied = true;
    } else {
        console.warn(`Invalid State format in location '${location}'. Applying broad location search instead.`);
        query = query.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`); // Modify query
        locationFilterApplied = true;
    }
  }

  // Filter 2: State Dropdown (Only if strict location wasn't applied)
  if (!locationFilterApplied && state && state !== 'All States') {
    console.log(`Applying State Dropdown filter: State = '${state}'`);
    query = query.eq('state', state); // Modify query
    locationFilterApplied = true;
  }

  // Filter 3: Broad Location (Single term 'location', no state dropdown, strict filter failed/not applicable)
  if (!locationFilterApplied && location) {
     console.log(`Applying BROAD location filter (single term): '${location}'`);
     query = query.or(`city.ilike.%${location}%,metro.ilike.%${location}%,zip_code.eq.${location}%`); // Modify query
     locationFilterApplied = true;
  }

  // Filter 4: Keyword/Program/School ('q')
  if (q) {
     console.log(`Applying Keyword filter: q='${q}'`);
     const durationMatch = q.match(/^(\d+)\s+weeks$/i);
     if (durationMatch) {
        const weeks = parseInt(durationMatch[1], 10);
         if (!isNaN(weeks)) {
            query = query.eq('length_weeks', weeks); // Modify query
         }
     } else {
        query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%`); // Modify query
     }
  }

  // Filter 5: Duration (from Trend Card)
  if (duration) {
      const weeks = parseInt(duration.replace(/\s*weeks/i, ''), 10);
      if (!isNaN(weeks)) {
          console.log(`Applying Duration filter: ${weeks} weeks`);
          query = query.eq('length_weeks', weeks); // Modify query
      }
  }

  // Filter 6: Program Type
  if (program_type && program_type !== 'all') {
    console.log(`Applying Program Type filter: '${program_type}'`);
    query = query.eq('program_type', program_type); // Modify query
  }

  // --- Add Pagination and Ordering AFTER all filters ---
  query = query.range(offset, offset + limit - 1);
  query = query.order("featured", { ascending: false }).order("state").order("city").order("school");

  console.log('Executing final query...');

  // Execute the query *after* all filters have been chained
  const { data, error, count } = await query;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Query successful: Found ${count} results.`); // This count should now reflect the filters

  return NextResponse.json({ programs: data, count, page, limit });
}
