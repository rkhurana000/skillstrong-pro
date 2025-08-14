{/* Cards (left) + Image (right) */}
<section className="mt-10 grid gap-8 lg:grid-cols-2 items-start">
  {/* LEFT: stacked cards */}
  <div className="space-y-5">
    <Link
      href="/explore"
      className="no-underline block rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.06)] transition-shadow hover:shadow-[0_14px_38px_rgba(15,23,42,.10)]"
    >
      <div className="text-2xl">🔧</div>
      <div className="mt-3 text-lg font-semibold text-slate-900">
        Job Opportunities
      </div>
      <div className="mt-1 text-slate-600">
        Discover different roles within manufacturing.
      </div>
    </Link>

    <Link
      href="/explore"
      className="no-underline block rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.06)] transition-shadow hover:shadow-[0_14px_38px_rgba(15,23,42,.10)]"
    >
      <div className="text-2xl">📘</div>
      <div className="mt-3 text-lg font-semibold text-slate-900">
        Required Training
      </div>
      <div className="mt-1 text-slate-600">
        Find out what skills & certifications you need.
      </div>
    </Link>

    <Link
      href="/quiz"
      className="no-underline block rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.06)] transition-shadow hover:shadow-[0_14px_38px_rgba(15,23,42,.10)]"
    >
      <div className="text-2xl">✅</div>
      <div className="mt-3 text-lg font-semibold text-slate-900">
        Take an Interest Quiz
      </div>
      <div className="mt-1 text-slate-600">
        Find your best match in manufacturing.
      </div>
    </Link>
  </div>

  {/* RIGHT: image */}
  <div>
    <img
      src="/hero.jpg"
      alt="Students in a manufacturing lab"
      className="w-full rounded-3xl shadow-2xl"
    />
  </div>
</section>
