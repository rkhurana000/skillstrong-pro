'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const goExplore = (preset?: string) => {
    const query = preset ?? q;
    const dest = query ? `/explore?q=${encodeURIComponent(query)}` : '/explore';
    router.push(dest);
  };

  const onAsk = (e: FormEvent) => {
    e.preventDefault();
    goExplore();
  };

  return (
    <main className="home">
      <nav className="home-topbar">
        <Link href="/" className="brand">MANUFACTURING CAREERS</Link>
        <div className="links">
          <Link href="/explore">Careers</Link>
          <Link href="/explore?q=training">Training</Link>
          <Link href="/about">About</Link>
          <Link href="/account" className="signin">Sign In</Link>
        </div>
      </nav>

      <section className="home-hero">
        <div className="col left">
          <h1 className="title">
            Build Your
            <br />
            Manufacturing
            <br />
            Career
          </h1>
          <p className="kicker">
            Explore careers in manufacturing and learn how to get started.
          </p>

          <div className="card-grid">
            <button
              className="info-card"
              onClick={() => goExplore('Explore by job types')}
              aria-label="Job Opportunities"
            >
              <div className="icn">⚙️</div>
              <div>
                <div className="card-h">Job Opportunities</div>
                <div className="card-p">Discover different roles within manufacturing.</div>
              </div>
            </button>

            <button
              className="info-card"
              onClick={() => goExplore('Explore by training length')}
              aria-label="Required Training"
            >
              <div className="icn">📚</div>
              <div>
                <div className="card-h">Required Training</div>
                <div className="card-p">Find out what skills & certifications you need.</div>
              </div>
            </button>

            <Link href="/quiz" className="info-card linklike" aria-label="Take an Interest Quiz">
              <div className="icn">✅</div>
              <div>
                <div className="card-h">Take an Interest Quiz</div>
                <div className="card-p">Find your best match in manufacturing.</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="col right">
          <div className="hero-img">
            <Image
              src="/hero.jpg"
              alt="Students in a manufacturing lab"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 600px"
            />
          </div>
        </div>
      </section>

      {/* bottom chat bar -> routes into /explore with the text as a query */}
      <form className="home-ask" onSubmit={onAsk}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask me anything about manufacturing careers…"
          aria-label="Ask a question"
        />
        <button type="submit" aria-label="Open coach with question">➤</button>
      </form>
    </main>
  );
}
