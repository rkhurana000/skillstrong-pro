// app/components/ChatLauncher.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChatLauncher() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/explore?chat=${encodeURIComponent(query)}` : "/explore");
  }

  return (
    <form className="chatbar" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Ask me anything about manufacturing careers…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Ask me anything about manufacturing careers"
      />
      <button type="submit" aria-label="Go">→</button>
    </form>
  );
}
