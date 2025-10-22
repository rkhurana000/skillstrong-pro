// /app/components/SiteHeader.tsx
'use client' // This must be a client component to use the context hook

import Link from "next/link";
// CHANGED: Imported Cpu instead of Factory
import { Cpu } from "lucide-react"; 
import LocationButton from "./LocationButton";
import { useLocation } from "@/app/contexts/LocationContext";
import { usePathname } from 'next/navigation'; // Import usePathname

export default function SiteHeader() {
  const { user } = useLocation(); // Get user from the global context
  const userInitial = user?.email?.charAt(0).toUpperCase();
  const pathname = usePathname(); // Get the current path
const navLinks = [
    { href: "/explore", label: "Explore Careers" },
    { href: "/programs", label: "Programs"}, // Added Programs link
    { href: "/jobs", label: "Jobs"},       // Added Jobs link
    { href: "/quiz", label: "Quiz" },
    // { href: "/about", label: "About" }, // Optional: Add About if desired
  ];
return (
    <header className="site-header sticky top-0 z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 text-slate-200"> {/* Dark theme header */}
      <div className="site-header__inner container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="brand flex items-center text-2xl font-bold text-slate-100"> {/* Adjusted text color */}
            <Cpu className="w-7 h-7 mr-2 text-blue-500" /> {/* Adjusted icon color */}
            Project SkillStrong
        </Link>
        <nav className="site-nav flex items-center space-x-5 md:space-x-6"> {/* Slightly adjusted spacing */}
          {navLinks.map(link => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)); // Check if path starts with href for sections like /programs/all
            return (
              <Link
                key={link.href}
                href={link.href}
                // Apply conditional styling for active link
                className={`text-sm md:text-base font-medium transition-colors hover:text-blue-400 ${
                  isActive ? 'text-blue-400 font-semibold' : 'text-slate-300' // Highlight active link in blue
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

