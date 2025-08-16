// /app/api/search/route.ts

import { NextResponse } from 'next/server';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export async function POST(req: Request) {
  const { query } = await req.json();

  const GOOGLE_API_KEY = process.env.GOOGLE_CSE_KEY;
  const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    return NextResponse.json(
      { error: 'Google Search API keys are not configured.' },
      { status: 500 }
    );
  }

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required.' }, { status: 400 });
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Search API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch search results.', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const results: SearchResult[] = data.items?.slice(0, 5).map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    })) || [];

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in search route:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
