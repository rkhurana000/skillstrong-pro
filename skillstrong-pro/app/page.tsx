// app/page.tsx  (Server Component)
import Link from 'next/link';

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
          {/* File must exist at /public/hero.jpg (you already confirmed it does) */}
          <img
            src="/hero.jpg"
            alt="Students exploring manufacturing lab"
            className="hero-img"
            width="1100"
            height="820"
            loading="eager"
            decoding="async"
          />
        </div>
      </section>

      {/* Send to chat on /explore (keeps behavior you wanted) */}
      <div className="shell">
        <form
          className="chatbar"
          action="/explore#coach"
          onSubmit={(e) => {
            // This handler is ignored on the server; fine on the client.
            const form = e.currentTarget as HTMLFormElement;
            const input = form.querySelector('input[name="prompt"]') as HTMLInputElement | null;
            if (!input || !input.value.trim()) e.preventDefault();
          }}
        >
          <input name="prompt" placeholder="Ask me anything about manufacturing careers…" />
          <button className="btn" type="submit">→</button>
        </form>
      </div>
    </main>
  );
}
