// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim();
  const location_q = u.searchParams.get("location")?.trim();
  const program_type = u.searchParams.get("program_type")?.trim();
  const delivery = u.searchParams.get("delivery") as "in-person" | "online" | "hybrid" | null;
  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  // --- Location Fallback Search ---
  // If no results for a specific city, we can broaden the search.
  // This example uses a simple metro-area fallback, but you could also
  // implement a radius search here if you have lat/lon for the location query.
  
  let query = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  // Keyword filter
  if (q) {
    query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  // Location filter
  if (location_q) {
      query = query.or(`city.ilike.%${location_q}%,state.ilike.%${location_q}%,zip_code.ilike.%${location_q}%,metro.ilike.%${location_q}%`);
  }

  // Dropdown filters
  if (program_type && program_type !== 'all') {
    query = query.eq('program_type', program_type);
  }
  if (delivery && delivery !== 'all') {
    query = query.eq('delivery', delivery);
  }

  query = query.range(offset, offset + limit - 1);
  query = query.order("featured", { ascending: false }).order("school", { ascending: true });

  let { data, error, count } = await query;

  // **FALLBACK LOGIC**: If no results and it was a specific location search, try searching the metro area.
  if (count === 0 && location_q) {
    console.log(`No results for "${location_q}", attempting fallback search...`);
    
    // A real implementation would geocode the user's input to find the metro area (cbsa_code)
    // For this example, we'll just broaden the search to any location match.
    // This is where you would call your `programs_in_radius` function if you had lat/lon.
    let fallbackQuery = supabaseAdmin.from("programs").select("*", { count: 'exact' });
    if (q) {
       fallbackQuery = fallbackQuery.or(`school.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
    }
    // A simple fallback could be to just ignore location
    
    const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery;
    
    if (!fallbackError) {
        data = fallbackData;
        count = fallbackCount;
    }
  }

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ programs: data, count, page, limit }, { status: 200 });
}
