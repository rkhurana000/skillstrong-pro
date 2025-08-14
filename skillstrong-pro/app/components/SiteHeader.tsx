// app/components/SiteHeader.tsx
import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="topbar">
      <div className="shell topbar-row">
        <Link href="/" className="brand">SkillStrong</Link>

        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/features">Features</Link>
          <Link href="/interest">Interest</Link>
          <Link href="/quiz">Quiz</Link>
          <Link href="/about">About</Link>
          <Link href="/explore">Explore Careers</Link>
          <Link href="/account">Account</Link>
        </nav>
      </div>
    </header>
  );
}
