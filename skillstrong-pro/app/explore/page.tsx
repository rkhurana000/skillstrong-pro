// /app/explore/page.tsx (Server Component Wrapper)
import { createClient } from '@/utils/supabase/server';
import ExploreClient from './ExploreClient';

export default async function ExplorePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <ExploreClient user={user} />;
}
