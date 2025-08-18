// /app/explore/page.tsx (Server Component Wrapper)
import { createClient } from '@/utils/supabase/server';
import ExploreClient from './ExploreClient';

export default async function ExplorePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialLocation: string | null = null;
  if (user) {
    // If user is logged in, get location from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('zip_code')
      .eq('id', user.id)
      .single();
    initialLocation = profile?.zip_code || null;
  }

  return <ExploreClient user={user} initialLocation={initialLocation} />;
}
