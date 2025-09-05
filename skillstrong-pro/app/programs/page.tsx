// at top of the file (under imports)
type Delivery = 'in-person' | 'online' | 'hybrid' | null;

type Program = {
  id: string;
  school: string;
  title?: string | null;        // program title if we have it
  description?: string | null;
  city?: string | null;
  state?: string | null;
  delivery?: Delivery;
  url?: string | null;
  cip4?: string | null;         // e.g. "4805"
  cost?: number | null;
  lengthWeeks?: number | null;
};

// Optional: friendly titles for common CIP families we ingest
const CIP_TITLES: Record<string, string> = {
  '4805': 'Precision Metal Working (Welding & Machining)',
  '150702': 'Quality Control Technology/Technician', // QC Technician
  // add more as you seed other families
};

// ...where you fetch programs, assert the type to keep TS happy
// const programs = data as Program[];

// ----- render list -----
<div className="grid gap-4">
  {programs.map((p: Program) => {        // <-- annotate p
    const where = [p.city, p.state].filter(Boolean).join(', ');
    const modality = p.delivery || 'in-person';

    // Prefer real title; fall back to CIP-friendly label; last resort generic
    const offered =
      (p.title && p.title.trim()) ||
      (p.cip4 && CIP_TITLES[p.cip4]) ||
      'Manufacturing program';

    // Trim description to 2–3 lines (approx); keep null-safe
    const desc = (p.description || '').trim();
    const short =
      desc.length > 260 ? desc.slice(0, 257).replace(/\s+\S*$/, '') + '…' : desc;

    return (
      <article key={p.id} className="rounded-xl border bg-white p-5">
        {/* Title: school first */}
        <h3 className="text-xl font-semibold">
          {p.school}
          {where ? <span className="text-gray-500"> • {where}</span> : null}
          <span className="text-gray-500"> • {modality}</span>
        </h3>

        {/* Program offered (no raw CIP numbers to the student) */}
        <p className="mt-2 text-gray-700">
          <span className="font-medium">Program offered:</span> {offered}
        </p>

        {/* Short description */}
        {short && (
          <p className="mt-2 text-gray-600 leading-relaxed">{short}</p>
        )}

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
