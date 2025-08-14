'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  function goExplore(withQuery?: string) {
    const url = withQuery?.trim()
      ? `/explore?q=${encodeURIComponent(withQuery.trim())}`
      : '/explore';
    router.push(url);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    goExplore(prompt);
  }

  return (
    <main className="container">
      <section className="hero">
        {/* LEFT: copy */}
        <div className="hero-copy">
          <p className="hero-kicker">MANUFACTURING CAREERS</p>
          <h1 className="hero-title">
            Build Your
            <br />
            Manufacturing
            <br />
            Career
          </h1>

          <p className="hero-sub">
            Explore careers in manufacturing and learn how to get started.
          </p>

          {/* feature tiles */}
          <div className="tiles">
            <Link href="/explore?mode=jobs" className="tile card card--link">
              <div className="tile-icon" aria-hidden>⚙️</div>
              <div>
                <div className="tile-title">Job Opportunities</div>
                <div className="tile-sub">
                  Discover different roles within manufacturing.
                </div>
              </div>
            </Link>

            <Link href="/explore?mode=training" className="tile card card--link">
              <div className="tile-icon" aria-hidden>📚</div>
              <div>
                <div className="tile-title">Required Training</div>
                <div className="tile-sub">
                  Find out what skills &amp; certifications you need.
                </div>
              </div>
            </Link>

            <Link href="/quiz" className="tile card card--link">
              <div className="tile-icon" aria-hidden>✅</div>
              <div>
                <div className="tile-title">Take an Interest Quiz</div>
                <div className="tile-sub">
                  Find your best match in manufacturing.
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* RIGHT: hero image */}
        <div className="hero-media card">
          {/* If public/hero.jpg exists, this renders. If not, the soft bg still looks fine. */}
          <Image
            src="/hero.jpg"
            alt="Students exploring manufacturing lab"
            fill
            priority
            sizes="(max-width: 960px) 100vw, 560px"
            style={{ objectFit: 'cover', borderRadius: 16 }}
          />
        </div>

        {/* chat bar */}
        <form className="chatbar" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Ask me anything about manufacturing careers…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            aria-label="Ask a question"
          />
          <button type="submit" aria-label="Open the coach">
            <span>→</span>
          </button>
        </form>
      </section>
    </main>
  );
}
