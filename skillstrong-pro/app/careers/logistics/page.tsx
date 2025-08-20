// /app/careers/logistics/page.tsx
import Link from 'next/link';
import { Bot, DollarSign, ListChecks, ShieldCheck } from 'lucide-react';

export default function LogisticsPage() {
  return (
    <div className="bg-slate-50">
      <div className="container mx-auto max-w-4xl py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Career Pathway: Logistics & Supply Chain</h1>
          <p className="mt-3 text-lg text-slate-600">Master the flow of goods and information that powers the global economy.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">A Day in the Life</h2>
              <p className="text-slate-700">
                As a Logistics and Supply Chain Associate, you are a master coordinator. Your role is to ensure that materials, parts, and final products move efficiently from origin to destination. A typical day involves tracking shipments, managing warehouse inventory using advanced software, and coordinating with suppliers and transportation companies. You'll analyze data to identify bottlenecks and find ways to make the supply chain faster and more cost-effective. It's a fast-paced, problem-solving role that requires excellent organizational skills and is essential to every manufacturing operation.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">Career Roadmap</h2>
              <div className="space-y-4">
                 <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div><div className="ml-4"><h3 className="font-semibold">Logistics Coordinator / Clerk</h3><p className="text-sm text-slate-600">Handle shipping documents, track inventory, and coordinate schedules.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div><div className="ml-4"><h3 className="font-semibold">Logistics Analyst</h3><p className="text-sm text-slate-600">Analyze supply chain data to improve efficiency and reduce costs.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div><div className="ml-4"><h3 className="font-semibold">Warehouse / Distribution Supervisor</h3><p className="text-sm text-slate-600">Manage a team and oversee the operations of a warehouse or distribution center.</p></div></div>
                <div className="ml-4 h-8 border-l-2 border-slate-300"></div>
                <div className="flex items-center"><div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div><div className="ml-4"><h3 className="font-semibold">Supply Chain Manager</h3><p className="text-sm text-slate-600">Oversee the entire supply chain, from sourcing raw materials to final delivery.</p></div></div>
              </div>
            </section>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ListChecks className="w-5 h-5 mr-2 text-blue-600"/>Skills Required</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Organization</li><li>Inventory Management</li><li>Data Analysis</li><li>Communication</li><li>Problem-Solving</li></ul></div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><DollarSign className="w-5 h-5 mr-2 text-blue-600"/>Earning Potential</h3><p className="mt-2 text-slate-600 text-sm">Median Pay: **$77,520 per year**<br/>Top 10% Earn: **&gt$129,570 per year**</p><p className="text-xs text-slate-400 mt-2">(Source: U.S. BLS, Logisticians)</p></div>
            <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-bold flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-blue-600"/>Top Certifications</h3><ul className="mt-3 list-disc list-inside text-slate-600 text-sm space-y-1"><li>Certified in Logistics, Transportation and Distribution (CLTD)</li><li>Certified Supply Chain Professional (CSCP)</li></ul></div>
          </div>
        </div>
        <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold">Ready to Learn More?</h2>
            <Link href="/explore?prompt=Tell me more about Logistics and Supply Chain careers" className="mt-6 inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">Chat with the AI Coach <Bot className="w-5 h-5 ml-2" /></Link>
        </div>
      </div>
    </div>
  );
}
