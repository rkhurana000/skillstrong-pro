// app/page.tsx (Server Component)
import Image from "next/image";
import Link from "next/link";
import ChatLauncher from "./components/ChatLauncher";

export const metadata = {
  title: "SkillStrong — Future-Proof Careers",
  description:
    "Explore careers, training, and apprenticeships with a guided AI coach.",
};

export default function HomePage() {
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">MANUFACTURING CAREERS</div>

        <h1 className="display-1">
          Build Your
          <br />
          Manufacturing
          <br />
          Career
        </h1>

        <p className="lede">
          Explore careers in manufacturing and learn how to get started.
        </p>

        <div className="hero-grid">
          {/* Left: cards */}
          <div className="cards">
            <Link href="/explore" className="card">
              <div className="card-icon">🔧</div>
              <div className="card-body">
                <h3>Job Opportunities</h3>
                <p>Discover different roles within manufacturing.</p>
              </div>
            </Link>

            <Link href="/explore" className="card">
              <div className="card-icon">📘</div>
              <div className="card-body">
                <h3>Required Training</h3>
                <p>Find out what skills & certifications you need.</p>
              </div>
            </Link>

            <Link href="/quiz" className="card card-wide">
              <div className="card-icon">✅</div>
              <div className="card-body">
                <h3>Take an Interest Quiz</h3>
                <p>Find your best match in manufacturing.</p>
              </div>
            </Link>
          </div>

          {/* Right: hero image */}
          <div className="hero-image-wrap">
            <Image
              src="/hero.jpg"
              alt="Students exploring manufacturing lab"
              width={940}
              height={680}
              className="hero-image"
              priority
            />
          </div>
        </div>

        {/* Chat bar at bottom */}
        <div className="chatbar-wrap">
          <ChatLauncher />
        </div>
      </section>
    </div>
  );
}
