// /app/api/programs/trends/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: programs, error } = await supabaseAdmin
      .from('programs')
      .select('title, metro, program_type')
      .limit(2000);

    if (error) throw error;

    // Aggregate top program titles
    const titleCounts: Record<string, number> = {};
    programs.forEach(({ title }) => {
      if (title) titleCounts[title] = (titleCounts[title] || 0) + 1;
    });
    const topTitles = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(item => item[0]);

    // Aggregate top metro areas
    const metroCounts: Record<string, number> = {};
    programs.forEach(({ metro }) => {
        if (metro) metroCounts[metro] = (metroCounts[metro] || 0) + 1;
    });
    const topMetros = Object.entries(metroCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(item => item[0]);

    // Aggregate top program types
    const typeCounts: Record<string, number> = {};
    programs.forEach(({ program_type }) => {
        if (program_type) typeCounts[program_type] = (typeCounts[program_type] || 0) + 1;
    });
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(item => item[0]);

    return NextResponse.json({
      inDemandPrograms: topTitles,
      popularLocations: topMetros,
      trendingFields: topTypes,
    });

  } catch (e: any) {
    console.error("Error fetching program trends:", e);
    return NextResponse.json({ error: e.message || 'Failed to fetch trends' }, { status: 500 });
  }
}
