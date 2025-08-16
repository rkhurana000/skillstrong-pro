// /app/explore/ExploreClient.tsx
'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js'; // Import User type
// ... other imports

// Accept the user object as a prop
export default function ExploreClient({ user }: { user: User | null }) {
  const router = useRouter();
  // ... all other state and functions are the same as before

  const sendMessage = async (query: string, chatId: string | null) => {
    // --- NEW: CHECK FOR USER BEFORE SENDING ---
    if (!user) {
      router.push('/account?message=Please sign up or sign in to start a chat.');
      return;
    }

    if (isLoading || !chatId) return;
    // ... the rest of the sendMessage function is the same as before
  };
  
  // ... rest of the component
}
