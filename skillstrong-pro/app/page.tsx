export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <p className="eyebrow">Future-Proof Careers</p>
        <h1>Find your path in today’s manufacturing economy</h1>
        <p className="lede">
          Welding, robotics, quality, maintenance, CNC—great jobs without a
          4-year degree. Explore roles, pay, training, and apprenticeships with
          a guided AI coach.
        </p>

        {/* pill links row */}
        <div className="subnav">
          <a href="/explore">Explore Careers</a>
          {/* add id="how-it-works" on your About page section to make this anchor jump */}
          <a href="/about#how-it-works">How it works</a>
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section className="card-grid">
        <div className="feature-card">
          <h3>Button-First Chat</h3>
          <p>
            Pick chips like job types, salary, or training length. Get short
            answers plus follow-ups.
          </p>
          <a className="link" href="/chat">Open the coach →</a>
        </div>

        <div className="feature-card">
          <h3>Real Programs</h3>
          <p>
            See certificates, community colleges, and apprenticeships near you.
          </p>
          <a className="link" href="/explore#programs">Browse training →</a>
        </div>

        <div className="feature-card">
          <h3>For Gen Z & Gen Y</h3>
          <p>Minimal clutter, big chips, friendly tone. Built for phones first.</p>
          <a className="link" href="/features">See features →</a>
        </div>
      </section>
    </>
  );
}
