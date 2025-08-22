// /app/components/SiteHeader.tsx
'use client' // This must be a client component to use the context hook

import Link from "next/link";
import { Factory } from "lucide-react";
import LocationButton from "./LocationButton";
import { useLocation } from "@/app/contexts/LocationContext";

export default function SiteHeader() {
  const { user } = useLocation(); // Get user from the global context
  const userInitial = user?.email?.charAt(0).toUpperCase();

  return (
    <header className="site-header sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b">
      <div className="site-header__inner container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="brand flex items-center text-2xl font-bold text-gray-800">
            <Factory className="w-7 h-7 mr-2 text-blue-600" />
            SkillStrong
        </Link>
        <nav className="site-nav flex items-center space-x-6">
          <Link href="/explore">Explore Careers</Link>
          <Link href="/quiz">Quiz</Link>
          <LocationButton />
          {user ? (
            <Link href="/account" className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-500">
               <div className="flex items-center justify-center w-[28px] h-[28px] bg-white rounded-full">
                  <span className="text-sm font-bold text-slate-700">{userInitial}</span>
                </div>
            </Link>
          ) : (
            <Link href="/account">Account</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
