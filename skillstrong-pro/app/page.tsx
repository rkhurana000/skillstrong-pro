import Link from "next/link";
import ChatLauncher from "./components/ChatLauncher";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      {/* Eyebrow */}
      <p className="text-sm font-semibold tracking-wide text-slate-500">
        MANUFACTURING CAREERS
      </p>

      {/* Title */}
      <h1 className="mt-2 text-6xl font-extrabold leading-tight text-slate-900 md:text-7xl">
        Build Your
        <br />
        Manufacturing
        <br />
        Career
      </h1>

      {/* Subhead */}
      <p className="mt-5 max-w-2xl text-lg text-slate-600">
        Explore careers in manufacturing and learn how to get started.
      </p>

      {/* Cards (left) + Image (right) */}
      <section className="mt-10 grid items-start gap-8 lg:grid-cols-2">
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
        <div className="relative">
          <img
            src="/hero.jpg"
            alt="Students in a manufacturing lab"
            className="w-full rounded-3xl shadow-2xl object-cover"
          />
        </div>
      </section>

      {/* Chat bar at the bottom */}
      <section className="mt-10">
        <ChatLauncher />
      </section>
    </main>
  );
}
