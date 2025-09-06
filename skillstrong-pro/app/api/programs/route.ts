// app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim();
  const metro = u.searchParams.get("metro")?.trim();
  const delivery = u.searchParams.get("delivery") as
    | "in-person"
    | "online"
    | "hybrid"
    | "all"
    | null;
  const lenMin = parseInt(u.searchParams.get("lengthMin") || "");
  const lenMax = parseInt(u.searchParams.get("lengthMax") || "");
  const costMax = parseInt(u.searchParams.get("costMax") || "");
  const requireUrl = u.searchParams.get("requireUrl") === "1";

  let query = supabaseAdmin.from("programs").select("*");

  if (requireUrl) query = query.not("url", "is", null);
  if (q) query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
  if (metro) query = query.or(`city.ilike.%${metro}%,state.ilike.%${metro}%`);
  if (delivery && delivery !== "all") query = query.eq("delivery", delivery);
  if (!Number.isNaN(lenMin)) query = query.gte("length_weeks", lenMin);
  if (!Number.isNaN(lenMax)) query = query.lte("length_weeks", lenMax);
  if (!Number.isNaN(costMax)) query = query.lte("cost", costMax);

  // Featured first, then name
  query = query.order("featured", { ascending: false }).order("school", { ascending: true });

  const { data, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ programs: data }, { status: 200 });
}
