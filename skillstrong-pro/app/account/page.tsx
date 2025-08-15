// app/account/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Profile = { id: string; zip: string | null };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AccountPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [zip, setZip] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user ?? null;
      if (!mounted) return;

      setEmail(user?.email ?? null);
      setUserId(user?.id ?? null);

      if (user?.id) {
        // Try to load a profile row with a 'zip' column. If not present, we just ignore.
        const { data } = await supabase
          .from<Profile>("profiles")
          .select("id, zip")
          .eq("id", user.id)
          .maybeSingle();

        if (data?.zip) setZip(data.zip);
      }

      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    try {
      setSaving(true);
      setMessage(null);

      // Upsert into profiles (expects a 'zip' column).
      await supabase.from("profiles").upsert({ id: userId, zip: zip || null });

      setMessage("Saved ✔");
    } catch (err) {
      setMessage("Could not save ZIP.");
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    await supabase.auth.signOut();
    router.push("/"); // back to home after signout
  }

  return (
    <main className="page-shell account-page">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Account</h1>

      <div className="page-card p-6 mt-4">
        {loading ? (
          <div className="text-slate-600">Loading…</div>
        ) : (
          <form onSubmit={onSave}>
            <div className="text-slate-600">Signed in as</div>
            <div className="text-lg font-semibold text-slate-900">
              {email ?? "—"}
            </div>

            <label htmlFor="zip" className="mt-4 block font-medium text-slate-900">
              ZIP code (for nearby results)
            </label>
            <input
              id="zip"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 94582"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="actions pt-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className="rounded-xl border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
              >
                Sign out
              </button>

              {message && (
                <span className="text-sm text-slate-600">
                  {message}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
