// /app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { addJob } from '@/lib/marketplace'; // Keep addJob for POST
import { supabaseAdmin } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || undefined;
    const city = searchParams.get('city')?.trim() || undefined; // city param
    const state = searchParams.get('state')?.trim() || undefined; // state param

    console.log(`Job Search Params: q='${q}', city='${city}', state='${state}'`); // Logging

    let query = supabaseAdmin.from('jobs').select('*');

    // Keyword search (unchanged)
    if (q) {
      // Search across title, company, description, and skills array
      query = query.or(`title.ilike.%${q}%,company.ilike.%${q}%,description.ilike.%${q}%,skills.cs.{${q}}`); // Use contains for skills array
    }

    // --- UPDATED Location Filtering ---
    let locationFilterApplied = false; // Keep track if state filter is active

    // 1. Apply State Filter (Case-Insensitive Ends With)
    if (state && state !== 'All States') {
        // Use ilike with a pattern that matches ", ST" or " ST" at the end, case-insensitive.
        // This handles "City, ST" and potentially "City ST" if comma is missing but space exists.
        // It's generally safer to assume the comma exists for structure.
        // Pattern: Matches any characters (%), followed by an optional comma (,), optional space (\s*),
        // followed by the state abbreviation, ending the string ($). Case-insensitive (ilike).
        // Supabase `like`/`ilike` uses PostgreSQL patterns where % is wildcard. $ is not end anchor here.
        // We need to match ", ST" at the end. The most reliable pattern is `%, ${state}` assuming consistent format.
        query = query.ilike('location', `%, ${state}`); // Case-insensitive LIKE for ", ST" ending
        console.log(`Applied state filter: location ILIKE '%, ${state}'`);
        locationFilterApplied = true;
    }

    // 2. Apply City Filter (Case-Insensitive Starts With) - This is chained (AND)
    if (city) {
        // Match "City," or "City ," case-insensitive at the beginning
        query = query.ilike('location', `${city},%`);
        console.log(`Applied city filter: location ILIKE '${city},%'`);
    }
    // --- END UPDATED Location Filtering ---


    query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });

    const { data, error, count } = await query; // Added count for logging

    if (error) {
        console.error("Supabase job search error:", error);
        throw error;
    }
    console.log(`Job search successful: Found ${count ?? 'unknown'} results.`); // Logging count

    return NextResponse.json({ jobs: data || [] }); // Return empty array if data is null
  } catch (e: any) {
    console.error("Job search API error:", e);
    return NextResponse.json({ error: e.message || 'Failed to load jobs' }, { status: 500 });
  }
}

// POST function remains the same for adding jobs
export async function POST(req: Request) {
     try {
       const body = await req.json();
        // Basic validation
       if (!body.title || !body.company || !body.location) {
            throw new Error('Title, Company, and Location are required.');
       }
       const job = await addJob({
         title: body.title,
         company: body.company,
         location: body.location, // Keep location string for adding jobs
         description: body.description || undefined,
         skills: Array.isArray(body.skills) ? body.skills.filter(Boolean) : [],
         pay_min: typeof body.payMin === 'number' && !isNaN(body.payMin) ? body.payMin : null,
         pay_max: typeof body.payMax === 'number' && !isNaN(body.payMax) ? body.payMax : null,
         apprenticeship: !!body.apprenticeship,
         external_url: body.externalUrl || null,
         apply_url: body.applyUrl || null,
         featured: !!body.featured,
       });
       return NextResponse.json({ job }, { status: 201 });
     } catch (e: any) {
       console.error("Error adding job:", e);
       return NextResponse.json({ error: e.message || 'Invalid job payload' }, { status: 400 });
     }
}
