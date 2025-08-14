// app/page.tsx  (Server Component — do NOT add "use client")
import Image from 'next/image';
import Link from 'next/link';
import ChatLauncher from './components/ChatLauncher';

export const metadata = {
  title: 'SkillStrong — Future-Proof Careers',
  description:
    'Explore careers, training, and apprenticeships with a guided AI coach.',
};

export default function HomePage() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-left">
          <p className="eyebrow">MANUFACTURING CAREERS</p>
          <h1 className="hero-title">
            Build Your
            <br />
            Manufacturing
            <br />
            Career
          </h1>

          <p className="hero-sub">
            Explore careers in manufacturing and learn how to get started.
          </p>

          <div className="feature-grid">
            <Link href="/explore" className="feature-card">
              <h3>Job Opportunities</h3>
              <p>Discover different roles within manufacturing.</p>
            </Link>

            <Link href="/explore" className="feature-card">
              <h3>Required Training</h3>
              <p>Find out what skills & certifications you need.</p>
            </Link>

            <Link href="/quiz" className="feature-card">
              <h3>Take an Interest Quiz</h3>
              <p>Find your best match in manufacturing.</p>
            </Link>
          </div>

          {/* Chat launcher — DO NOT pass onSubmit/action/etc */}
          <ChatLauncher />
        </div>

        <aside className="hero-art">
          <Image
            src="/hero.jpg"
            alt="Students exploring manufacturing lab"
            width={960}
            height={720}
            priority
            className="hero-img"
          />
        </aside>
      </section>
    </main>
  );
}
