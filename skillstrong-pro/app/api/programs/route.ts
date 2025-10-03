// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim();
  const metro = u.searchParams.get("metro")?.trim();
  const delivery = u.searchParams.get("delivery") as | "in-person" | "online" | "hybrid" | "all" | null;
  const requireUrl = u.searchParams.get("requireUrl") === "1";
  const page = parseInt(u.searchParams.get("page") || "1");
  const limit = parseInt(u.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("programs").select("*", { count: 'exact' });

  // THIS IS THE FIX: Chain filters correctly as AND conditions
  if (requireUrl) {
    query = query.not("url", "is", null);
  }
  if (q) {
    // This .or() applies to the keyword search only
    query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (metro) {
    // The .ilike() for metro is now correctly AND'd with the keyword search
    query = query.ilike('location', `%${metro}%`);
  }
  if (delivery && delivery !== "all") {
    query = query.eq("delivery", delivery);
  }
  
  query = query.range(offset, offset + limit - 1);
  query = query.order("featured", { ascending: false }).order("school", { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ programs: data, count, page, limit }, { status: 200 });
}
