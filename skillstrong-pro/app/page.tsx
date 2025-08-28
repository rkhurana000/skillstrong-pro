// /app/page.tsx (updated homepage copy and CTAs; Chat with Coach Mach opens a new chat in Explore)
import Link from 'next/link';
import { ArrowRight, Bot, Cpu, Printer, Flame, Wrench, ScanSearch, Handshake, Briefcase } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="bg-white text-slate-800">
      {/* Hero */}
      <section className="relative bg-slate-900 text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        </div>
        <div className="relative container mx-auto px-6 lg:px-8 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Want a High‑Tech Career That Pays — Without the 4‑Year College Price Tag?
          </h1>
          <p className="mt-5 max-w-3xl mx-auto text-lg md:text-xl text-slate-200">
            A vocational career in modern manufacturing is the way to go! It’s more about robotics, artificial intelligence,
            and precision automation — less about repetitive tasks, manual machinery operation, or inventory handling.
          </p>
          <p className="mt-3 max-w-3xl mx-auto text-base md:text-lg text-slate-300">
            These careers are in <strong>high demand</strong>, pay <strong>well</strong>. And the best part —
            <strong> no four‑year degree needed!</strong>
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/quiz" className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
              Take the Interest Quiz <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/explore?newChat=1" className="inline-flex items-center rounded-lg bg-white/10 backdrop-blur px-5 py-3 font-semibold text-white hover:bg-white/20 border border-white/20 transition-transform hover:scale-105">
              Chat with Coach Mach <Bot className="w-5 h-5 ml-2" />
            </Link>
          </div>

          <p className="mt-6 max-w-3xl mx-auto text-base md:text-lg text-slate-300">
            Learn more about these jobs — the skills you’ll need, the kinds of companies that will hire you, and the salaries they offer.
          </p>

          <div className="mt-3 text-slate-300">
            Already know what skills you want? <span className="font-semibold">Chat with Coach Mach</span> to learn about programs that will help you get there.
          </div>
          <div className="mt-1 text-slate-300">
            Already have the skills? Get started right away — work with Coach Mach to find paid apprenticeships and job openings.
          </div>
        </div>
      </section>

      {/* Careers of the Future */}
      <section className="py-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Careers of the Future — Today</h2>
            <p className="mt-2 text-slate-600">From wrench to robotic grippers — manufacturing just leveled up. Work with cutting‑edge technology.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 bg-white rounded-xl shadow border">
              <Cpu className="w-10 h-10 text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold">Robotics Technologist</h3>
              <p className="mt-2 text-slate-600">Install, maintain, and repair the robotic systems that power modern industry.</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow border">
              <ScanSearch className="w-10 h-10 text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold">CNC Machinist</h3>
              <p className="mt-2 text-slate-600">Turn digital blueprints into precision parts for everything from aerospace to medical devices.</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow border">
              <Printer className="w-10 h-10 text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold">Additive Manufacturing</h3>
              <p className="mt-2 text-slate-600">Use industrial 3D printers to create complex components and innovative prototypes.</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow border">
              <Flame className="w-10 h-10 text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold">Welding Programmer</h3>
              <p className="mt-2 text-slate-600">Fuse metals using advanced techniques, including robotic and laser welding systems.</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow border">
              <Wrench className="w-10 h-10 text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold">Maintenance Tech</h3>
              <p className="mt-2 text-slate-600">Be the problem‑solver who keeps the high‑tech machinery of a facility running smoothly.</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow border">
              <Handshake className="w-10 h-10 text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold">Quality Control Specialist</h3>
              <p className="mt-2 text-slate-600">Use precision instruments and technology to ensure products meet the highest standards.</p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/quiz" className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow hover:bg-blue-700">
              Take the Interest Quiz <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/explore?newChat=1" className="inline-flex items-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-black">
              Chat with Coach Mach <Bot className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* (Optional) Quick CTA band */}
      <section className="py-12 bg-slate-50 border-t">
        <div className="container mx-auto px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-semibold">Ready to get started?</h3>
          <p className="mt-2 text-slate-600">Two ways in: take the quiz or jump straight into a conversation with Coach Mach.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/quiz" className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              Start the Quiz
            </Link>
            <Link href="/explore?newChat=1" className="inline-flex items-center rounded-lg bg-white px-5 py-3 font-semibold text-slate-900 border hover:bg-slate-100">
              Chat with Coach Mach
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
