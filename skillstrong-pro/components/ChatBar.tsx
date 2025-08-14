'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function ChatBar({
  placeholder = 'Ask me anything about manufacturing careers…',
}: {
  placeholder?: string;
}) {
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = new FormData(e.currentTarget).get('q')?.toString().trim() ?? '';
    if (!input) return;
    router.push(`/explore?q=${encodeURIComponent(input)}`);
  }

  return (
    <form className="chatbar" onSubmit={onSubmit}>
      <input
        className="chatinput"
        name="q"
        placeholder={placeholder}
        autoComplete="off"
      />
      <button className="chatbtn" type="submit" aria-label="Send">→</button>
    </form>
  );
}
