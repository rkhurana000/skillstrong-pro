// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim();
  const program_type = u.searchParams.get("program_type")?.trim();
  const state = u.searchParams.get("state")?.trim();
  
  // NEW: Read location and duration params from trend card clicks
  const location = u.searchParams.get("location")?.trim();
  const duration = u.searchParams.get("duration")?.trim();
  
  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  // Keyword filter
  if (q) {
    query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%`);
  }

  // State dropdown filter
  if (state && state !== 'All States') {
    query = query.eq('state', state);
  }

  // Location trend card filter
  if (location) {
    const [city, stateAbbr] = location.split(',').map(s => s.trim());
    if (city) query = query.ilike('city', `%${city}%`);
    if (stateAbbr) query = query.eq('state', stateAbbr);
  }
  
  // Duration trend card filter
  if (duration) {
      const weeks = parseInt(duration, 10);
      if (!isNaN(weeks)) {
          query = query.eq('length_weeks', weeks);
      }
  }

  // Program Type filter
  if (program_type && program_type !== 'all') {
    query = query.eq('program_type', program_type);
  }

  query = query.range(offset, offset + limit - 1);
  query = query.order("featured", { ascending: false }).order("school", { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ programs: data, count, page, limit });
}
