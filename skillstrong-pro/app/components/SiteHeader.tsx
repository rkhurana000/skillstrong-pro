// /app/components/SiteHeader.tsx
'use client'

import Link from "next/link";
import { Cpu } from "lucide-react"; 
import LocationButton from "./LocationButton";
import { useLocation } from "@/app/contexts/LocationContext";
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const simpleLinks = [
  { href: "/programs", label: "Programs" },
  { href: "/quiz", label: "Quiz" },
];

const careersChildren = [
  { href: "/explore", label: "Explore Careers" },
  { href: "/jobs", label: "Sample Job Descriptions" },
];

export default function SiteHeader() {
  const { user } = useLocation();
  const userInitial = user?.email?.charAt(0).toUpperCase();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const careersActive = ['/explore', '/careers', '/jobs'].some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

return (
    <header className="site-header sticky top-0 z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 text-slate-200">
      <div className="site-header__inner container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="brand flex items-center text-2xl font-bold text-slate-100">
            <Cpu className="w-7 h-7 mr-2 text-blue-500" />
            Project SkillStrong
        </Link>
        <nav className="site-nav flex items-center space-x-5 md:space-x-6">
          {/* Careers dropdown */}
          <div
            ref={dropRef}
            className="relative"
            onMouseEnter={() => setOpen(true)}
          >
            <button
              onClick={() => setOpen((v) => !v)}
              className={`text-sm md:text-base font-medium transition-colors hover:text-blue-400 ${
                careersActive ? 'text-blue-400 font-semibold' : 'text-slate-900'
              }`}
            >
              Careers ▾
            </button>
            {open && (
              <div className="absolute left-0 top-full z-50 mt-2 min-w-[240px] rounded-xl border border-gray-200 bg-white py-2 shadow-xl whitespace-nowrap">
                {careersChildren.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className={`block px-5 py-3 text-sm font-medium transition-colors hover:bg-blue-50 ${
                      pathname === c.href || pathname.startsWith(c.href + '/')
                        ? 'font-semibold text-blue-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {simpleLinks.map(link => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm md:text-base font-medium transition-colors hover:text-blue-400 ${
                  isActive ? 'text-blue-400 font-semibold' : 'text-slate-300'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <LocationButton />
          {user ? (
            <Link href="/account" className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-500" title={`Account (${user.email})`}>
               {/* Slightly darker inner circle for contrast */}
               <div className="flex items-center justify-center w-[28px] h-[28px] bg-slate-800 rounded-full">
                  <span className="text-sm font-bold text-slate-100">{userInitial}</span>
                </div>
            </Link>
          ) : (
            <Link
              href="/account"
              className={`text-sm md:text-base font-medium transition-colors hover:text-blue-400 ${
                pathname === '/account' ? 'text-blue-400 font-semibold' : 'text-slate-300'
              }`}
            >
              Account
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

