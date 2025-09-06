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

async function getPrograms(search: string) {
  const res = await fetch(`/api/programs${search ? `?${search}` : ''}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    // keep the page alive with an empty list; show nothing fatal
    return { programs: [] as Program[], error: await res.text() };
  }
  return (await res.json()) as { programs: Program[] };
}

export default async function ProgramsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const search = new URLSearchParams(searchParams as any).toString();
  const { programs } = await getPrograms(search);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Training Programs</h1>

      <div className="grid gap-4">
        {programs.map((p: Program) => {
          const where = [p.city, p.state].filter(Boolean).join(', ');
          const modality = p.delivery || 'in-person';
          const subject =
            (p.cip4 && CIP_NAMES[p.cip4]) ||
            p.title ||
            'Manufacturing training program';

          // short, student-friendly snippet (2–3 lines)
          const blurb =
            (p.description || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 240) + (p.description && p.description.length > 240 ? '…' : '');

          return (
            <div key={p.id} className="rounded-xl border p-5 bg-white">
              <div className="text-2xl font-semibold">
                {p.school || 'Unnamed school'}{' '}
                {where ? <span className="text-gray-500">• {where}</span> : null}{' '}
                {modality ? <span className="text-gray-500">• {modality}</span> : null}
              </div>

              <div className="mt-2 text-gray-700">
                <div className="font-medium">Program offered: {subject}</div>
                {blurb ? <p className="mt-2">{blurb}</p> : null}
              </div>

              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Program page
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>


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
