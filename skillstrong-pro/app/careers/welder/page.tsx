// /app/careers/welder/page.tsx
import Link from 'next/link';
import { ArrowRight, Bot, DollarSign, ListChecks, ShieldCheck } from 'lucide-react';

export default function WelderCareerPage() {
  return (
    <div className="bg-slate-50">
      <div className="container mx-auto max-w-4xl py-12 px-6">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Career Pathway: Welding Programmer</h1>
          <p className="mt-3 text-lg text-slate-600">Fuse the future by mastering the art and science of joining metals.</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="md:col-span-2 space-y-8">
            {/* A Day in the Life Section */}
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">A Day in the Life</h2>
              <p className="text-slate-700 mb-6">
                As a Welding programmer, you're a skilled artisan of the industrial world. Your day might start by reviewing blueprints to understand the scope of a project. You'll spend time preparing materials—cutting, grinding, and cleaning metal surfaces to ensure a perfect join. The core of your work involves using advanced equipment, like TIG or MIG welders, to fuse components for everything from skyscrapers and bridges to precision aerospace parts. Safety is paramount, so you'll always be equipped with protective gear. It’s a hands-on, focused role that leaves you with the satisfaction of having built something real and durable.
              </p>
              
              {/* --- NEW VIDEO SECTION --- */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Watch: A Day in the Life of a Welder</h3>
                <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                  <iframe 
                    src="https://www.youtube.com/embed/oEzP46PwYqQ?si=XdlgdvganhtIkx2v"
                    title="YouTube video player: A Day in the Life of a Welding Programmer" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>
              </div>
            </section>
            {/* Career Roadmap Section */}
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4 mt-8">Career Roadmap</h2>
              <div className="space-y-4">
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div><div className="ml-4"><h3 className="font-semibold">Apprentice / Entry-Level Welder</h3><p className="text-sm text-slate-600">Learn foundational skills on the job, assisting senior welders.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div><div className="ml-4"><h3 className="font-semibold">Certified Welder / Technician</h3><p className="text-sm text-slate-600">Work independently on complex projects, holding key certifications (AWS).</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div><div className="ml-4"><h3 className="font-semibold">Senior / Master Welder or Inspector (CWI)</h3><p className="text-sm text-slate-600">Lead projects, train others, or ensure quality as a Certified Welding Inspector.</p></div></div>
                 <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div><div className="ml-4"><h3 className="font-semibold">Supervisor / Business Owner</h3><p className="text-sm text-slate-600">Manage teams of welders or start your own fabrication business.</p></div></div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ListChecks className="w-5 h-5 mr-2 text-blue-600"/>Skills Required</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>MIG, TIG, Stick & Flux-Cored Welding</li><li>Blueprint Reading</li><li>Metal Fabrication</li><li>Attention to Detail</li><li>Physical Stamina</li></ul></div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><DollarSign className="w-5 h-5 mr-2 text-blue-600"/>Earning Potential</h3><p className="mt-2 text-slate-600 text-sm">Median Pay: **$50,460 per year**<br/>Top 10% Earn: **&gt;$72,970 per year**</p><p className="text-xs text-slate-400 mt-2">(Source: U.S. Bureau of Labor Statistics, 2023)</p></div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-blue-600"/>Top Certifications</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>AWS Certified Welder</li><li>Certified Welding Inspector (CWI)</li><li>NCCER Certifications</li></ul></div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold">Ready to Learn More?</h2>
            <p className="mt-2 text-slate-600">Chat with our AI Coach to find local training programs, ask salary questions, and get personalized advice.</p>
      <Link 
    href="/chat?category=Welding%20Programmer" // Corrected href
    className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
    Chat with Coach Mach<Bot className="w-5 h-5 ml-2" />
</Link>    
                  </div>
      </div>
    </div>
  );
}
