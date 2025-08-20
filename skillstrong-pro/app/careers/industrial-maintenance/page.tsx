// /app/careers/industrial-maintenance/page.tsx
import Link from 'next/link';
import { Bot, DollarSign, ListChecks, ShieldCheck } from 'lucide-react';

export default function IndustrialMaintenancePage() {
  return (
    <div className="bg-slate-50">
      <div className="container mx-auto max-w-4xl py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900"Career Pathway: Industrial Maintenance</h1
          <p className="mt-3 text-lg text-slate-600">Be the hero who keeps the machines running and production flowing.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">A Day in the Life</h2>
              <p className="text-slate-700">
                As an Industrial Maintenance Mechanic, you're the backbone of any manufacturing facility. No two days are the same. One moment you might be performing scheduled preventative maintenance on a conveyor system, and the next you're racing to diagnose and fix a critical machine that has unexpectedly stopped. Your work involves troubleshooting mechanical, electrical, hydraulic, and pneumatic systems. You'll read technical manuals, use diagnostic tools, and get hands-on with repairs, ensuring that the entire plant operates safely and efficiently with minimal downtime.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">Career Roadmap</h2>
              <div className="space-y-4">
                 <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div><div className="ml-4"><h3 className="font-semibold">Maintenance Apprentice</h3><p className="text-sm text-slate-600">Learn from experienced technicians and assist with routine tasks.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div><div className="ml-4"><h3 className="font-semibold">Industrial Maintenance Mechanic</h3><p className="text-sm text-slate-600">Independently perform preventative maintenance and complex repairs.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div><div className="ml-4"><h3 className="font-semibold">Maintenance Specialist (e.g., Electrical)</h3><p className="text-sm text-slate-600">Become an expert in a specific area like PLCs or hydraulic systems.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div><div className="ml-4"><h3 className="font-semibold">Maintenance Supervisor / Manager</h3><p className="text-sm text-slate-600">Lead the maintenance team and manage the facility's assets.</p></div></div>
              </div>
            </section>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ListChecks className="w-5 h-5 mr-2 text-blue-600"/>Skills Required</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Mechanical Systems</li><li>Electrical Troubleshooting</li><li>Hydraulics & Pneumatics</li><li>Welding & Fabrication</li><li>Critical Thinking</li></ul></div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><DollarSign className="w-5 h-5 mr-2 text-blue-600"/>Earning Potential</h3><p className="mt-2 text-slate-600 text-sm">Median Pay: **$62,280 per year**<br/>Top 10% Earn: **&gt$97,090 per year**</p><p className="text-xs text-slate-400 mt-2">(Source: U.S. BLS, Industrial Machinery Mechanics)</p></div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-blue-600"/>Top Certifications</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Certified Maintenance & Reliability Technician (CMRT)</li><li>Certified Maintenance & Reliability Professional (CMRP)</li></ul></div>
          </div>
        </div>
        <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold">Ready to Learn More?</h2>
            <Link href="/explore?prompt=Tell me more about Industrial Maintenance careers" className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">Chat with the AI Coach <Bot className="w-5 h-5 ml-2" /></Link>
        </div>
      </div>
    </div>
  );
}
