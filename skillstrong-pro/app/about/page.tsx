export default function AboutPage() {
  return (
    <main className="container" style={{ padding: '28px 0 40px' }}>
      <section className="hero">
        <h1 style={{ fontSize: 40, lineHeight: 1.2, margin: '8px 0' }}>
          About <span style={{ color: 'var(--accent)' }}>SkillStrong</span>
        </h1>
        <p className="lead" style={{ maxWidth: 820 }}>
          We help students and career-switchers discover high-opportunity jobs in today’s
          manufacturing economy—welding, robotics, CNC, quality, maintenance, logistics and more.
          No four-year degree required. Explore roles, pay, training, apprenticeships and local programs
          with a guided AI coach.
        </p>
      </section>

      <section className="section">
        <h2>Our Mission</h2>
        <p>
          Restore the maker path. We connect learners to practical, well-paid careers and the
          training that gets them there—community colleges, certificates, and apprenticeships.
        </p>
      </section>

      <section className="section">
        <h2>What you can do here</h2>
        <ul>
          <li>Explore roles by interest, salary, or training length</li>
          <li>See pay, day-to-day tasks, outlook and certifications</li>
          <li>Find nearby programs & apprenticeships (ZIP-aware)</li>
          <li>Take a quick RIASEC-lite quiz and map to O*NET roles</li>
          <li>Save sessions; counselors/teachers can share and export plans</li>
        </ul>
      </section>

      <section className="section">
        <h2>Who it’s for</h2>
        <ul>
          <li>High-school seniors and recent grads</li>
          <li>Career-switchers and up-skillers</li>
          <li>Counselors, teachers, workforce partners</li>
        </ul>
      </section>

      <section className="section">
        <h2>Contact</h2>
        <p>
          Partnerships, schools, or employers? Email{' '}
          <a href="mailto:hello@projectskillstrong.com">hello@projectskillstrong.com</a>.
        </p>
      </section>
    </main>
  );
}
