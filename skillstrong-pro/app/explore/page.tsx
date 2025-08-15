// app/explore/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Manufacturing Career Explorer",
};

export default function ExplorePage() {
  return (
    <main className="page-shell explore-page">
      <h1 className="text-sm font-semibold tracking-[.20em] text-slate-600">
        MANUFACTURING CAREER EXPLORER
      </h1>

      <h2 className="mt-4 text-5xl md:text-6xl font-extrabold leading-tight text-slate-900">
        Build Your <br className="hidden md:block" />
        Manufacturing Career
      </h2>

      <p className="lead mt-3 text-lg">
        Explore careers in manufacturing and learn how to get started.
      </p>

      <section className="page-card mt-6 p-6 md:p-8">
        <h3 className="text-xl font-semibold text-slate-900">
          Welcome! How would you like to explore?
        </h3>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/explore?by=job-types"
            className="inline-flex items-center rounded-full bg-slate-50 px-4 py-2 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
          >
            Explore by job types
          </Link>
          <Link
            href="/explore?by=salary"
            className="inline-flex items-center rounded-full bg-slate-50 px-4 py-2 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
          >
            Explore by salary range
          </Link>
          <Link
            href="/explore?by=training"
            className="inline-flex items-center rounded-full bg-slate-50 px-4 py-2 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
          >
            Explore by training length
          </Link>
        </div>

        <div className="mt-6">
          <h4 className="text-slate-900 font-semibold">Salary explorer</h4>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/explore?salary=max-40k"
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              &lt;$40k
            </Link>
            <Link
              href="/explore?salary=40-60k"
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              $40–60k
            </Link>
            <Link
              href="/explore?salary=60-80k"
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              $60–80k+
            </Link>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            ZIP for nearby results (set it in your Account)
          </p>
        </div>
      </section>
    </main>
  );
}
