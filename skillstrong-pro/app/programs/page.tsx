// app/programs/page.tsx
import Link from "next/link";
import { headers } from "next/headers";

type Delivery = "in-person" | "online" | "hybrid" | null;

type Program = {
  id: string;
  school: string;
  title?: string | null;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  metro?: string | null;           // include if you have it; harmless if null
  delivery?: Delivery;
  url?: string | null;
  cip4?: string | null;            // e.g. "4805"
  cost?: number | null;
  length_weeks?: number | null;
};

// Friendly titles & short blurbs for common CIP families
const CIP_TITLES: Record<string, string> = {
  "4805": "Precision Metal Working (Welding & Machining)",
  "4803": "Machine Tool Technology (CNC)",
  "1504": "Robotics / Automation",
  "1506": "Industrial Maintenance",
  "1507": "Quality Control Technology / Technician",
};
const CIP_DESCRIPTIONS: Record<string, string> = {
  "4805":
    "Hands-on metal fabrication: cutting, forming, and welding. Learn shop safety, print reading, and setup for multi-process welds & machining.",
  "4803":
    "CNC setup & operation: read prints, CAM/G-code basics, tool selection, work offsets, and quality checks for precision parts.",
  "1504":
    "Robotics/automation fundamentals: PLCs, sensors, motion systems, safety, and troubleshooting automated cells.",
  "1506":
    "Keep factories running: mechanical, electrical, hydraulics, pneumatics, and PLC troubleshooting with preventive maintenance.",
  "1507":
    "Inspect & verify quality: GD&T, metrology, SPC/QA methods, and tools such as CMMs, micrometers, calipers, and gauges.",
};

const CIP_FALLBACK = "Manufacturing training program";

export const dynamic = "force-dynamic";

function baseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

async function fetchPrograms(sp: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  // persist known filters (all are optional)
  const keep = ["q", "metro", "delivery", "lengthMin", "lengthMax", "costMax"] as const;
  for (const key of keep) {
    const v = sp[key];
    if (typeof v === "string" && v.trim()) params.set(key, v.trim());
  }

  // only show programs that have a link
  params.set("requireUrl", "1");

  const res = await fetch(`${baseUrl()}/api/programs?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) return { programs: [] as Program[] };

  return (await res.json()) as { programs: Program[] };
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { programs } = await fetchPrograms(searchParams);

  const q = (searchParams.q as string) ?? "";
  const metro = (searchParams.metro as string) ?? "";
  const delivery = ((searchParams.delivery as string) ?? "all") as
    | "all"
    | "in-person"
    | "online"
    | "hybrid";
  const lengthMin = (searchParams.lengthMin as string) ?? "";
  const lengthMax = (searchParams.lengthMax as string) ?? "";
  const costMax = (searchParams.costMax as string) ?? "";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Training Programs</h1>

      {/* --- Search & filters (server-side with GET) --- */}
      <form method="GET" className="grid gap-3 md:grid-cols-6 bg-white border rounded-xl p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search program or school"
          className="md:col-span-2 border rounded-md px-3 py-2"
        />
        <input
          name="metro"
          defaultValue={metro}
          placeholder="Metro (e.g., Columbus, OH)"
          className="border rounded-md px-3 py-2"
        />
        <select
          name="delivery"
          defaultValue={delivery}
          className="border rounded-md px-3 py-2"
          aria-label="Delivery"
        >
          <option value="all">Delivery (all)</option>
          <option value="in-person">In-person</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <input
          name="lengthMin"
          defaultValue={lengthMin}
          inputMode="numeric"
          placeholder="Min weeks"
          className="border rounded-md px-3 py-2"
        />
        <input
          name="lengthMax"
          defaultValue={lengthMax}
          inputMode="numeric"
          placeholder="Max weeks"
          className="border rounded-md px-3 py-2"
        />
        <input
          name="costMax"
          defaultValue={costMax}
          inputMode="numeric"
          placeholder="Max cost"
          className="border rounded-md px-3 py-2 md:col-span-1"
        />
        <div className="md:col-span-6 flex items-center gap-2">
          <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            Search
          </button>
          <Link
            href="/programs"
            className="px-4 py-2 rounded-md border hover:bg-gray-50"
          >
            Clear
          </Link>
          <span className="ml-auto text-sm text-gray-500">
            {programs.length.toLocaleString()} result{programs.length === 1 ? "" : "s"}
          </span>
        </div>
      </form>

      {/* --- Results --- */}
      <div className="grid gap-4">
        {programs.map((p) => {
          const where = [p.city, p.state].filter(Boolean).join(", ");
          const modality = p.delivery ?? "in-person";
          const subject =
            (p.title && p.title.trim()) || (p.cip4 && CIP_TITLES[p.cip4]) || CIP_FALLBACK;

          // Prefer a human description; fall back to a CIP blurb
          const raw = (p.description ?? "").replace(/\s+/g, " ").trim();
          const fallback = (p.cip4 && CIP_DESCRIPTIONS[p.cip4]) || "";
          const blurbSrc = raw || fallback;
          const blurb =
            blurbSrc.slice(0, 220) + (blurbSrc.length > 220 ? "…" : "");

          return (
            <article key={p.id} className="rounded-xl border p-5 bg-white">
              {/* Headline: School */}
              <h2 className="text-xl font-semibold">{p.school || "School"}</h2>

              {/* Line 2: City, ST • delivery • metro (if present) */}
              <div className="mt-1 text-gray-600 text-sm">
                {where && <span>{where}</span>}
                {where && modality && <span> • </span>}
                {modality && <span>{modality}</span>}
                {p.metro && (
                  <>
                    {(where || modality) && <span> • </span>}
                    <span>{p.metro}</span>
                  </>
                )}
              </div>

              {/* Program name & blurb */}
              <div className="mt-3 text-gray-800">
                <div className="font-medium">Program: {subject}</div>
                {blurb && <p className="mt-1 text-gray-700">{blurb}</p>}

                <div className="mt-2 text-sm text-gray-500 space-x-4">
                  {typeof p.length_weeks === "number" && (
                    <span>Length: ~{p.length_weeks} weeks</span>
                  )}
                  {typeof p.cost === "number" && (
                    <span>Est. cost: ${p.cost.toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Program website (hidden if missing; we already filtered server-side) */}
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Program page
                </a>
              )}
            </article>
          );
        })}

        {programs.length === 0 && (
          <div className="rounded-lg border p-6 bg-white text-gray-600">
            No programs matched your filters. Try clearing the search or expanding the range.
          </div>
        )}
      </div>
    </div>
  );
}
