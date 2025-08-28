// /app/page.tsx — Apply requested copy changes, clickable career cards, unified dark background
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
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Subtle glow accents */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="pointer-events-none absolute top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="pointer-events-none absolute top-48 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative container mx-auto px-6 lg:px-8 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            High‑Tech Careers. No 4‑Year Debt.
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-slate-300">
            A vocational career in modern manufacturing is the way to go!
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

      {/* CONTEXT COPY + 3 BOXES */}
      <section className="border-t border-slate-800/50">
        <div className="container mx-auto px-6 lg:px-8 py-14">
          {/* Replace section heading/subheading with the requested paragraphs */}
          <div className="text-center mb-10">
            <p className="max-w-4xl mx-auto text-lg md:text-xl text-slate-300">
              It’s more about robotics, artificial intelligence, and precision automation — less about repetitive tasks, manual machinery operation or inventory handling.
            </p>
          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-slate-300">
              These careers are in high demand, pay well. And the best part — no four-year degree needed!
          </p>

         </div>

          {/* Three info boxes */}
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Compass className="h-8 w-8 text-cyan-400" />
              <h3 className="mt-3 text-lg font-semibold">Learn more about these jobs ?</h3>
              <p className="mt-2 text-slate-300">
                The skills you will need, the kinds of companies that will hire you, the salaries they offer.
              </p>
              <Link href="/quiz" className="mt-3 inline-flex items-center text-cyan-300 hover:text-cyan-200">
                Take our quiz! <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Bot className="h-8 w-8 text-cyan-400" />
              <h3 className="mt-3 text-lg font-semibold">Already know what skills you want?</h3>
              <p className="mt-2 text-slate-300">
                Chat with Coach Mach, our AI Coach, to learn about the programs that will help you get there.
              </p>
              <Link href="/explore?newChat=1" className="mt-3 inline-flex items-center text-cyan-300 hover:text-cyan-200">
                Chat with Coach Mach <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Briefcase className="h-8 w-8 text-cyan-400" />
              <h3 className="mt-3 text-lg font-semibold">Already have the skills?</h3>
              <p className="mt-2 text-slate-300">
                Get started right away – work with Coach Mach to find paid apprenticeships and job openings.
              </p>
              <Link href="/explore?newChat=1" className="mt-3 inline-flex items-center text-cyan-300 hover:text-cyan-200">
                Find apprenticeships & jobs <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CAREERS GRID — cards are fully clickable, no extra link */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Careers of the Future — Today</h2>
            <p className="mt-2 text-slate-400">From wrench to robotic grippers — manufacturing just leveled up.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Cpu, title: 'Robotics Technologist', blurb: 'Install, maintain, and repair robots that power modern industry.', href: '/careers/robotics-technician' },
              { icon: ScanSearch, title: 'CNC Machinist', blurb: 'Turn CAD/CAM into precision parts for aerospace, EVs, and med‑tech.', href: '/careers/cnc-machinist' },
              { icon: Printer, title: 'Additive Manufacturing', blurb: 'Build complex parts with industrial 3D printing.', href: '/careers/additive-manufacturing' },
              { icon: Flame, title: 'Welding Programmer', blurb: 'Run advanced welding — including robotic & laser systems.', href: '/careers/welder' },
              { icon: Wrench, title: 'Maintenance Tech', blurb: 'The fixer who keeps high‑tech facilities running.', href: '/careers/industrial-maintenance' },
              { icon: Handshake, title: 'Quality Control Specialist', blurb: 'Use precision tools & data to keep standards high.', href: '/careers/quality-control' },
            ].map(({ icon: Icon, title, blurb, href }) => (
              <Link key={title} href={href} className="group block rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm hover:shadow-md hover:bg-white/10 transition">
                <Icon className="h-10 w-10 text-cyan-400" />
                <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-2 text-slate-300">{blurb}</p>
                <span className="mt-4 inline-flex items-center text-cyan-300 group-hover:text-cyan-200">
                  View details <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SINGLE CTA BAND (kept minimal to avoid duplicate look) */}
      <section className="border-t border-slate-800/50">
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
