import { NextRequest, NextResponse } from 'next/server';
import { generateFollowups, type Message } from '@/lib/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { messages, finalAnswer, location } = await req.json();

    const followups = await generateFollowups(
      messages as Message[],
      finalAnswer,
      location ?? undefined
    );

    return NextResponse.json({ followups });
  } catch (error) {
    console.error('Error generating followups:', error);
    return NextResponse.json({
      followups: [
        'Find local apprenticeships',
        'Explore training programs',
        'Compare typical salaries (BLS)',
      ],
    });
  }
}
