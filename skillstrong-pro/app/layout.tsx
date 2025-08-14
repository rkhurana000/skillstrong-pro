// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SkillStrong — Future-Proof Careers',
  description:
    'Explore careers, training, and apprenticeships with a guided AI coach.',
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-nav">
          <div className="nav-wrap">
            <Link href="/" className="brand">SkillStrong</Link>
            <nav className="nav-links">
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
        {children}
      </body>
    </html>
  );
}
