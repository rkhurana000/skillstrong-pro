// app/components/ChatLauncher.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';

export default function ChatLauncher({
  placeholder = 'Ask me anything about manufacturing careers…',
  buttonLabel = '→',
}: {
  placeholder?: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/explore?chat=${encodeURIComponent(query)}` : '/explore`);
  }

  return (
    <form className="chatbar" onSubmit={onSubmit}>
      <input
        className="chatbar-input"
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Ask me anything"
      />
      <button className="chatbar-send" type="submit" aria-label="Open chat">
        {buttonLabel}
      </button>
    </form>
  );
}
