'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useRef, useEffect } from 'react';

const simpleLinks = [
  { href: '/', label: 'Home' },
  { href: '/quiz', label: 'Quiz' },
  { href: '/about', label: 'About' },
];

const careersChildren = [
  { href: '/explore', label: 'Explore Careers' },
  { href: '/jobs', label: 'Browse Jobs' },
  { href: '/programs', label: 'Training Programs' },
];

export default function NavBar() {
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

  const careersActive = ['/explore', '/careers', '/jobs', '/programs'].some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="SkillStrong — Home">
          <span>Skill</span><span className="brand-strong">Strong</span>
        </Link>

        <nav className="main-nav" aria-label="Main">
          {simpleLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${pathname === l.href ? 'is-active' : ''}`}
            >
              {l.label}
            </Link>
          ))}

          <div
            ref={dropRef}
            className="relative inline-block"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <button
              onClick={() => setOpen((v) => !v)}
              className={`nav-link ${careersActive ? 'is-active' : ''}`}
              aria-expanded={open}
            >
              Careers ▾
            </button>
            {open && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {careersChildren.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-2 text-sm hover:bg-slate-100 ${
                      pathname === c.href || pathname.startsWith(c.href + '/')
                        ? 'font-semibold text-blue-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/account"
            className={`nav-link ${pathname === '/account' ? 'is-active' : ''}`}
          >
            Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
