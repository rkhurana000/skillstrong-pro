// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

// These MUST be set in Vercel env (and locally in .env)
// - NEXT_PUBLIC_SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY  (server-only secret)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL');
if (!serviceKey) throw new Error('Missing env SUPABASE_SERVICE_ROLE_KEY');

// Server/admin client: never expose the service key to the browser.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { 'X-Client-Info': 'skillstrong-admin' } },
});
