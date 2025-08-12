import './globals.css';
import React from 'react';
import NavBar from '@/components/NavBar';
import AnalyticsInit from '@/components/AnalyticsInit';

export const metadata = {
  title: 'SkillStrong — Manufacturing Careers',
  description: 'Explore careers, training & apprenticeships',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsInit />
        <div className="container">
          <NavBar />
          {children}
          <footer className="footer">© {new Date().getFullYear()} SkillStrong</footer>
        </div>
      </body>
    </html>
  );
}
