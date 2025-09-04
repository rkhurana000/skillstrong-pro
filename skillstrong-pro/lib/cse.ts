// /lib/cse.ts
export type CSEItem = {
  title: string;
  link: string;
  displayLink?: string;
  snippet?: string;
};

function getKeys() {
  const cx = process.env.GOOGLE_CSE_ID;
  const key = process.env.GOOGLE_CSE_KEY;
  if (!cx || !key) throw new Error('Missing GOOGLE_CSE_ID or GOOGLE_CSE_KEY');
  return { cx, key };
}

export async function cseSearch(query: string, num = 5): Promise<CSEItem[]> {
  const { cx, key } = getKeys();
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(Math.min(num, 10)));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`CSE ${res.status}`);
  const json = await res.json();
  return (json.items || []).map((i: any) => ({
    title: i.title,
    link: i.link,
    displayLink: i.displayLink,
    snippet: i.snippet,
  }));
}

export async function cseSearchMany(queries: string[], perQuery = 4) {
  const results: CSEItem[] = [];
  for (const q of queries) {
    try {
      const items = await cseSearch(q, perQuery);
      results.push(...items);
      await new Promise(r => setTimeout(r, 400)); // be nice to CSE
    } catch {
      // ignore per-query errors
    }
  }
  return results;
}
