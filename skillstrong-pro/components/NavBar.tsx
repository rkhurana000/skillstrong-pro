// components/NavBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/interest", label: "Interest" },
  { href: "/quiz", label: "Quiz" },
  { href: "/about", label: "About" },
  { href: "/explore", label: "Explore Careers" },
  { href: "/account", label: "Account" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="site-nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          SkillStrong
        </Link>
        <nav className="nav-links">
          {links.map((l) => {
            const active =
              l.href === "/"
                ? pathname === "/"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
