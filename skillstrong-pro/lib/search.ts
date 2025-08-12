// lib/search.ts
import * as cheerio from 'cheerio';

const CSE_ID = process.env.GOOGLE_CSE_ID || '';
const CSE_KEY = process.env.GOOGLE_CSE_KEY || '';

export type SearchItem = { title: string; url: string; snippet: string };
export type Vertical =
  | 'search_web'
  | 'search_training'
  | 'search_jobs'
  | 'pay'
  | 'outlook';

function near(zip?: string) {
  return zip ? ` near ${zip}` : '';
}

/** Opinionated query templates that bias to authoritative sites */
export function templateQuery(action: Vertical, base: string, zip?: string) {
  const n = near(zip);
  if (action === 'search_training') {
    // certs, community colleges, apprenticeships
    return `(${base}) (certificate OR training OR apprenticeship) (${zip || ''}) site:*.edu OR site:careeronestop.org OR site:apprenticeship.gov`;
  }
  if (action === 'search_jobs') {
    return `"${base}" job openings${n} site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs`;
  }
  if (action === 'pay') {
    return `${base} wages OR salary site:bls.gov/ooh OR site:onetonline.org`;
  }
  if (action === 'outlook') {
    return `${base} employment outlook site:bls.gov/ooh OR site:onetonline.org`;
  }
  // general, bias to gov/edu/resources
  return `${base} site:bls.gov OR site:onetonline.org OR site:careeronestop.org`;
}

export async function cseSearch(
  q: string,
  num = 6
): Promise<{ items: SearchItem[] } | null> {
  if (!CSE_ID || !CSE_KEY) return null;
  const url = `https://www.googleapis.com/customsearch/v1?key=${CSE_KEY}&cx=${CSE_ID}&num=${num}&q=${encodeURIComponent(
    q
  )}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const items: SearchItem[] = (j.items || []).map((it: any) => ({
    title: it.title,
    url: it.link,
    snippet: it.snippet,
  }));
  return { items };
}

/** Fetch page and extract readable text with Cheerio (no extra deps) */
export async function fetchReadable(url: string) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 SkillStrongBot' },
    });
    if (!r.ok) return null;
    const html = await r.text();
    const $ = cheerio.load(html);

    // Basic clean up: remove obvious chrome
    $('script, style, nav, footer, noscript').remove();

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').first().text() ||
      url;

    const ogImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="og:image"]').attr('content') ||
      '';

    // Prefer main/article if present; fallback to body text
    const mainText =
      $('main').text().trim() ||
      $('article').text().trim() ||
      $('body').text().trim();

    // Normalize whitespace and trim to a sane size
    const text = mainText
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const trimmed = text.split('\n').filter(Boolean).slice(0, 300).join('\n');

    return { title, url, text: trimmed, image: ogImage };
  } catch {
    return null;
  }
}
