// /app/api/programs/metros/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { cseSearchMany } from "@/lib/cse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METROS: Array<{ city: string; state: string }> = [
  { city: "Atlanta", state: "GA" }, { city: "Austin", state: "TX" },
  { city: "Boston", state: "MA" },  { city: "Charlotte", state: "NC" },
  { city: "Chicago", state: "IL" }, { city: "Cincinnati", state: "OH" },
  { city: "Cleveland", state: "OH" },{ city: "Columbus", state: "OH" },
  { city: "Dallas", state: "TX" },  { city: "Denver", state: "CO" },
  { city: "Detroit", state: "MI" }, { city: "Houston", state: "TX" },
  { city: "Indianapolis", state: "IN" }, { city: "Jacksonville", state: "FL" },
  { city: "Kansas City", state: "MO" }, { city: "Las Vegas", state: "NV" },
  { city: "Los Angeles", state: "CA" }, { city: "Miami", state: "FL" },
  { city: "Milwaukee", state: "WI" }, { city: "Minneapolis", state: "MN" },
  { city: "Nashville", state: "TN" }, { city: "New York", state: "NY" },
  { city: "Orlando", state: "FL" }, { city: "Philadelphia", state: "PA" },
  { city: "Phoenix", state: "AZ" }, { city: "Pittsburgh", state: "PA" },
  { city: "Portland", state: "OR" }, { city: "Raleigh", state: "NC" },
  { city: "Salt Lake City", state: "UT" }, { city: "San Antonio", state: "TX" },
  { city: "San Diego", state: "CA" }, { city: "San Jose", state: "CA" },
  { city: "San Francisco", state: "CA" }, { city: "Los Angeles", state: "CA" },
  { city: "Seattle", state: "WA" }, { city: "St. Louis", state: "MO" },
  { city: "Tampa", state: "FL" }, { city: "Washington", state: "DC" },
];

const PROGRAMS: Array<{ label: string; keywords: string[] }> = [
  {
    label: "Precision Metal Working (Welding & Machining) — Certificate",
    keywords: ["welding", "CNC", "machining", "tool & die", "fabricator"],
  },
  {
    label: "Electromechanical & Robotics Technology — Certificate",
    keywords: ["mechatronics", "robotics", "electromechanical", "automation"],
  },
  {
    label: "Industrial Maintenance Technology — Certificate",
    keywords: ["industrial maintenance", "maintenance tech", "machinery repair"],
  },
  {
    label: "Additive & Manufacturing Technology — Certificate",
    keywords: ["additive manufacturing", "3d printing", "manufacturing tech"],
  },
  {
    label: "Quality Control & Inspection — Certificate",
    keywords: ["quality control", "quality assurance", "inspection", "inspector"],
  }
];

function score(item: { link: string; displayLink?: string; title: string }) {
  const url = item.link.toLowerCase();
  const host = (item.displayLink || "").toLowerCase();
  let pts = 0;
  if (host.endsWith(".edu")) pts += 3;
  if (url.includes("/program") || url.includes("/academic") || url.includes("/career")) pts += 2;
  if (url.includes("certificate") || url.includes("aas")) pts += 1;
  if (url.endsWith(".pdf")) pts -= 2;
  return pts;
}

function extractSchoolFromTitle(title: string, displayLink?: string): string {
    const commonJunk = new Set(['programs', 'academics', 'college', 'university', 'courses', 'admission', 'certificate']);
    const parts = title.split(/ - | \| /).map(s => s.trim());
    
    let bestPart = parts[parts.length - 1] || '';
    let longestLength = 0;

    for (const part of parts) {
        const partLower = part.toLowerCase();
        if (!commonJunk.has(partLower) && part.length > longestLength) {
            bestPart = part;
            longestLength = part.length;
        }
    }

    if (/\b(program|academic|course|certificate)\b/i.test(bestPart)) {
        if (displayLink) {
            const host = displayLink.replace(/^www\./, "");
            const core = host.split('.')[0];
            return core.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        }
    }

    return bestPart.slice(0, 80);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batch: number = Math.min(body.batch ?? 5, METROS.length);
    const start: number = Math.max(0, body.start ?? 0);

    let created = 0;
    const work = METROS.slice(start, start + batch);

    for (const metro of work) {
      for (const prog of PROGRAMS) {
        const queries = [
          `site:.edu ${metro.city} ${metro.state} ${prog.keywords[0]} program certificate`,
          `${metro.city} ${prog.keywords.join(" ")} certificate program`,
        ];
        const items = await cseSearchMany(queries, 4);
        if (!items.length) continue;

        items.sort((a, b) => score(b) - score(a));
        const top = items[0];
        if (!top?.link) continue;

        const school = extractSchoolFromTitle(top.title, top.displayLink);
        const description = (top.snippet || "").trim().slice(0, 220);

        const { error } = await supabaseAdmin.from("programs").insert({
          school,
          title: prog.label,
          location: `${metro.city}, ${metro.state}`,
          delivery: "in-person",
          description: description || `${prog.label} at ${school}.`,
          url: top.link,
        });

        if (!error) created++;
        await new Promise(r => setTimeout(r, 400));
      }
    }

    return NextResponse.json({ ok: true, created, window: { start, batch } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "metro ingest failed" }, { status: 500 });
  }
}
