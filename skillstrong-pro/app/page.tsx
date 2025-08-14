// app/page.tsx
import Link from "next/link";
import ChatLauncher from "./components/ChatLauncher";

export const metadata = {
  title: "SkillStrong — Future-Proof Careers",
  description:
    "Explore careers, training, and apprenticeships with a guided AI coach.",
};

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      {/* HERO: full-width title */}
      <section className="space-y-6">
        <p className="text-sm font-semibold tracking-widest text-slate-500">
          MANUFACTURING CAREERS
        </p>

        <h1 className="text-slate-900 font-extrabold leading-[0.9] text-5xl md:text-7xl lg:text-8xl">
          Build Your
          <br className="hidden md:block" />
          Manufacturing
          <br className="hidden md:block" />
          Career
        </h1>

        <p className="max-w-3xl text-lg text-slate-600">
          Explore careers in manufacturing and learn how to get started.
        </p>
      </section>

      {/* Feature cards */}
      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/explore"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.06)] transition-shadow hover:shadow-[0_14px_38px_rgba(15,23,42,.10)]"
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
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.06)] transition-shadow hover:shadow-[0_14px_38px_rgba(15,23,42,.10)]"
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
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.06)] transition-shadow hover:shadow-[0_14px_38px_rgba(15,23,42,.10)]"
        >
          <div className="text-2xl">✅</div>
          <div className="mt-3 text-lg font-semibold text-slate-900">
            Take an Interest Quiz
          </div>
          <div className="mt-1 text-slate-600">
            Find your best match in manufacturing.
          </div>
        </Link>
      </section>

      {/* Image goes UNDER the hero + cards so the title can span the page */}
      <section className="mt-12">
        <img
          src="/hero.jpg"
          alt="Students in a manufacturing lab"
          className="w-full rounded-3xl shadow-2xl"
        />
      </section>

      {/* Chat launcher at the bottom */}
      <section className="mt-10">
        <ChatLauncher />
      </section>
    </main>
  );
}
