// app/components/SiteHeader.tsx
import Link from "next/link";
import { Factory } from 'lucide-react'; // Import the icon

export default function SiteHeader() {
  return (
    // ADDED: Tailwind CSS classes for sticky behavior and styling
    <header className="site-header sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b">
      <div className="site-header__inner container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="brand flex items-center text-2xl font-bold text-gray-800">
          <Factory className="w-7 h-7 mr-2 text-blue-600" />
          SkillStrong
        </Link>
        {/* UPDATED: Simplified navigation links */}
        <nav className="site-nav hidden md:flex md:space-x-8">
          <Link href="/explore" className="text-gray-500 hover:text-gray-900 font-medium">Explore Careers</Link>
          <Link href="/quiz" className="text-gray-500 hover:text-gray-900 font-medium">Interest Quiz</Link>
          <Link href="/account" className="text-gray-500 hover:text-gray-900 font-medium">Account</Link>
        </nav>
      </div>
    </header>
  );
}
