// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim();
  const location_q = u.searchParams.get("location")?.trim();
  const program_type = u.searchParams.get("program_type")?.trim();
  
  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  // Keyword filter
  if (q) {
    query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  // **IMPROVED LOCATION FILTER LOGIC**
  if (location_q) {
    const parts = location_q.split(',').map(p => p.trim()).filter(Boolean);
    const firstPart = parts[0];
    const secondPart = parts.length > 1 ? parts[1] : null;

    if (secondPart) {
      // Handles "City, State" or "City, Zip"
      query = query.ilike('city', `%${firstPart}%`).ilike('state', `%${secondPart}%`);
    } else {
      // Handles a single term (City, State, ZIP, or Metro)
      query = query.or(
        `city.ilike.%${firstPart}%,state.eq.${firstPart},zip_code.eq.${firstPart},metro.ilike.%${firstPart}%`
      );
    }
  }

  // Dropdown filter for Program Type
  if (program_type && program_type !== 'all') {
    query = query.eq('program_type', program_type);
  }

  // Delivery filter has been removed as requested.

  query = query.range(offset, offset + limit - 1);
  query = query.order("featured", { ascending: false }).order("school", { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ programs: data, count, page, limit });
}
