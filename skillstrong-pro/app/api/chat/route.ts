// /app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { orchestrate, type OrchestratorInput } from '@/lib/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OrchestratorInput & { provider?: string };
    const { messages, location } = body;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const { answer, followups } = await orchestrate({ messages, location: location ?? null });
    return NextResponse.json({ answer, followups });
  } catch {
    return NextResponse.json(
      { answer: "Sorry, I couldn't process that.", followups: [] },
      { status: 200 }
    );
  }
}
