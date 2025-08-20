// /app/page.tsx
import Link from 'next/link';
import { 
    ArrowRight, Bot, Compass, Briefcase, Zap, ShieldCheck, DollarSign,
    Cpu, Printer, Flame, Wrench, ScanSearch 
} from 'lucide-react';

const heroImage = "https://images.unsplash.com/photo-1581092921462-2052714a8993?q=80&w=2940&auto=format&fit=crop";

export default function HomePage() {
  return (
    <div className="bg-white text-slate-800">
      {/* --- Hero Section --- */}
      <section className="relative bg-slate-900 text-white">
        <div className="absolute inset-0">
            <img src={heroImage} alt="Modern manufacturing environment" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        </div>
        <div className="relative container mx-auto px-6 lg:px-8 py-24 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Build What's Next.
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-slate-300">
            Don't just get a job. Start a high-demand, high-tech career in modern manufacturing—no four-year degree required.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/explore" className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
              Explore Careers <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/quiz" className="inline-flex items-center justify-center px-8 py-3 bg-slate-700/50 text-white font-semibold rounded-full backdrop-blur-sm hover:bg-slate-600/50 transition-transform hover:scale-105">
              Take the Interest Quiz
            </Link>
          </div>
        </div>
      </section>

      {/* --- How It Works Section --- */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Your Career Journey in 3 Steps</h2>
            <p className="mt-2 text-slate-600">Discover, explore, and launch your future.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-8 text-center">
            <div className="p-8 bg-white rounded-xl shadow-lg">
              <Compass className="w-12 h-12 mx-auto text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold">1. Discover Your Fit</h3>
              <p className="mt-2 text-slate-600">Take a 2-minute quiz to match your interests with high-demand skilled careers.</p>
            </div>
            <div className="p-8 bg-white rounded-xl shadow-lg">
              <Bot className="w-12 h-12 mx-auto text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold">2. Explore Your Options</h3>
              <p className="mt-2 text-slate-600">Chat with our AI Coach to learn about skills, salaries, and local training programs.</p>
            </div>
            <div className="p-8 bg-white rounded-xl shadow-lg">
              <Briefcase className="w-12 h-12 mx-auto text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold">3. Launch Your Career</h3>
              <p className="mt-2 text-slate-600">Find paid apprenticeships and job openings to get started in the industry right away.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Featured Careers Section --- */}
      <section className="py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Careers of the Future, Available Today</h2>
            <p className="mt-2 text-slate-600">These aren't your parents' factory jobs. Work with cutting-edge technology.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow">
              <Bot className="w-16 h-16 mx-auto text-blue-600"/>
              <h3 className="mt-5 text-xl font-semibold">Robotics Technician</h3>
              <p className="mt-2 text-slate-600">Install, maintain, and repair the robotic systems that power modern industry.</p>
            </div>
            {/* Card 2 */}
            <div className="group text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow">
              <Cpu className="w-16 h-16 mx-auto text-blue-600"/>
              <h3 className="mt-5 text-xl font-semibold">CNC Machinist</h3>
              <p className="mt-2 text-slate-600">Turn digital blueprints into precision parts for everything from aerospace to medical devices.</p>
            </div>
            {/* Card 3 */}
            <div className="group text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow">
              <Printer className="w-16 h-16 mx-auto text-blue-600"/>
              <h3 className="mt-5 text-xl font-semibold">Additive Manufacturing</h3>
              <p className="mt-2 text-slate-600">Use industrial 3D printers to create complex components and innovative prototypes.</p>
            </div>
            
            {/* --- THIS IS THE FIX --- */}
            {/* The entire card is now wrapped in a Link component */}
            <Link href="/careers/welder" className="block group text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow hover:-translate-y-1">
              <Flame className="w-16 h-16 mx-auto text-blue-600"/>
              <h3 className="mt-5 text-xl font-semibold">Welding Technologist</h3>
              <p className="mt-2 text-slate-600">Fuse metals using advanced techniques, including robotic and laser welding systems.</p>
            </Link>

            {/* Card 5 */}
            <div className="group text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow">
              <Wrench className="w-16 h-16 mx-auto text-blue-600"/>
              <h3 className="mt-5 text-xl font-semibold">Maintenance Technician</h3>
              <p className="mt-2 text-slate-600">Be the problem-solver who keeps the high-tech machinery of a facility running smoothly.</p>
            </div>
            {/* Card 6 */}
            <div className="group text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow">
              <ScanSearch className="w-16 h-16 mx-auto text-blue-600"/>
              <h3 className="mt-5 text-xl font-semibold">Quality Control Inspector</h3>
              <p className="mt-2 text-slate-600">Use precision instruments and technology to ensure products meet the highest standards.</p>
            </div>
          </div>
        </div>
      </section>

       {/* --- Value Proposition Section --- */}
       <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-6 lg:px-8 grid md:grid-cols-3 gap-12 text-center">
          <div>
            <Zap className="w-10 h-10 mx-auto text-blue-400"/>
            <h3 className="mt-4 text-xl font-semibold">High-Demand Skills</h3>
            <p className="mt-1 text-slate-300">The US is rebuilding its industrial core. Your skills will be essential and in high demand.</p>
          </div>
          <div>
            <DollarSign className="w-10 h-10 mx-auto text-blue-400"/>
            <h3 className="mt-4 text-xl font-semibold">Earn While You Learn</h3>
            <p className="mt-1 text-slate-300">Discover paid apprenticeships that get you into the workforce faster, without the debt.</p>
          </div>
          <div>
            <ShieldCheck className="w-10 h-10 mx-auto text-blue-400"/>
            <h3 className="mt-4 text-xl font-semibold">A Secure Future</h3>
            <p className="mt-1 text-slate-300">Build a long-term, lucrative career in an industry that's critical to the nation's success.</p>
          </div>
        </div>
      </section>

      {/* --- Final CTA Section --- */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Build Your Future?</h2>
          <p className="mt-3 max-w-xl mx-auto text-slate-600">Your next step is just a click away. Start exploring or get matched with careers that fit your interests.</p>
          <div className="mt-8">
             <Link href="/explore" className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
              Start Exploring Now <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
