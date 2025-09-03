// /lib/marketplace.ts
import { db, Job, Program, Featured } from './dbMemory';

export { db } from './dbMemory';
export type { Job, Program, Featured } from './dbMemory';

export function addJob(input: Omit<Job, 'id' | 'createdAt'>): Job {
  const job: Job = { ...input, id: uid('job'), createdAt: new Date().toISOString() } as Job;
  db.jobs.unshift(job);
  return job;
}

export function addProgram(input: Omit<Program, 'id' | 'createdAt'>): Program {
  const program: Program = { ...input, id: uid('prg'), createdAt: new Date().toISOString() } as Program;
  db.programs.unshift(program);
  return program;
}

export function addFeatured(input: Omit<Featured, 'id' | 'createdAt'>): Featured {
  const item: Featured = { ...input, id: uid('feat'), createdAt: new Date().toISOString() } as Featured;
  db.featured.unshift(item);
  return item;
}

export function findFeaturedMatching(query?: string, location?: string) {
  const q = (query || '').toLowerCase();
  const loc = (location || '').toLowerCase();
  const hits = db.featured.filter((f) => {
    const catOk = !f.categoryHint || q.includes(f.categoryHint.toLowerCase());
    const locOk = !f.metroHint || loc.includes(f.metroHint.toLowerCase());
    return catOk && locOk;
  }).slice(0, 3);

  const expanded = hits.map((h) => {
    if (h.kind === 'job') {
      const j = db.jobs.find((x) => x.id === h.refId);
      return j ? { kind: 'job' as const, title: j.title, org: j.company, location: j.location } : null;
    } else {
      const p = db.programs.find((x) => x.id === h.refId);
      return p ? { kind: 'program' as const, title: p.title, org: p.school, location: p.location } : null;
    }
  }).filter(Boolean) as Array<{ kind: 'job' | 'program'; title: string; org: string; location: string }>;

  return expanded;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}
