'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const links = [
  { href: '/', label: 'Home' },
  { href: '/quiz', label: 'Quiz' },
  { href: '/about', label: 'About' },
  { href: '/explore', label: 'Explore Careers' },
  { href: '/account', label: 'Account' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="SkillStrong — Home">
          <span>Skill</span><span className="brand-strong">Strong</span>
        </Link>

        <nav className="main-nav" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${pathname === l.href ? 'is-active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
