// /app/careers/quality-control/page.tsx
import Link from 'next/link';
import { Bot, DollarSign, ListChecks, ShieldCheck } from 'lucide-react';

export default function QualityControlPage() {
  return (
    <div className="bg-slate-50">
      <div className="container mx-auto max-w-4xl py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Career Pathway: Quality Control Inspector</h1>
          <p className="mt-3 text-lg text-slate-600">Be the guardian of excellence, ensuring every product meets the highest standards.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">A Day in the Life</h2>
              <p className="text-slate-700">
                As a Quality Control (QC) Inspector, your role is defined by precision. You spend your day examining products and materials for defects or deviations from exact specifications. This involves using advanced measuring instruments like calipers, micrometers, and Coordinate Measuring Machines (CMM). You'll read blueprints and technical documents, conduct tests, and meticulously record your findings. When a product doesn't meet the standard, you are the one who flags it and works with the production team to identify the root cause of the problem, ensuring that only perfect products leave the facility.
              </p>
                            {/* --- NEW VIDEO SECTION --- */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Watch: Quality Control Inspector Job Duties</h3>
                <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                  <iframe 
                    src="https://www.youtube.com/embed/8lajhra4aoQ?si=bNAn5SSOtk7WMn3z" 
                    title="YouTube video player: Quality Control Inspector Job Duties" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">Career Roadmap</h2>
              <div className="space-y-4">
                 <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div><div className="ml-4"><h3 className="font-semibold">QC Inspector Trainee</h3><p className="text-sm text-slate-600">Learn inspection techniques and how to use measurement tools.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div><div className="ml-4"><h3 className="font-semibold">Quality Control Inspector</h3><p className="text-sm text-slate-600">Independently inspect products, approve materials, and document results.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div><div className="ml-4"><h3 className="font-semibold">Quality Technician / Auditor</h3><p className="text-sm text-slate-600">Analyze quality data, perform process audits, and lead improvement projects.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div><div className="ml-4"><h3 className="font-semibold">Quality Manager</h3><p className="text-sm text-slate-600">Oversee the entire quality management system for a company.</p></div></div>
              </div>
            </section>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ListChecks className="w-5 h-5 mr-2 text-blue-600"/>Skills Required</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Attention to Detail</li><li>Using Measurement Tools</li><li>Reading Blueprints</li><li>Understanding of GD&T</li><li>Data Analysis</li></ul></div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold flex items-center"><DollarSign className="w-5 h-5 mr-2 text-blue-600"/>Earning Potential</h3>
              <p className="mt-2 text-slate-600 text-sm">
                Median Pay: **$45,950 per year**<br/>
                Top 10% Earn: **&gt;$75,340 per year**
              </p>
              <p className="text-xs text-slate-400 mt-2">(Source: U.S. BLS, QC Inspectors)</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-blue-600"/>Top Certifications</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Certified Quality Inspector (CQI)</li><li>Six Sigma Belts (Yellow, Green)</li><li>Certified Quality Technician (CQT)</li></ul></div>
          </div>
        </div>
        <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold">Ready to Learn More?</h2>
            <Link href="/explore?prompt=Tell me more about Quality Control careers" className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">Chat with Coach Mach <Bot className="w-5 h-5 ml-2" /></Link>
        </div>
      </div>
    </div>
  );
}
