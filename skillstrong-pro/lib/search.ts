import * as cheerio from 'cheerio';
import { htmlToText } from 'html-to-text';

const CSE_ID = process.env.GOOGLE_CSE_ID!;
const CSE_KEY = process.env.GOOGLE_CSE_KEY!;

export type Vertical = 'search_web'|'search_training'|'search_jobs'|'pay'|'outlook';

function near(zip?: string) { return zip ? ` near ${zip}` : ''; }

/** Opinionated query templates that bias to authoritative sites */
export function templateQuery(action: Vertical, base: string, zip?: string) {
  const n = near(zip);
  if (action === 'search_training') {
    // certs, community colleges, apprenticeships
    return `(${base}) (certificate OR training OR apprenticeship) (${zip||''}) site:*.edu OR site:careeronestop.org OR site:apprenticeship.gov`;
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

export async function cseSearch(q: string, num = 6) {
  if (!CSE_ID || !CSE_KEY) return null;
  const url = `https://www.googleapis.com/customsearch/v1?key=${CSE_KEY}&cx=${CSE_ID}&num=${num}&q=${encodeURIComponent(q)}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const items = (j.items || []).map((it: any) => ({
    title: it.title, url: it.link, snippet: it.snippet
  }));
  return { items };
}

export async function fetchReadable(url: string) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 SkillStrongBot' } });
    if (!r.ok) return null;
    const html = await r.text();
    const $ = cheerio.load(html);
    const title = $('title').first().text() || url;
    const og = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content') || '';
    const text = htmlToText(html, {
      wordwrap: 0,
      selectors: [
        { selector: 'nav', format: 'skip' },
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: 'footer', format: 'skip' },
      ],
    });
    // Trim to a sane size for prompting
    const trimmed = text.split('\n').filter(Boolean).slice(0, 300).join('\n');
    return { title, url, text: trimmed, image: og };
  } catch { return null; }
}
