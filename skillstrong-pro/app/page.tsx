// app/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q')?.toString().trim() ?? '';
    if (!q) return;
    router.push(`/explore?q=${encodeURIComponent(q)}`);
  }

  return (
    <main className="page">
      <div className="container" style={{ paddingTop: 24 }}>
        <p className="muted" style={{ letterSpacing: '0.06em' }}>
          MANUFACTURING CAREERS
        </p>

        <h1 className="h1" style={{ marginTop: 8 }}>
          Build Your
          <br />
          Manufacturing
          <br />
          Career
        </h1>

        <p className="muted" style={{ maxWidth: 720, marginTop: 10 }}>
          Explore careers in manufacturing and learn how to get started.
        </p>

        {/* Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
            maxWidth: 760,
            marginTop: 20,
          }}
        >
          <Link href="/explore" className="card">
            <div style={{ fontWeight: 800 }}>Job Opportunities</div>
            <div className="muted">
              Discover different roles within manufacturing.
            </div>
          </Link>

          <Link href="/explore?tab=training" className="card">
            <div style={{ fontWeight: 800 }}>Required Training</div>
            <div className="muted">
              Find out what skills & certifications you need.
            </div>
          </Link>

          <Link href="/quiz" className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 800 }}>Take an Interest Quiz</div>
            <div className="muted">Find your best match in manufacturing.</div>
          </Link>
        </div>

        {/* Hero image */}
        <div style={{ position: 'relative', marginTop: 24 }}>
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: -290,
              width: '48%',
              maxWidth: 620,
              minWidth: 320,
            }}
          >
            <div className="card" style={{ padding: 0 }}>
              <Image
                src="/hero.jpg"
                alt="Students exploring manufacturing lab"
                width={1200}
                height={900}
                style={{ width: '100%', height: 'auto', borderRadius: 16 }}
                priority
              />
            </div>
          </div>
        </div>

        {/* Chat bar */}
        <div style={{ marginTop: 28 }}>
          <form className="chatbar" onSubmit={onSubmit}>
            <input
              className="chatinput"
              name="q"
              placeholder="Ask me anything about manufacturing careers…"
              autoComplete="off"
            />
            <button className="chatbtn" type="submit" aria-label="Send">
              →
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
