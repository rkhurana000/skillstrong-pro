// app/page.tsx  — server component
import Image from 'next/image';
import Link from 'next/link';
import ChatLauncher from './components/ChatLauncher';

export const metadata = {
  title: 'SkillStrong — Future-Proof Careers',
  description: 'Explore careers, training, and apprenticeships with a guided AI coach.',
};

export default function Home() {
  return (
    <main>
      <section className="shell hero">
        <div className="hero-copy">
          <p className="overline">MANUFACTURING CAREERS</p>
          <h1 className="display">Build Your Manufacturing Career</h1>
          <p className="lede">
            Explore careers in manufacturing and learn how to get started.
          </p>

          <div className="feature-cards">
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
        </div>

        <div className="hero-media">
          <div className="hero-img-wrap">
            {/* Keep /public/hero.jpg in the repo: public/hero.jpg */}
            <Image
              src="/hero.jpg"
              alt="Students exploring manufacturing lab"
              width={1100}
              height={820}
              priority
              className="hero-img"
            />
          </div>
        </div>
      </section>

      {/* Launcher routes to /explore#coach and passes the prompt in the URL */}
      <div className="shell">
        <ChatLauncher />
      </div>
    </main>
  );
}
