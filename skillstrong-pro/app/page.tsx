import Image from 'next/image';
import Link from 'next/link';
import ChatBar from '@/components/ChatBar';

export const metadata = {
  title: 'SkillStrong — Future-Proof Careers',
  description: 'Explore careers, training, and apprenticeships with a guided AI coach.',
};

// Keep this a Server Component (no "use client")
export default function Home() {
  return (
    <main className="page">
      <div className="container" style={{ paddingTop: 24 }}>
        <p className="muted" style={{ letterSpacing: '0.06em' }}>MANUFACTURING CAREERS</p>

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

        {/* 3 feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 760, marginTop: 20 }}>
          <Link href="/explore" className="card" style={{ display: 'block' }}>
            <div style={{ fontWeight: 800 }}>Job Opportunities</div>
            <div className="muted">Discover different roles within manufacturing.</div>
          </Link>

          <Link href="/explore?tab=training" className="card" style={{ display: 'block' }}>
            <div style={{ fontWeight: 800 }}>Required Training</div>
            <div className="muted">Find out what skills & certifications you need.</div>
          </Link>

          <Link href="/quiz" className="card" style={{ display: 'block', gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 800 }}>Take an Interest Quiz</div>
            <div className="muted">Find your best match in manufacturing.</div>
          </Link>
        </div>

        {/* hero image */}
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

        {/* chat bar (Client) – no handlers passed from server */}
        <div style={{ marginTop: 28 }}>
          <ChatBar />
        </div>
      </div>
    </main>
  );
}
