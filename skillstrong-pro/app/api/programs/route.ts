// /app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Define the cities that constitute the Bay Area
const BAY_AREA_CITIES = [
    'San Francisco', 'Oakland', 'Berkeley', 'Richmond', 'San Leandro', 'Hayward', 
    'Fremont', 'Union City', 'San Jose', 'Santa Clara', 'Sunnyvale', 'Mountain View',
    'Palo Alto', 'Redwood City', 'Menlo Park', 'San Mateo', 'Daly City',
    'South San Francisco', 'San Bruno', 'Millbrae', 'Burlingame', 'Cupertino',
    'Milpitas', 'Campbell', 'Los Gatos', 'Morgan Hill', 'Gilroy', 'Newark',
    'Pleasanton', 'Dublin', 'Livermore', 'Walnut Creek', 'Concord', 'Antioch',
    'Pittsburg', 'Martinez', 'San Rafael', 'Novato', 'Petaluma', 'Santa Rosa',
    'Vallejo', 'Fairfield', 'Vacaville', 'Napa', 'San Carlos', 'Belmont',
    'Foster City', 'San Pablo', 'El Cerrito', 'Alameda',
];

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

  if (requireUrl) {
    query = query.not("url", "is", null);
  }
  if (q) {
    query = query.or(`school.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  // ** THIS IS THE NEW LOGIC **
  if (metro) {
    if (metro.toLowerCase() === 'bay area, ca') {
        // If the filter is "Bay Area", search for any of the defined cities
        const cityFilters = BAY_AREA_CITIES.map(city => `location.ilike.%${city}%`).join(',');
        query = query.or(cityFilters);
    } else {
        // For any other metro, search normally
        query = query.ilike('location', `%${metro}%`);
    }
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
