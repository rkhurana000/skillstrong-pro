// /app/chat/page.tsx
import { createClient } from '@/utils/supabase/server';
import ChatClient from './ChatClient';

async function getHistory(supabase: any, userId: string) {
    const { data, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at, provider')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching history:", error);
        return [];
    }
    return data;
}

export default async function ChatPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let history = [];
  if (user) {
    history = await getHistory(supabase, user.id);
  }

  // This component now passes the user and their history to the ChatClient
  return <ChatClient user={user} initialHistory={history} />;
}
