import { NextRequest, NextResponse } from 'next/server';
import { cseSearch, fetchReadable, templateQuery, Vertical } from '@/lib/search';
import { callGeminiJSON } from '@/lib/gemini';
import { cseSearch, fetchReadable, templateQuery, Vertical, type SearchItem } from '@/lib/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYS = `
You are a manufacturing careers guide. Synthesize from the provided sources only.
Return JSON:
{
  "answer_markdown": string,  // use headings, lists, short paragraphs (180–260 words)
  "citations": [{"title": string, "url": string}],
  "followups": [string],      // 3–6 natural next questions
  "images": [{"url": string, "caption"?: string}] // optional if any were provided
}
- Prefer BLS, O*NET, CareerOneStop, Apprenticeship.gov, *.edu
- Cite with [1], [2] markers in the markdown in order of the citations array.
- Do NOT hallucinate URLs. Use only the provided URLs.
`;
const context = pages
  .map((p: any, i: number) => `Source ${i + 1}: ${p.title}\nURL: ${p.url}\nContent:\n${p.text}\n---\n`)
  .join('\n');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const zip = searchParams.get('zip') || undefined;
  const action = (searchParams.get('action') || 'search_web') as Vertical;

  // 1) Search with good query templates
  const templated = templateQuery(action, q, zip);
  const res = await cseSearch(templated, 6);

  if (!res || !res.items?.length) {
    return NextResponse.json({
      answer_markdown: `I couldn't find sources right now. Try another query or check your internet keys.`,
      citations: [],
      followups: [`What roles match my interests?`, `Show certificates near me`, `What does it pay?`],
      images: []
    });
  }

  // 2) Scrape top 3 pages
const top = (res.items as SearchItem[]).slice(0, 3);
const pages = (
  await Promise.all(top.map((it: SearchItem) => fetchReadable(it.url)))
).filter(Boolean) as any[];

  // 3) Build context for Gemini
  const context = pages.map((p, i) =>
    `Source ${i+1}: ${p.title}\nURL: ${p.url}\nContent:\n${p.text}\n---\n`).join('\n');

  const prompt = `User query: ${q}\n\n${context}\n\nCreate the JSON as specified.`;

  const j = await callGeminiJSON(prompt, SYS);

  // 4) Shape output and pass through images from OG tags if Gemini didn't add any
  const images = Array.isArray(j.images) && j.images.length ? j.images :
    pages.filter(p => p.image).map((p: any) => ({ url: p.image, caption: p.title }));

  const citations = Array.isArray(j.citations) && j.citations.length
    ? j.citations
    : top.map(it => ({ title: it.title, url: it.url }));

  const followups = Array.isArray(j.followups) && j.followups.length
    ? j.followups
    : ['What does it pay?', 'Entry certifications', 'Apprenticeships near me'];

  return NextResponse.json({
    answer_markdown: j.answer_markdown || 'Here is a summary.',
    citations,
    followups,
    images
  });
}
