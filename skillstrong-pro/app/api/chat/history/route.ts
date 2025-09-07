// /app/api/chat/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// ... (The GET function remains the same) ...
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at, provider')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching history:', error); // Added logging
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}


// POST a new conversation or update an existing one
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('API Error: User is not authenticated to save history.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, messages, provider, title } = await req.json();

  try {
    if (id) {
      // Update existing conversation
      const payload: { messages: any; provider?: string; title?: string } = { messages };
      if (provider) payload.provider = provider;
      if (title) payload.title = title;

      const { data, error } = await supabase
        .from('conversations')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, title, updated_at, provider')
        .single();
      
      if (error) throw error;
      return NextResponse.json(data);

    } else {
      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, messages, provider, title: title || 'New Conversation' })
        .select('id, title, updated_at, provider')
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error: any) {
    // THIS IS THE IMPORTANT PART
    console.error('Error saving conversation to DB:', error);
    return NextResponse.json({ error: error.message || 'Failed to save conversation.' }, { status: 500 });
  }
}
