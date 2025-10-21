// rkhurana000/skillstrong-pro/skillstrong-pro-main/skillstrong-pro/lib/marketplace.ts
import { supabaseAdmin } from './supabaseServer';

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  description?: string;
  skills?: string[];
  pay_min?: number | null;
  pay_max?: number | null;
  apprenticeship?: boolean;
  external_url?: string | null;
  apply_url?: string | null;
  featured?: boolean;
  created_at?: string;
};

export type Program = {
  id: string;
  school: string;
  title: string;
  location: string;
  description?: string;
  length_weeks?: number | null;
  cost?: number | null;
  delivery?: 'in-person' | 'online' | 'hybrid';
  certs?: string[];
  start_date?: string | null;
  url?: string | null;
  external_url?: string | null;
  featured?: boolean;
  created_at?: string;
};

export type Featured = {
  id: string;
  kind: 'job' | 'program';
  ref_id: string;
  category_hint?: string | null;
  metro_hint?: string | null;
  created_at?: string;
};

export async function listJobs() {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Job[];
}

export async function addJob(input: Omit<Job, 'id' | 'created_at'>) {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Job;
}

export async function listPrograms() {
  const { data, error } = await supabaseAdmin
    .from('programs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Program[];
}

export async function addProgram(input: Omit<Program, 'id' | 'created_at'>) {
  const { data, error } = await supabaseAdmin
    .from('programs')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Program;
}

export async function addFeatured(input: Omit<Featured, 'id' | 'created_at'>) {
  const { data, error } = await supabaseAdmin
    .from('featured')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Featured;
}

export async function listFeatured(kind?: 'job' | 'program') {
  const q = supabaseAdmin.from('featured').select('*').order('created_at', { ascending: false });
  const { data, error } = kind ? await q.eq('kind', kind) : await q;
  if (error) throw error;
  return data as Featured[];
}

/** Find Featured items that loosely match the user's query/location. */
export async function findFeaturedMatching(query?: string, location?: string) {
  const q = (query || '').toLowerCase();
  const loc = (location || '').toLowerCase();

  const { data, error } = await supabaseAdmin.from('featured').select('*').limit(6);
  if (error) return [];

  const hits = (data || []).filter((f) => {
    const catOk = !f.category_hint || q.includes(String(f.category_hint).toLowerCase());
    const locOk = !f.metro_hint || loc.includes(String(f.metro_hint).toLowerCase());
    return catOk && locOk;
  });

  // resolve display info
  const resolved: Array<{ kind: 'job' | 'program'; title: string; org: string; location: string }> = [];
  for (const h of hits) {
    if (h.kind === 'job') {
      const { data: j } = await supabaseAdmin.from('jobs').select('*').eq('id', h.ref_id).single();
      if (j) resolved.push({ kind: 'job', title: j.title, org: j.company, location: j.location });
    } else {
      const { data: p } = await supabaseAdmin.from('programs').select('*').eq('id', h.ref_id).single();
      if (p) resolved.push({ kind: 'program', title: p.title, org: p.school, location: p.location });
    }
  }
  return resolved.slice(0, 3);
}

// --- NEW INTERNAL SEARCH FUNCTIONS ---

/**
 * Searches the internal 'jobs' table.
 */
export async function searchJobs(filters: { q?: string; location?: string; apprenticeship?: boolean; limit?: number }) {
  try {
    let query = supabaseAdmin.from('jobs').select('*');
    if (filters.q) {
      query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
    }
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters.apprenticeship) {
      query = query.eq('apprenticeship', true);
    }
    query = query.order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(filters.limit || 3);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Job[];
  } catch (error) {
    console.error("Error searching internal jobs:", error);
    return [];
  }
}

/**
 * Searches the internal 'programs' table.
 */
export async function searchPrograms(filters: { q?: string; location?: string; limit?: number }) {
  try {
    let queryBuilder = supabaseAdmin.from("programs").select("title, school, location, url, external_url");
    
    if (filters.q) {
      queryBuilder = queryBuilder.or(`school.ilike.%${filters.q}%,title.ilike.%${filters.q}%`);
    }
    
    if (filters.location) {
      const loc = filters.location;
      if (loc.includes(',') && loc.split(',').map(s => s.trim()).filter(Boolean).length === 2) {
          const parts = loc.split(',').map(s => s.trim());
          const city = parts[0];
          const stateAbbr = parts[1];
          if (city && stateAbbr && stateAbbr.length === 2 && stateAbbr === stateAbbr.toUpperCase()) {
              queryBuilder = queryBuilder.ilike('city', `%${city}%`).eq('state', stateAbbr);
          } else {
              queryBuilder = queryBuilder.or(`city.ilike.%${loc}%,metro.ilike.%${loc}%`);
          }
      } else {
          queryBuilder = queryBuilder.or(`city.ilike.%${loc}%,metro.ilike.%${loc}%,zip_code.eq.${loc}%`);
      }
    }
    
    queryBuilder = queryBuilder.order('featured', { ascending: false }).limit(filters.limit || 3);
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []) as Partial<Program>[];
  } catch (error) {
    console.error("Error searching internal programs:", error);
    return [];
  }
}
