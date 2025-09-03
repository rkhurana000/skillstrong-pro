// /lib/cse.ts
type CSEItem = { title: string; link: string; snippet?: string; displayLink?: string };

export async function cseSearch(q: string, num = 10) {
  const key = process.env.GOOGLE_CSE_KEY || process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) throw new Error('Missing Google CSE env (GOOGLE_CSE_KEY/GOOGLE_CSE_ID)');

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', q);
  url.searchParams.set('num', String(Math.min(10, num)));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`CSE ${res.status}`);
  const json = await res.json();
  return (json.items || []) as CSEItem[];
}
