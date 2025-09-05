// /app/api/maintenance/programs/clear/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DANGER: deletes all rows in "programs".
 * Run once, then remove/disable this route.
 * Optionally require ?secret=... via env ADMIN_CLEAR_SECRET.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const need = process.env.ADMIN_CLEAR_SECRET;
  if (need && url.searchParams.get("secret") !== need) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from("programs").delete().neq("id", 0);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
