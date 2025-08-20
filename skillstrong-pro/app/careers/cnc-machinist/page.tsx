// /app/careers/cnc-machinist/page.tsx
import Link from 'next/link';
import { Bot, DollarSign, ListChecks, ShieldCheck } from 'lucide-react';

export default function CncMachinistPage() {
  return (
    <div className="bg-slate-50">
      <div className="container mx-auto max-w-4xl py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Career Pathway: CNC Machinist</h1>
          <p className="mt-3 text-lg text-slate-600">Shape the world with precision by turning digital designs into physical parts.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">A Day in the Life</h2>
              <p className="text-slate-700">
                As a CNC Machinist, you are at the intersection of technology and craftsmanship. Your day involves interpreting complex blueprints and 3D models from CAD/CAM software. You'll set up and calibrate computer-controlled machines, selecting the right tools and materials for the job. You will oversee the automated cutting process, making precise adjustments to ensure every part meets exact specifications, often within fractions of a millimeter. It's a role that requires a keen eye for detail, strong technical aptitude, and the satisfaction of creating essential components for industries like aerospace, medical, and automotive.
              </p>
              {/* --- NEW VIDEO SECTION --- */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Watch: Machinists Career Video</h3>
                <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                  <iframe 
                    src="https://youtu.be/OWNXI09WI14?si=RXRR4kDPDYibOBas" 
                    title="YouTube video player: Machinists Career Video" 
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
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div><div className="ml-4"><h3 className="font-semibold">Machine Operator / Apprentice</h3><p className="text-sm text-slate-600">Learn to operate machines under supervision and handle basic setup.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div><div className="ml-4"><h3 className="font-semibold">CNC Machinist / Setter</h3><p className="text-sm text-slate-600">Independently set up, operate, and troubleshoot CNC mills or lathes.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div><div className="ml-4"><h3 className="font-semibold">CNC Programmer</h3><p className="text-sm text-slate-600">Write G-code and use CAM software to create machining programs.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div><div className="ml-4"><h3 className="font-semibold">Lead Machinist / Shop Supervisor</h3><p className="text-sm text-slate-600">Manage workflow, train other machinists, and oversee shop operations.</p></div></div>
              </div>
            </section>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ListChecks className="w-5 h-5 mr-2 text-blue-600"/>Skills Required</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Blueprint Reading</li><li>G-Code/M-Code Programming</li><li>CAD/CAM Software</li><li>Precision Measurement</li><li>Problem-Solving</li></ul></div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold flex items-center"><DollarSign className="w-5 h-5 mr-2 text-blue-600"/>Earning Potential</h3>
              <p className="mt-2 text-slate-600 text-sm">
                Median Pay: **$54,380 per year**<br/>
                Top 10% Earn: **&gt;$79,330 per year**
              </p>
              <p className="text-xs text-slate-400 mt-2">(Source: U.S. BLS, 2023)</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-blue-600"/>Top Certifications</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>NIMS Certifications</li><li>Mastercam Certification</li><li>FANUC CNC Certification</li></ul></div>
          </div>
        </div>
        <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold">Ready to Learn More?</h2>
            <Link href="/explore?prompt=Tell me more about becoming a CNC Machinist" className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">Chat with the AI Coach <Bot className="w-5 h-5 ml-2" /></Link>
        </div>
      </div>
    </div>
  );
}
