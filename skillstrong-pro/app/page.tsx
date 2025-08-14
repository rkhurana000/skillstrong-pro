// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import ChatLauncher from "./components/ChatLauncher";

export const metadata = {
  title: "SkillStrong — Future-Proof Careers",
  description:
    "Explore careers, training, and apprenticeships with a guided AI coach.",
};

export default function Home() {
  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* LEFT: title + cards */}
          <section>
            <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase">
              Manufacturing Careers
            </p>

            <h1 className="mt-3 text-5xl sm:text-6xl font-extrabold leading-tight text-slate-900">
              Build Your
              <br />
              Manufacturing
              <br />
              Career
            </h1>

            <p className="mt-4 text-slate-600 text-lg">
              Explore careers in manufacturing and learn how to get started.
            </p>

            {/* 3 cards */}
            <div className="mt-8 grid sm:grid-cols-2 gap-5">
              {/* Card 1 */}
              <Link
                href="/explore"
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm hover:shadow-md transition"
              >
                <div className="mt-1 h-8 w-8 rounded-xl bg-slate-100 grid place-items-center">
                  <span className="text-slate-700">⚙️</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    Job Opportunities
                  </div>
                  <div className="text-sm text-slate-600">
                    Discover different roles within manufacturing.
                  </div>
                </div>
              </Link>

              {/* Card 2 */}
              <Link
                href="/explore?tab=training"
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm hover:shadow-md transition"
              >
                <div className="mt-1 h-8 w-8 rounded-xl bg-slate-100 grid place-items-center">
                  <span className="text-slate-700">📚</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    Required Training
                  </div>
                  <div className="text-sm text-slate-600">
                    Find out what skills & certifications you need.
                  </div>
                </div>
              </Link>

              {/* Card 3 (full width) */}
              <Link
                href="/quiz"
                className="sm:col-span-2 flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm hover:shadow-md transition"
              >
                <div className="mt-1 h-8 w-8 rounded-xl bg-slate-100 grid place-items-center">
                  <span className="text-slate-700">✅</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    Take an Interest Quiz
                  </div>
                  <div className="text-sm text-slate-600">
                    Find your best match in manufacturing.
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* RIGHT: hero image */}
          <aside>
            <Image
              src="/hero.jpg"
              alt="Students exploring a manufacturing lab"
              width={1100}
              height={820}
              priority
              className="w-full h-auto rounded-3xl shadow-xl ring-1 ring-black/5"
            />
          </aside>
        </div>

        {/* Chat bar at the bottom of the page */}
        <div className="mt-10 lg:mt-12">
          <ChatLauncher placeholder="Ask me anything about manufacturing careers…" />
        </div>
      </div>
    </main>
  );
}
