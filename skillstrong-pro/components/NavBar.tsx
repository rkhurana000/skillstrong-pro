'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/interest', label: 'Interest' },
  { href: '/quiz', label: 'Quiz' },
  { href: '/about', label: 'About' },
  // We’ll render /chat directly for Explore Careers
  { href: '/chat', label: 'Explore Careers' },
  { href: '/account', label: 'Account' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="topbar">
      <Link href="/" className="logo">SkillStrong</Link>
      <nav>
        {tabs.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className={['navlink', pathname === t.href ? 'active' : ''].join(' ')}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
