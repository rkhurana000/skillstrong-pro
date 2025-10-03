// /app/api/programs/filters/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const PREFERRED_METROS = [
    'Bay Area, CA', 'Los Angeles, CA', 'San Diego, CA', 'Phoenix, AZ', 'Tucson, AZ', 'Denver, CO',
    'Dallas–Fort Worth, TX', 'Houston, TX', 'Austin, TX', 'Seattle, WA', 'Portland, OR',
    'Chicago, IL', 'Detroit, MI', 'Columbus, OH', 'Boston, MA', 
    'New York City, NY', 'Philadelphia, PA', 'Atlanta, GA', 'Miami, FL',
];

export async function GET() {
  try {
    // This query fetches every unique location from your programs table
    const { data, error } = await supabaseAdmin.from('programs').select('location');

    if (error) throw error;

    // We use a Set to get a list of unique locations, and filter out any null/empty ones.
    const uniqueLocations = Array.from(new Set(data.map(p => p.location).filter(Boolean)));
    
    // We can still give preference to our main metro areas to control the order
    const sortedLocations = PREFERRED_METROS.filter(metro => uniqueLocations.includes(metro));

    return NextResponse.json({ metros: sortedLocations });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch filters' }, { status: 500 });
  }
}
