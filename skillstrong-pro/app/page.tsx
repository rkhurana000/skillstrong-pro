// /app/page.tsx — Gen Z refresh: bold gradient hero, punchy microcopy, chips, modern cards
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Sparkles,
  Cpu,
  Printer,
  Flame,
  Wrench,
  ScanSearch,
  Handshake,
  BadgeDollarSign,
  School,
  Stars,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle light blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="pointer-events-none absolute top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="pointer-events-none absolute top-48 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative container mx-auto px-6 lg:px-8 py-20 md:py-28 text-center">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur">
            <Stars className="h-4 w-4" /> Future‑Ready Careers
          </p>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">
              High‑Tech Careers. No 4‑Year Debt.
            </span>
          </h1>
          <p className="mt-5 max-w-3xl mx-auto text-lg md:text-xl text-slate-300">
            Modern manufacturing = robotics, AI, and precision automation — not boring, repetitive work. Break in fast, level up fast, get paid.
          </p>

          {/* Value props */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
            <span className="rounded-full bg-white/5 px-3 py-1 text-slate-200 border border-white/10">No 4‑year degree required</span>
            <span className="rounded-full bg-white/5 px-3 py-1 text-slate-200 border border-white/10">
              <BadgeDollarSign className="inline h-4 w-4 -mt-0.5 mr-1" /> $55k–$90k+ pathways
            </span>
            <span className="rounded-full bg-white/5 px-3 py-1 text-slate-200 border border-white/10">Paid apprenticeships</span>
            <span className="rounded-full bg-white/5 px-3 py-1 text-slate-200 border border-white/10">Hands‑on skills → real jobs</span>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/quiz" className="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 font-semibold text-white shadow-lg hover:opacity-95 active:scale-[.99]">
              Take the Interest Quiz <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/explore?newChat=1" className="inline-flex items-center rounded-xl bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15 border border-white/15 backdrop-blur">
              Chat with Coach Mach <Bot className="w-5 h-5 ml-2" />
            </Link>
          </div>

          {/* Helper copy */}
          <p className="mt-6 max-w-3xl mx-auto text-base md:text-lg text-slate-300">
            Learn what skills you need, who’s hiring, and what they pay. Already know your direction? Chat with Coach Mach to pick the right program — or jump straight to apprenticeships and jobs.
          </p>

          {/* Quick topic chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
            {[
              { label: 'CNC Machinist', href: '/careers/cnc-machinist' },
              { label: 'Robotics Tech', href: '/careers/robotics-technician' },
              { label: 'Welding Programmer', href: '/careers/welder' },
              { label: 'Additive (3D Print)', href: '/careers/additive-manufacturing' },
            ].map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-slate-200 hover:bg-white/10"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Careers grid */}
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
                <Link href="/explore?newChat=1" className="mt-4 inline-flex items-center text-cyan-300 hover:text-cyan-200">
                  Ask Coach Mach about this <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/quiz" className="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 font-semibold text-white shadow hover:opacity-95">
              Take the Interest Quiz <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/explore?newChat=1" className="inline-flex items-center rounded-xl bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15 border border-white/15">
              Chat with Coach Mach <Bot className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Proof points / Why this works */}
      <section className="border-t border-white/10 bg-slate-900/40">
        <div className="container mx-auto px-6 lg:px-8 py-14 text-center">
          <h3 className="text-2xl font-bold">Ready to get started?</h3>
          <p className="mt-2 text-slate-300">Two ways in: take the quiz or jump straight into a convo with Coach Mach.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/quiz" className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              Start the Quiz
            </Link>
            <Link href="/explore?newChat=1" className="inline-flex items-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 border hover:bg-slate-100">
              Chat with Coach Mach
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-300">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><School className="inline h-4 w-4 mr-1" /> Community‑college friendly</div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><Sparkles className="inline h-4 w-4 mr-1" /> Skills → Portfolio → Job</div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><BadgeDollarSign className="inline h-4 w-4 mr-1" /> Earn while you learn</div>
          </div>
        </div>
      </section>
    </div>
  );
}
