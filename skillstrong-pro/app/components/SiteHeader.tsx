// /app/components/SiteHeader.tsx
import Link from 'next/link';
import { Factory } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export default async function SiteHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userInitial = user?.email?.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b">
      <div className="site-header__inner container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="brand flex items-center text-2xl font-bold text-gray-800">
          <Factory className="w-7 h-7 mr-2 text-blue-600" />
          SkillStrong
        </Link>
        <nav className="site-nav hidden md:flex md:space-x-8 items-center">
          <Link href="/explore" className="text-gray-500 hover:text-gray-900 font-medium">Explore Careers</Link>
          <Link href="/quiz" className="text-gray-500 hover:text-gray-900 font-medium">Interest Quiz</Link>
          
          {user ? (
            <Link href="/account">
              {/* --- NEW: Gemini-style Icon --- */}
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-500">
                <div className="flex items-center justify-center w-[28px] h-[28px] bg-white rounded-full">
                  <span className="text-sm font-bold text-slate-700">{userInitial}</span>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/account" className="text-gray-500 hover:text-gray-900 font-medium">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
