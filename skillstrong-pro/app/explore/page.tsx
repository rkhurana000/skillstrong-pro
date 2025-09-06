// /app/explore/page.tsx
import Link from 'next/link';
import { Cpu, Printer, Flame, Wrench, ScanSearch, Handshake } from 'lucide-react';

const careers = [
  { icon: ScanSearch, title: 'CNC Machinist', href: '/careers/cnc-machinist' },
  { icon: Flame, title: 'Welding Programmer', href: '/careers/welder' },
  { icon: Cpu, title: 'Robotics Technologist', href: '/careers/robotics-technician' },
  { icon: Wrench, title: 'Maintenance Tech', href: '/careers/industrial-maintenance' },
  { icon: Handshake, title: 'Quality Control Specialist', href: '/careers/quality-control' },
  { icon: Printer, title: 'Additive Manufacturing', href: '/careers/logistics' },
];

export default function ExplorePage() {
  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900">Explore Career Pathways</h1>
          <p className="mt-3 text-lg text-slate-600">
            Click on a category to learn more about the role, skills required, and earning potential.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {careers.map(({ icon: Icon, title, href }) => (
            <Link
              key={title}
              href={href}
              className="group block rounded-lg border bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-500 transition-all"
            >
              <div className="flex items-center gap-4">
                <Icon className="h-10 w-10 text-blue-600" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
