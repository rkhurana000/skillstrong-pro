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
      <body>{children}</body>
    </html>
  );
} 


