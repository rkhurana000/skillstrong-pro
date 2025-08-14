// app/page.tsx  (no "use client" here)
import Image from 'next/image';
import Link from 'next/link';
import ChatLauncher from './components/ChatLauncher';

export const metadata = {
  title: 'SkillStrong — Future-Proof Careers',
  description:
    'Explore careers, training, and apprenticeships with a guided AI coach.',
};

export default function HomePage() {
  return (
    <main>
      {/* …your hero text/cards… */}
      <ChatLauncher />
      <Image src="/hero.jpg" alt="Students exploring manufacturing lab" width={960} height={720} priority />
    </main>
  );
}
