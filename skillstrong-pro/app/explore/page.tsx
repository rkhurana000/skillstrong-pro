// /app/explore/page.tsx (Server Component Wrapper)
import { createClient } from '@/utils/supabase/server';
import ExploreClient from './ExploreClient';
import { cookies } from 'next/headers';

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

export default async function ExplorePage() {
  const supabase = createClient(cookies()); // Pass cookies for server-side auth
  const { data: { user } } = await supabase.auth.getUser();

  let history = [];
  if (user) {
    history = await getHistory(supabase, user.id);
  }

  return <ExploreClient user={user} history={history} />;
}
