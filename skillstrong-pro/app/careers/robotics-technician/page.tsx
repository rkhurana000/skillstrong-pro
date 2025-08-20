// /app/careers/robotics-technician/page.tsx
import Link from 'next/link';
import { Bot, DollarSign, ListChecks, ShieldCheck } from 'lucide-react';

export default function RoboticsTechnicianPage() {
  return (
    <div className="bg-slate-50">
      <div className="container mx-auto max-w-4xl py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Career Pathway: Robotics Technician</h1>
          <p className="mt-3 text-lg text-slate-600">Build, maintain, and program the automated systems of the future.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">A Day in the Life</h2>
              <p className="text-slate-700">
                As a Robotics Technician, you are on the front lines of automation. Your day is a dynamic mix of building, testing, and maintaining robotic equipment. You might spend the morning assembling a new robotic arm on a production line, then shift to troubleshooting and repairing an existing one. A large part of your role involves programming—writing or modifying code to control a robot's movements and tasks. You'll perform preventative maintenance to keep systems running efficiently and work closely with engineers to improve robotic processes, making manufacturing smarter, faster, and safer.
              </p>
            </section>
             {/* --- NEW VIDEO SECTION --- */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Watch: What is a Robotics Technician?</h3>
                <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                  <iframe 
                    src="https://www.youtube.com/embed/oD9AMiCYl8s?si=gjqnjXiZqfa6NODL" 
                    title="YouTube video player: What is a Robotics Technician?" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>
              </div>
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">Career Roadmap</h2>
              <div className="space-y-4">
                 <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div><div className="ml-4"><h3 className="font-semibold">Junior Robotics Technician</h3><p className="text-sm text-slate-600">Assist with installation, maintenance, and basic troubleshooting.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div><div className="ml-4"><h3 className="font-semibold">Robotics Technician</h3><p className="text-sm text-slate-600">Independently manage, program, and repair robotic systems.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div><div className="ml-4"><h3 className="font-semibold">Robotics Specialist / Programmer</h3><p className="text-sm text-slate-600">Specialize in complex programming and system integration.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div><div className="ml-4"><h3 className="font-semibold">Automation Engineer / Supervisor</h3><p className="text-sm text-slate-600">Design new automated systems and manage technical teams.</p></div></div>
              </div>
            </section>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ListChecks className="w-5 h-5 mr-2 text-blue-600"/>Skills Required</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Electronics & Circuitry</li><li>Mechanical Aptitude</li><li>PLC Programming</li><li>Troubleshooting</li><li>Computer Skills</li></ul></div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold flex items-center"><DollarSign className="w-5 h-5 mr-2 text-blue-600"/>Earning Potential</h3>
              <p className="mt-2 text-slate-600 text-sm">
                Median Pay: **$65,150 per year**<br/>
                Top 10% Earn: **&gt;$99,570 per year**
              </p>
              <p className="text-xs text-slate-400 mt-2">(Source: U.S. BLS, Electro-Mechanical Techs)</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-blue-600"/>Top Certifications</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Robotics Certification (SME)</li><li>FANUC Certified Robot Operator</li><li>PMMI Mechatronics</li></ul></div>
          </div>
        </div>
        <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold">Ready to Learn More?</h2>
            <Link href="/explore?prompt=Tell me more about becoming a Robotics Technician" className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">Chat with the AI Coach <Bot className="w-5 h-5 ml-2" /></Link>
        </div>
      </div>
    </div>
  );
}
