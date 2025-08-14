// app/components/ChatLauncher.tsx
'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function ChatLauncher() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = `/explore?prompt=${encodeURIComponent(q.trim())}#coach`;
    router.push(next);
  }

  return (
    <form className="chatbar" onSubmit={onSubmit}>
      <input
        aria-label="Ask me anything about manufacturing careers"
        placeholder="Ask me anything about manufacturing careers…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="btn btn-primary" aria-label="Go to chat">
        →
      </button>
    </form>
  );
}
