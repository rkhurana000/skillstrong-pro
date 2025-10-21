// /app/api/chat/history/clear/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('API Error: User is not authenticated to clear history.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Delete all conversations for the current user
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', user.id); // IMPORTANT: Only delete for the logged-in user

    if (error) {
      console.error('Error deleting conversations from DB:', error);
      throw error; // Let the catch block handle it
    }

    console.log(`Cleared history for user: ${user.id}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error clearing history:', error);
    return NextResponse.json({ error: error.message || 'Failed to clear history.' }, { status: 500 });
  }
}
