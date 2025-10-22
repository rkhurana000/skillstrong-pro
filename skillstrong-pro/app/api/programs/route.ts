// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // Ensure correct import

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim() || undefined;
  const city = u.searchParams.get("city")?.trim() || undefined; // city param
  const state = u.searchParams.get("state")?.trim() || undefined;
  const duration = u.searchParams.get("duration")?.trim() || undefined; // Keep duration

  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  // Start base query builder
  let queryBuilder = supabaseAdmin.from("programs").select("*, city, state", { count: 'exact' });

  console.log("--- Program Search Request ---");
  console.log(`Params: q='${q}', city='${city}', state='${state}', duration='${duration}'`);

  // --- Apply Filters ---

  // 1. Keyword/Program/School Filter ('q') - Apply first if present
  if (q) {
     console.log(`Applying Keyword filter: q='${q}'`);
     // Apply OR condition for keyword search across school and title
     queryBuilder = queryBuilder.or(`school.ilike.%${q}%,title.ilike.%${q}%`);
  }

  // 2. State Filter (Exact Match) - Apply if NOT 'All States'
  if (state && state !== 'All States') {
      console.log(`Applying State filter: State = '${state}'`);
      queryBuilder = queryBuilder.eq('state', state); // Filter on the 'state' column
  }

  // 3. City Filter (Case-Insensitive LIKE) - Apply *only if state filter is also applied* or if it's the only location filter
  //    This ensures city search is within the selected state if a state is chosen.
  if (city) {
      console.log(`Applying City filter: City ILIKE '%${city}%'`);
      // Apply ilike filter for city. Since state filter (if any) was already added,
      // this chains as an AND condition.
      queryBuilder = queryBuilder.ilike('city', `%${city}%`);
  }

  // 4. Duration Filter
  let durationWeeks: number | null = null;
  if (duration) {
      const weeksMatch = duration.match(/^(\d+)\s*weeks?$/i);
      if (weeksMatch && weeksMatch[1]) {
           const weeks = parseInt(weeksMatch[1], 10);
           if (!isNaN(weeks)) durationWeeks = weeks;
      }
  }
  if (durationWeeks !== null) {
      console.log(`Applying Duration filter: ${durationWeeks} weeks`);
      queryBuilder = queryBuilder.eq('length_weeks', durationWeeks);
  }

  // --- Add Pagination and Ordering ---
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);
  queryBuilder = queryBuilder.order("featured", { ascending: false }).order("state").order("city").order("school");

  console.log('Executing final program query...');

  // Execute the query
  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Program query successful: Found ${count ?? 'unknown'} results.`);

  return NextResponse.json({ programs: data || [], count: count ?? 0, page, limit }); // Return empty array and 0 count if null
}

// POST function for adding programs should remain unchanged
// export async function POST(req: NextRequest) { ... }
