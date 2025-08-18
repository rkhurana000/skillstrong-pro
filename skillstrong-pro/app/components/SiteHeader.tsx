// /app/components/SiteHeader.tsx
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import LocationButton from "./LocationButton"; // Import the new component

export default async function SiteHeader() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialLocation = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('zip_code')
      .eq('id', user.id)
      .single();
    initialLocation = profile?.zip_code || null;
  }
  
  const userInitial = user?.email?.charAt(0).toUpperCase();

  return (
    <header className="site-header sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b">
      <div className="site-header__inner container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="brand">SkillStrong</Link>
        <nav className="site-nav flex items-center space-x-6">
          <Link href="/">Home</Link>
          <Link href="/quiz">Quiz</Link>
          <Link href="/about">About</Link>
          <Link href="/explore">Explore Careers</Link>
          
          {/* Add the new Location Button */}
          <LocationButton initialLocation={initialLocation} user={user} />

          {user ? (
            <Link href="/account" className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
              {userInitial}
            </Link>
          ) : (
            <Link href="/account">Account</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
