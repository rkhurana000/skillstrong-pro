// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="marketing">
      <section className="hero">
        <p className="kicker">Future-Proof Careers</p>
        <h1>Find your path in today’s manufacturing economy</h1>
        <p className="lead">
          Welding, robotics, quality, maintenance, CNC—great jobs without a
          4-year degree. Explore roles, pay, training, and apprenticeships with
          a guided AI coach.
        </p>

        <div className="hero-actions">
          <Link href="/explore" className="pill">
            Explore Careers
          </Link>
          <Link href="/about" className="pill ghost">
            How it works
          </Link>
        </div>
      </section>

      <section className="cards">
        <article className="card">
          <h3>Button-First Chat</h3>
          <p>
            Pick chips like job types, salary, or training length. Get short
            answers plus follow-ups.
          </p>
          <Link href="/explore" className="cta">
            Open the coach →
          </Link>
        </article>

        <article className="card">
          <h3>Real Programs</h3>
          <p>
            See certificates, community colleges, and apprenticeships near you.
          </p>
          <Link href="/training" className="cta">
            Browse training →
          </Link>
        </article>

        <article className="card">
          <h3>For Gen Z & Gen Y</h3>
          <p>Minimal clutter, big chips, friendly tone. Built for phones first.</p>
          <Link href="/features" className="cta">
            See features →
          </Link>
        </article>
      </section>
    </main>
  );
}
