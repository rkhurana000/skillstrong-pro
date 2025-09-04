// /lib/scorecard.ts
const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';

export const CIP4_NAMES: Record<string, string> = {
  // Manufacturing-relevant families we’re ingesting
  '4805': 'Precision Metal Working (Welding & Machining)',
  '1504': 'Electromechanical & Mechatronics Technology (Robotics)',
  '1506': 'Industrial / Manufacturing Production Technologies',
};

export function friendlyProgramTitle(cip4: string, apiTitle?: string | null) {
  if (apiTitle && apiTitle.trim()) return apiTitle.trim();
  const fam = CIP4_NAMES[cip4.replace(/\D/g, '')];
  return fam ? `${fam} — Certificate / AAS` : 'Manufacturing Technology — Certificate / AAS';
}

type ScorecardSchool = {
  id: number;
  'school.name': string;
  'school.city': string;
  'school.state': string;
  'school.school_url'?: string | null;
  'latest.programs.cip_4_digit.title'?: string | null;
  'latest.programs.cip_4_digit.code'?: string | null;
};

export type ScorecardQuery = {
  cip4: string;      // "4805"
  state?: string;    // "OH"
  perPage?: number;  // default 100
  pages?: number;    // default 2
};

function ensureKey() {
  const key = process.env.COLLEGE_SCORECARD_API_KEY;
  if (!key) throw new Error('Missing COLLEGE_SCORECARD_API_KEY');
  return key;
}

export async function fetchSchoolsByCIP4(q: ScorecardQuery) {
  const key = ensureKey();
  const cip4 = q.cip4.replace(/\D/g, '');
  const perPage = Math.min(q.perPage || 100, 100);
  const pages = q.pages ?? 2;

  const results: ScorecardSchool[] = [];
  for (let page = 0; page < pages; page++) {
    const url = new URL(BASE);
    url.searchParams.set('api_key', key);
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set(
      'fields',
      [
        'id',
        'school.name',
        'school.city',
        'school.state',
        'school.school_url',
        'latest.programs.cip_4_digit.title',
        'latest.programs.cip_4_digit.code',
      ].join(',')
    );
    url.searchParams.set('latest.programs.cip_4_digit.code', cip4);
    if (q.state) url.searchParams.set('school.state', q.state);
    url.searchParams.set('page', String(page));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Scorecard ${res.status}`);
    const json = (await res.json()) as { results: ScorecardSchool[] };
    if (!json.results?.length) break;
    results.push(...json.results);
    if (json.results.length < perPage) break;
  }
  return results;
}
