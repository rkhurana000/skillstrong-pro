// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import ChatLauncher from "./components/ChatLauncher"; // if your file is at app/components/ChatLauncher.tsx

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* TOP: section label + heading + subheading (NOT in columns) */}
      <div className="mx-auto max-w-7xl px-6 pt-12">
        <p className="text-sm font-semibold tracking-wider text-slate-500 uppercase">
          Manufacturing Careers
        </p>

        <h1 className="mt-3 text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900">
          Build Your Manufacturing Career
        </h1>

        <p className="mt-6 text-lg text-slate-600 max-w-3xl">
          Explore careers in manufacturing and learn how to get started.
        </p>
      </div>

      {/* CONTENT: cards left, image right */}
      <div className="mx-auto max-w-7xl px-6 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: the three boxes */}
        <div className="lg:col-span-6 space-y-6">
          <Link
            href="/explore?tab=jobs"
            className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Job Opportunities</div>
            <div className="mt-1 text-slate-600">
              Discover different roles within manufacturing.
            </div>
          </Link>

          <Link
            href="/explore?tab=training"
            className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Required Training</div>
            <div className="mt-1 text-slate-600">
              Find out what skills & certifications you need.
            </div>
          </Link>

          <Link
            href="/quiz"
            className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Take an Interest Quiz</div>
            <div className="mt-1 text-slate-600">
              Find your best match in manufacturing.
            </div>
          </Link>
        </div>

        {/* Right: hero image */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-slate-100">
            <Image
              src="/hero.jpg"
              alt="Students exploring manufacturing lab"
              width={1400}
              height={1000}
              priority
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Bottom: chat bar */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <ChatLauncher />
      </div>
    </main>
  );
}
