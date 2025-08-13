import './globals.css';
import React from 'react';

export const metadata = {
  title: 'SkillStrong — Future-Proof Careers',
  description:
    'Explore manufacturing roles, training, apprenticeships and pay with a guided AI coach.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Site header expects the .site-header class for spacing/hover styles */}
        <header className="site-header">
          <div className="container">
            <div className="brand">
              <a href="/">SkillStrong</a>
            </div>
            <nav>
              <a href="/">Home</a>
              <a href="/features">Features</a>
              <a href="/interest">Interest</a>
              <a href="/quiz">Quiz</a>
              <a href="/about">About</a>
              <a href="/explore">Explore Careers</a>
              <a href="/account">Account</a>
            </nav>
          </div>
        </header>

        {/* Main content wrapper */}
        <main className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
