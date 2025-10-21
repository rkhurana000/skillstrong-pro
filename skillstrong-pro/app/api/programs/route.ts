// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim(); // General keyword/program/school search
  const program_type = u.searchParams.get("program_type")?.trim();
  
  // FIX: Corrected search_params to searchParams
  const state = u.searchParams.get("state")?.trim(); // State dropdown
  const location = u.searchParams.get("location")?.trim(); // Location term (from Trend card OR search bar if comma used)
  const duration = u.searchParams.get("duration")?.trim(); // Duration term

  // FIX: Corrected search_params to searchParams
  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  // --- Apply Filters ---

  // Location Filtering Logic
  if (location) {
    const parts = location.split(',').map(s => s.trim()).filter(Boolean);
    const firstPart = parts[0];
    const secondPart = parts.length > 1 ? parts[1] : null;

    if (secondPart) { // Assume "City, State"
       console.log(`Filtering by Location (Trend/Comma): City='${firstPart}', State='${secondPart}'`);
       query = query.ilike('city', `%${firstPart}%`).eq('state', secondPart);
    } else { // Assume a single term (could be City, Metro, maybe Zip)
       console.log(`Filtering by Location (Trend/Single Term): '${firstPart}'`);
       // FIX: Ensure correct state matching if the single term is a state abbr
       if (firstPart.length === 2 && firstPart === firstPart.toUpperCase()) {
           query = query.or(`city.ilike.%${firstPart}%,state.eq.${firstPart},metro.ilike.%${firstPart}%,zip_code.eq.${firstPart}%`);
       } else {
            query = query.or(`city.ilike.%${firstPart}%,metro.ilike.%${firstPart}%,zip_code.eq.${firstPart}%`); // Search city, metro, zip
       }
    }
  } else if (state && state !== 'All States') {
    console.log(`Filtering by State Dropdown: State='${state}'`);
    query = query.eq('state', state);
  }

  // Keyword/Program/School Filter (Search Box 'q')
  if (q) {
     console.log(`Filtering by Keyword: q='${q}'`);
     const durationMatch = q.match(/^(\d+)\s+weeks$/i);
     if (durationMatch) {
        const weeks = parseInt(durationMatch[1], 10);
         if (!isNaN(weeks)) {
            console.log(`Keyword interpreted as Duration: ${weeks} weeks`);
            query = query.eq('length_weeks', weeks);
         }
     } else {
        query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%`);
     }
  }

  // Duration Filter (from Trend Card)
  if (duration) {
      const weeks = parseInt(duration.split(' ')[0], 10); // Extract number before " weeks"
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
