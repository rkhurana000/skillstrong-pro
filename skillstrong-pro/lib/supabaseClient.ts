// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Export both named and default for compatibility with existing imports
export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anon || 'public-anon-key-placeholder'
);

export default supabase;
