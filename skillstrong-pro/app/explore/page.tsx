// /app/explore/page.tsx (New server component wrapper)
import { createClient } from '@/utils/supabase/server';
import ExploreClient from './ExploreClient'; // Import the component you just renamed

export default async function ExplorePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pass the user object (or null if not logged in) as a prop
  return <ExploreClient user={user} />;
}
