// /app/page.tsx — Hybrid: classic hero from your old layout + our neon dark theme
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Cpu,
  Printer,
  Flame,
  Wrench,
  ScanSearch,
  Handshake,
  Briefcase,
  Compass,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* HERO — classic structure, modern styling */}
      <section className="relative overflow-hidden">
        {/* Glow blobs to keep the new color vibe */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="pointer-events-none absolute top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="pointer-events-none absolute top-48 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative container mx-auto px-6 lg:px-8 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Build What\'s Next.</h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-slate-300">
            Don\'t just get a job. Start a high‑demand, high‑tech career in modern manufacturing—no four‑year degree required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/explore" className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg hover:bg-blue-700">
              Explore Careers <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/quiz" className="inline-flex items-center rounded-xl bg-white/10 px-5 py-3 font-semibold text-white border border-white/15 hover:bg-white/15 backdrop-blur">
              Take the Interest Quiz
            </Link>
          </div>
        </div>
      </section>

      {/* 3‑STEP JOURNEY — mirrors old page but keeps dark theme */}
      <section className="bg-slate-900/40 border-t border-white/10">
        <div className="container mx-auto px-6 lg:px-8 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Your Career Journey in 3 Steps</h2>
          <p className="mt-2 text-slate-300">Discover, explore, and launch your future.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3 text-left">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Compass className="h-8 w-8 text-cyan-400" />
              <h3 className="mt-3 text-lg font-semibold">1. Discover Your Fit</h3>
              <p className="mt-1 text-slate-300">Take a 2‑minute quiz to match your interests with high‑demand skilled careers.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Bot className="h-8 w-8 text-cyan-400" />
              <h3 className="mt-3 text-lg font-semibold">2. Explore Your Options</h3>
              <p className="mt-1 text-slate-300">Chat with our AI Coach to learn about skills, salaries, and local programs.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Briefcase className="h-8 w-8 text-cyan-400" />
              <h3 className="mt-3 text-lg font-semibold">3. Launch Your Career</h3>
              <p className="mt-1 text-slate-300">Find paid apprenticeships and job openings to start right away.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CAREERS GRID */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Careers of the Future — Today</h2>
            <p className="mt-2 text-slate-400">From wrench to robotic grippers — manufacturing just leveled up.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Cpu, title: 'Robotics Technologist', blurb: 'Install, maintain, and repair robots that power modern industry.' },
              { icon: ScanSearch, title: 'CNC Machinist', blurb: 'Turn CAD/CAM into precision parts for aerospace, EVs, and med‑tech.' },
              { icon: Printer, title: 'Additive Manufacturing', blurb: 'Build complex parts with industrial 3D printing.' },
              { icon: Flame, title: 'Welding Programmer', blurb: 'Run advanced welding — including robotic & laser systems.' },
              { icon: Wrench, title: 'Maintenance Tech', blurb: 'The fixer who keeps high‑tech facilities running.' },
              { icon: Handshake, title: 'Quality Control Specialist', blurb: 'Use precision tools & data to keep standards high.' },
            ].map(({ icon: Icon, title, blurb }) => (
              <div key={title} className="group rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm hover:shadow transition">
                <Icon className="h-10 w-10 text-cyan-400" />
                <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-2 text-slate-300">{blurb}</p>
                <Link href="/explore" className="mt-4 inline-flex items-center text-cyan-300 hover:text-cyan-200">
                  Ask Coach Mach about this <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SINGLE CTA BAND — keep only once to avoid duplication */}
      <section className="border-t border-white/10 bg-slate-900/40">
        <div className="container mx-auto px-6 lg:px-8 py-14 text-center">
          <h3 className="text-2xl font-bold">Ready to get started?</h3>
          <p className="mt-2 text-slate-300">Pick your path: explore careers or take the interest quiz.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/explore" className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              Explore Careers
            </Link>
            <Link href="/quiz" className="inline-flex items-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 border hover:bg-slate-100">
              Take the Interest Quiz
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
