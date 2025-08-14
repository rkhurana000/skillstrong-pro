// app/components/ChatLauncher.tsx
"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ChatLauncher({
  placeholder = "Ask me anything…",
}: {
  placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/explore?chat=${encodeURIComponent(query)}` : "/explore");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative flex items-center rounded-2xl border border-slate-200 bg-white shadow-sm pl-4 pr-2 py-2"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400 py-2"
      />
      <button
        type="submit"
        aria-label="Open the coach"
        className="ml-2 grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
      >
        →
      </button>
    </form>
  );
}
