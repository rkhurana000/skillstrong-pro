// app/programs/page.tsx
import Link from "next/link";
import { headers } from "next/headers";

// ---------- Types ----------
type Delivery = "in-person" | "online" | "hybrid" | null;

type Program = {
  id: string;
  school: string;
  title?: string | null;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  delivery?: Delivery;
  url?: string | null;
  cip4?: string | null;           // e.g., "4805"
  cost?: number | null;
  length_weeks?: number | null;
};

// Friendly titles by common CIP families
const CIP_TITLES: Record<string, string> = {
  "4805": "Precision Metal Working (Welding & Machining)",
  "4803": "Machine Tool Technology (CNC)",
  "1504": "Robotics / Automation",
  "1506": "Industrial Maintenance",
  "1507": "Quality Control Technology / Technician",
};

const CIP_FALLBACK = "Manufacturing training program";

export const dynamic = "force-dynamic";

function makeBaseUrl() {
  // Build an absolute URL for server-to-server fetches
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

async function getPrograms(searchParams: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : (v ?? "")])
    )
  ).toString();

  const res = await fetch(
    `${makeBaseUrl()}/api/programs${search ? `?${search}` : ""}`,
    { cache: "no-store" }
  );

  if (!res.ok) return { programs: [] as Program[], error: await res.text() };
  return (await res.json()) as { programs: Program[] };
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { programs } = await getPrograms(searchParams);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Training Programs</h1>

      <div className="grid gap-4">
        {programs.map((p) => {
          const where = [p.city, p.state].filter(Boolean).join(", ");
          const modality = p.delivery ?? "in-person";
          const subject =
            (p.title && p.title.trim()) ||
            (p.cip4 && CIP_TITLES[p.cip4]) ||
            CIP_FALLBACK;

          const raw = p.description ?? "";
          const blurb =
            raw.replace(/\s+/g, " ").trim().slice(0, 240) +
            (raw.length > 240 ? "…" : "");

          return (
            <div key={p.id} className="rounded-xl border p-5 bg-white">
              {/* Title line: School • City, ST • modality */}
              <div className="text-2xl font-semibold">
                {p.school || "School"}
                {where && <span className="text-gray-500"> • {where}</span>}
                {modality && <span className="text-gray-500"> • {modality}</span>}
              </div>

              {/* Program offered + 2–3 line description */}
              <div className="mt-2 text-gray-700">
                <div className="font-medium">Program offered: {subject}</div>
                {blurb && <p className="mt-2">{blurb}</p>}

                <div className="mt-2 text-sm text-gray-500 space-x-4">
                  {typeof p.length_weeks === "number" && (
                    <span>Length: ~{p.length_weeks} weeks</span>
                  )}
                  {typeof p.cost === "number" && (
                    <span>Est. cost: ${p.cost.toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Program link */}
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
            </div>
          );
        })}

        {programs.length === 0 && (
          <div className="rounded-lg border p-6 bg-white text-gray-600">
            No programs found. Try adjusting filters or check back soon.
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3 pt-2">
        <Link
          href="/jobs"
          className="rounded-md border px-4 py-2 text-gray-800 hover:bg-gray-50"
        >
          View jobs & apprenticeships
        </Link>
        <Link
          href="/explore?newChat=1"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Ask Coach Mach
        </Link>
      </div>
    </div>
  );
}
