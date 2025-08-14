import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-static"; // static page, but new deploys update it

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">MANUFACTURING CAREERS</p>
          <h1 className="hero-title">
            Build Your
            <br />
            Manufacturing
            <br />
            Career
          </h1>

          <p className="lead">
            Explore careers in manufacturing and learn how to get started.
          </p>

          <div className="cards">
            <Link href="/explore" className="card">
              <div className="card-icon">⚙️</div>
              <div>
                <div className="card-title">Job Opportunities</div>
                <div className="card-sub">Discover different roles within manufacturing.</div>
              </div>
            </Link>

            <Link href="/explore?tab=training" className="card">
              <div className="card-icon">📚</div>
              <div>
                <div className="card-title">Required Training</div>
                <div className="card-sub">Find out what skills & certifications you need.</div>
              </div>
            </Link>

            <Link href="/quiz" className="card">
              <div className="card-icon">✅</div>
              <div>
                <div className="card-title">Take an Interest Quiz</div>
                <div className="card-sub">Find your best match in manufacturing.</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="hero-media">
          <Image
            src="/hero.jpg"
            alt="Students exploring manufacturing lab"
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            priority
            style={{ objectFit: "cover", borderRadius: 16 }}
          />
        </div>
      </section>

      <form
        action="/explore"
        className="chatbar"
        onSubmit={(e) => {
          // let the native navigation happen, we only need a quick guard
          const input = (e.currentTarget.elements.namedItem("q") as HTMLInputElement);
          if (!input.value.trim()) input.value = "Explore careers";
        }}
      >
        <input
          name="q"
          className="chatbar-input"
          placeholder="Ask me anything about manufacturing careers…"
          autoComplete="off"
        />
        <button className="chatbar-go" aria-label="Go">→</button>
      </form>
    </main>
  );
}
