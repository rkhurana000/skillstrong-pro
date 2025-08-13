export const metadata = {
  title: 'SkillStrong — Future-Proof Careers',
  description: 'Explore manufacturing careers, training & apprenticeships with a guided AI coach.',
};

export default function HomePage() {
  return (
    <main className="container" style={{ paddingBottom: 48 }}>
      <p className="eyebrow">Future-Proof Careers</p>

      <h1>Find your path in today’s manufacturing economy</h1>

      <p className="lede">
        Welding, robotics, quality, maintenance, CNC—great jobs without a 4-year degree.
        Explore roles, pay, training, and apprenticeships with a guided AI coach.
      </p>

      <div className="chips" style={{ marginTop: 8, marginBottom: 24 }}>
        <a className="chip" href="/chat">Explore Careers</a>
        <a className="chip" href="#how">How it works</a>
      </div>

      <section className="grid3">
        <article className="card">
          <h3>Button-First Chat</h3>
          <p>Pick chips like job types, salary, or training length. Get short answers plus follow-ups.</p>
          <a className="cta" href="/chat">Open the coach →</a>
        </article>

        <article className="card">
          <h3>Real Programs</h3>
          <p>See certificates, community colleges, and apprenticeships near you.</p>
          <a className="cta" href="/chat?tab=training">Browse training →</a>
        </article>

        <article className="card">
          <h3>For Gen Z & Gen Y</h3>
          <p>Minimal clutter, big chips, friendly tone. Built for phones first.</p>
          <a className="cta" href="/features">See features →</a>
        </article>
      </section>

      <section id="how" style={{ marginTop: 40 }}>
        <h2>How it works</h2>
        <ol className="steps">
          <li>Tap a chip to start (job type, salary band, or training length).</li>
          <li>Read a concise answer with bullets, images (when helpful), and citations.</li>
          <li>Follow suggested next steps or ask your own question.</li>
          <li>Save your session. Share with a counselor, teacher, or parent.</li>
        </ol>
      </section>
    </main>
  );
}
