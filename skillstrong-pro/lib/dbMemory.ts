// /lib/dbMemory.ts
// Ephemeral in-memory store (survives until serverless cold start)
export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  payMin?: number;
  payMax?: number;
  apprenticeship?: boolean;
  createdAt: string;
  featured?: boolean;
};

export type Program = {
  id: string;
  school: string;
  title: string;
  location: string;
  description?: string;
  lengthWeeks: number;
  cost?: number;
  delivery: 'in-person' | 'online' | 'hybrid';
  certs: string[];
  startDate?: string;
  url?: string;
  createdAt: string;
  featured?: boolean;
};

export type Featured = {
  id: string;
  kind: 'job' | 'program';
  refId: string; // id of job/program
  categoryHint?: string; // e.g., "CNC Machinist"
  metroHint?: string;    // e.g., "Cleveland"
  createdAt: string;
};

const g = globalThis as any;
if (!g.__skillstrong_db) {
  g.__skillstrong_db = {
    jobs: [] as Job[],
    programs: [] as Program[],
    featured: [] as Featured[],
  };
}
export const db = g.__skillstrong_db as {
  jobs: Job[];
  programs: Program[];
  featured: Featured[];
};

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}
