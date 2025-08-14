"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChatLauncher() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/explore?chat=${encodeURIComponent(query)}` : "/explore");
  }

  return (
    <form className="chatbar flex items-center" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Ask me anything about manufacturing careers…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-slate-900 outline-none ring-0 focus:border-slate-400"
      />
      <button
        type="submit"
        aria-label="Go"
        className="ml-3 rounded-2xl bg-blue-600 px-5 py-4 text-white"
      >
        →
      </button>
    </form>
  );
}
