// /app/careers/additive-manufacturing/page.tsx
import Link from 'next/link';
import { Bot, DollarSign, ListChecks, ShieldCheck } from 'lucide-react';

export default function AdditiveManufacturingPage() {
  return (
    <div className="bg-slate-50">
      <div className="container mx-auto max-w-4xl py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Career Pathway: Additive Manufacturing Technician</h1>
          <p className="mt-3 text-lg text-slate-600">Build the future, one layer at a time, with industrial 3D printing.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">A Day in the Life</h2>
              <p className="text-slate-700">
                As an Additive Manufacturing Technician, you are on the cutting edge of modern production. Your day revolves around operating and maintaining advanced 3D printers that create complex parts from materials like metal, plastic, and composites. You'll start by preparing digital models using CAD software, then set up the printing equipment, and monitor the build process to ensure quality. A key part of your role is post-processing: removing support structures, cleaning, and finishing printed parts to meet precise specifications. You'll work with engineers to refine designs and troubleshoot any issues, playing a vital role in bringing innovative products to life.
              </p>
              {/* --- NEW VIDEO SECTION --- */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Watch: What is Additive Manufacturing?</h3>
                <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                  <iframe 
                    src="https://www.youtube.com/embed/lVbsDBXn6ZE?si=u_9k-9o_0Z0YyW-U"
                    title="YouTube video player: What is Additive Manufacturing?" 
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
                 <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div><div className="ml-4"><h3 className="font-semibold">AM Machine Operator / Intern</h3><p className="text-sm text-slate-600">Learn to operate 3D printers and perform basic maintenance and post-processing tasks.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div><div className="ml-4"><h3 className="font-semibold">Additive Manufacturing Technician</h3><p className="text-sm text-slate-600">Independently manage print jobs, from file preparation to finished part inspection.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div><div className="ml-4"><h3 className="font-semibold">Senior AM Technician / Application Specialist</h3><p className="text-sm text-slate-600">Specialize in a particular technology (e.g., metal printing) and help optimize its use.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div><div className="ml-4"><h3 className="font-semibold">AM Process Engineer / Lab Manager</h3><p className="text-sm text-slate-600">Develop new printing processes, manage the facility, and lead technical teams.</p></div></div>
              </div>
            </section>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ListChecks className="w-5 h-5 mr-2 text-blue-600"/>Skills Required</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>CAD Software (SolidWorks, etc.)</li><li>3D Printing Technologies</li><li>Post-Processing Techniques</li><li>Attention to Detail</li><li>Problem-Solving</li></ul></div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold flex items-center"><DollarSign className="w-5 h-5 mr-2 text-blue-600"/>Earning Potential</h3>
              <p className="mt-2 text-slate-600 text-sm">
                Median Pay: **$69,213 per year**<br/>
                Top 10% Earn: **&gt;$121,922 per year**
              </p>
              <p className="text-xs text-slate-400 mt-2">(Source: SalaryExpert, Additive Manufacturing Engineer)</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-blue-600"/>Top Certifications</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Certified Additive Manufacturing Fundamentals (CAMF)</li><li>ASTM AM Certification</li><li>Specific software/hardware certifications</li></ul></div>
          </div>
        </div>
        <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold">Ready to Learn More?</h2>
            <Link 
              href="/chat?category=Additive%20Manufacturing" 
              className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
              Chat with Coach Mach<Bot className="w-5 h-5 ml-2" />
            </Link>    
        </div>
      </div>
    </div>
  );
}
