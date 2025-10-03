// /lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Standardized to KEY

if (!url || !serviceKey) {
    throw new Error('Missing Supabase URL or Service Role Key for server-side client.');
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { 
    persistSession: false, 
    autoRefreshToken: false 
  },
  global: { headers: { 'X-Client-Info': 'skillstrong-pro-server' } },
});
