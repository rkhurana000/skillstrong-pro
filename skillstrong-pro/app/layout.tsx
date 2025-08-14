// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import SiteHeader from './components/SiteHeader';

export const metadata: Metadata = {
  title: 'SkillStrong — Future-Proof Careers',
  description:
    'Explore manufacturing careers, training, and apprenticeships with a guided AI coach.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 md:px-6">{children}</main>
      </body>
    </html>
  );
}
