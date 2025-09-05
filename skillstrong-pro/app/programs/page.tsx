import Link from "next/link";

// ---------- Types ----------
type Delivery = "in-person" | "online" | "hybrid" | null;

type Program = {
  id: string;
  school: string;
  title?: string | null;          // program title if available
  description?: string | null;
  city?: string | null;
  state?: string | null;
  delivery?: Delivery;
  url?: string | null;
  cip4?: string | null;           // e.g., "4805"
  cost?: number | null;
  length_weeks?: number | null;
};

// Friendly fallback titles by common CIP families you seed
const CIP_TITLES: Record<string, string> = {
  "4805": "Precision Metal Working (Welding & Machining)",
  "4803": "Machine Tool Technology (CNC)",
  "1504": "Robotics / Automation",
  "1506": "Industrial Maintenance",
  "1507": "Quality Control Technology / Technician",
};

async function getPrograms(): Promise<Program[]> {
  // Require a URL so every card has a “Program page” link.
  // Use a relative URL; Next.js will resolve it at request time.
  const res = await fetch(`/api/programs?requireUrl=1`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.programs || []) as Program[];
}

export default async function ProgramsPage() {
  const programs = await getPrograms();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Training Programs</h1>
        <p className="text-gray-600 mt-1">
          Find hands-on manufacturing training near you — certificates, AAS, bootcamps, and apprenticeships.
        </p>
      </header>

      {programs.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No programs found yet. Try again later.
        </div>
      ) : (
        <div className="grid gap-4">
          {programs.map((p: Program) => {
            const where = [p.city, p.state].filter(Boolean).join(", ");
            const modality = p.delivery || "in-person";

            // Prefer real program title; fall back to CIP family name; then a generic label
            const offered =
              (p.title && p.title.trim()) ||
              (p.cip4 && CIP_TITLES[p.cip4]) ||
              "Manufacturing program";

            const raw = (p.description || "").replace(/\s+/g, " ").trim();
            const short =
              raw.length > 260 ? raw.slice(0, 257).replace(/\s+\S*$/, "") + "…" : raw;

            return (
              <article key={p.id} className="rounded-xl border bg-white p-5 shadow-sm">
                {/* Title: college name */}
                <h3 className="text-xl font-semibold">
                  {p.school}
                  {where ? <span className="text-gray-500"> • {where}</span> : null}
                  <span className="text-gray-500"> • {modality}</span>
                </h3>

                {/* Program offered (student-friendly, no raw CIP numbers) */}
                <p className="mt-2 text-gray-800">
                  <span className="font-medium">Program offered:</span> {offered}
                </p>

                {/* Short description (2–3 lines) */}
                {short && <p className="mt-2 text-gray-600 leading-relaxed">{short}</p>}

                {/* CTA */}
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Program page
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Optional: quick links back to jobs or chat */}
      <div className="mt-8 flex gap-3">
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
