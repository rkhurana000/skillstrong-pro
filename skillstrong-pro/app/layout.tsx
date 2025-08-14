// app/layout.tsx
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "SkillStrong",
  description: "Manufacturing careers, training, and quiz",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900">
        <header className="border-b border-slate-200">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-2xl font-extrabold text-slate-900 no-underline">
              SkillStrong
            </Link>
            <div className="flex gap-8 text-slate-600">
              <Link href="/">Home</Link>
              <Link href="/features">Features</Link>
              <Link href="/interest">Interest</Link>
              <Link href="/quiz">Quiz</Link>
              <Link href="/about">About</Link>
              <Link href="/explore">Explore Careers</Link>
              <Link href="/account">Account</Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
