// /lib/scorecard.ts
const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';

type ScorecardSchool = {
  id: number;
  'school.name': string;
  'school.city': string;
  'school.state': string;
  'latest.programs.cip_4_digit.title'?: string; // Returned when filtered by CIP
  'latest.programs.cip_4_digit.code'?: string;
};

export type ScorecardQuery = {
  cip4: string;             // e.g. "4805" (4-digit, digits only)
  state?: string;           // e.g. "CA"
  perPage?: number;         // default 100
  pages?: number;           // default 2 (200 rows per state)
};

function ensureKey() {
  const key = process.env.COLLEGE_SCORECARD_API_KEY;
  if (!key) throw new Error('Missing COLLEGE_SCORECARD_API_KEY');
  return key;
}

/** Fetch institutions offering a CIP 4-digit program, optionally filtered by state. */
export async function fetchSchoolsByCIP4(q: ScorecardQuery) {
  const key = ensureKey();
  const cip4 = q.cip4.replace(/\D/g, ''); // keep digits
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
        'latest.programs.cip_4_digit.title',
        'latest.programs.cip_4_digit.code',
      ].join(',')
    );
    url.searchParams.set('latest.programs.cip_4_digit.code', cip4); // e.g. 4805
    if (q.state) url.searchParams.set('school.state', q.state);
    url.searchParams.set('page', String(page));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Scorecard ${res.status}`);
    const json = (await res.json()) as { results: ScorecardSchool[] };
    if (!json.results?.length) break;
    results.push(...json.results);
    if (json.results.length < perPage) break; // last page
  }
  return results;
}
