import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function templateQuery(action: string, base: string, zip?: string) {
  const near = zip ? ` near ${zip}` : '';
  if (action === 'search_training') {
    return `${base} certificate OR training OR apprenticeship${near}`;
  }
  if (action === 'search_jobs') {
    return `${base} job openings${near}`;
  }
  // default generic web search
  return `${base}${near}`;
}

async function searchViaGoogleCSE(q: string) {
  const id = process.env.GOOGLE_CSE_ID;
  const key = process.env.GOOGLE_CSE_KEY;
  if (!id || !key) return null;
  const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${id}&q=${encodeURIComponent(q)}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const items = (j.items || []).map((it: any) => ({
    title: it.title,
    url: it.link,
    snippet: it.snippet,
  }));
  return { items };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const action = searchParams.get('action') || 'search_web';
  const zip = searchParams.get('zip') || undefined;

  const templated = templateQuery(action, q, zip);
  let data = await searchViaGoogleCSE(templated);

  if (!data) {
    // Fallback set (useful if CSE keys aren’t set yet)
    data = {
      items: [
        { title: 'Apprenticeship.gov — Find Apprenticeships', url: 'https://www.apprenticeship.gov/', snippet: 'Search registered apprenticeships by occupation and location.' },
        { title: 'CareerOneStop Training Finder', url: 'https://www.careeronestop.org/FindTraining', snippet: 'Find programs and certifications in your state.' },
        { title: 'Nearby Community Colleges — Google Maps', url: 'https://www.google.com/maps/search/community+college', snippet: 'Local colleges offering technical certificates.' },
      ],
    };
  }
  return NextResponse.json(data);
}
