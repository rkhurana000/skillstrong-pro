// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Pull from env; fine if you haven’t set them yet — this still compiles.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Always export a client so importing pages compile.
// If env are missing, the client will simply fail on network calls at runtime.
export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anon || 'public-anon-key-placeholder'
);

export default supabase;
