// app/explore/page.tsx
import { redirect } from "next/navigation";

export default function Explore() {
  // Seamless: /explore now opens the coach (your chat) at /chat
  redirect("/chat");
}

export default function ExplorePage() {
  return (
    <main className="page-shell explore-page">
      <h1 className="text-sm tracking-[.2em] font-semibold text-slate-600">Manufacturing Career Explorer</h1>

      <section className="page-card mt-4 p-6">
        {/* your existing explore buttons/links stay exactly as they are */}
      </section>
    </main>
  );
}
