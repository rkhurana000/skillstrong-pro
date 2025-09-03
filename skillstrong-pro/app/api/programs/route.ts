// /app/api/programs/route.ts
import { NextResponse } from 'next/server';
import { db, addProgram } from '@/lib/marketplace';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET() {
return NextResponse.json({ programs: db.programs });
}


export async function POST(req: Request) {
try {
const body = await req.json();
const program = addProgram(body);
return NextResponse.json({ program }, { status: 201 });
} catch (e) {
return NextResponse.json({ error: 'Invalid program payload' }, { status: 400 });
}
}
