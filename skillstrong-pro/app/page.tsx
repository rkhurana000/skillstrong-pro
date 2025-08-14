// app/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import ChatLauncher from './components/ChatLauncher';

export default function HomePage() {
  return (
    <section className="py-10 sm:py-14 lg:py-16">
      <p className="eyebrow">MANUFACTURING CAREERS</p>

      <div className="grid items-start gap-8 md:grid-cols-2">
        {/* Left: headline + cards */}
        <div>
          <h1 className="hero-title">
            Build Your
            <br />
            Manufacturing
            <br />
            Career
          </h1>

          <p className="mt-4 max-w-xl text-lg text-slate-500">
            Explore careers in manufacturing and learn how to get started.
          </p>

          <div className="mt-6 grid gap-4">
            <Link href="/explore" className="card-link">
              <div className="card">
                <div className="card-title">Job Opportunities</div>
                <div className="card-sub">Discover different roles within manufacturing.</div>
              </div>
            </Link>

            <Link href="/explore" className="card-link">
              <div className="card">
                <div className="card-title">Required Training</div>
                <div className="card-sub">Find out what skills & certifications you need.</div>
              </div>
            </Link>

            <Link href="/quiz" className="card-link">
              <div className="card">
                <div className="card-title">Take an Interest Quiz</div>
                <div className="card-sub">Find your best match in manufacturing.</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Right: hero image */}
        <div className="relative">
          <div className="hero-image">
            <Image
              src="/images/hero.jpg"
              width={1200}
              height={900}
              priority
              alt="Students exploring a manufacturing lab"
            />
          </div>
        </div>
      </div>

      {/* Chat launcher */}
      <div className="mt-10">
        <ChatLauncher />
      </div>
    </section>
  );
}
