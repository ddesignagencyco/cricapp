/** Map casual cricket phrasing to searchable team names / abbreviations. */

const TEAM_QUERY_ALIASES: Record<string, string[]> = {
  ind: ['IND', 'India'],
  india: ['India', 'IND'],
  pak: ['PAK', 'Pakistan'],
  pakistan: ['Pakistan', 'PAK'],
  eng: ['ENG', 'England'],
  england: ['England', 'ENG'],
  aus: ['AUS', 'Australia'],
  australia: ['Australia', 'AUS'],
  afg: ['AFG', 'Afghanistan'],
  afghanistan: ['Afghanistan', 'AFG'],
  sl: ['SRI', 'Sri Lanka'],
  'sri lanka': ['Sri Lanka', 'SRI'],
  nz: ['NZL', 'New Zealand'],
  'new zealand': ['New Zealand', 'NZL'],
  sa: ['RSA', 'South Africa'],
  'south africa': ['South Africa', 'RSA'],
  lahore: ['Lahore Qalandars', 'LQ'],
  karachi: ['Karachi Kings', 'KK'],
  islamabad: ['Islamabad United', 'IU'],
  multan: ['Multan Sultans', 'MS'],
  peshawar: ['Peshawar Zalmi', 'PZ', 'PZA'],
  quetta: ['Quetta Gladiators', 'QG'],
  rawalpindi: ['Rawalpindi Raiders', 'RR'],
  hyderabad: ['Hyderabad', 'HKB'],
};

export function teamNameSearchVariants(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const key = q.toLowerCase();
  const variants = new Set<string>([q]);
  for (const alias of TEAM_QUERY_ALIASES[key] ?? []) {
    variants.add(alias);
  }
  return [...variants];
}

export function scoreTeamCandidate(
  query: string,
  team: { id: string; name: string; abbr: string; country?: string | null },
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const abbr = team.abbr.toLowerCase();
  const name = team.name.toLowerCase();
  const country = (team.country ?? '').toLowerCase();

  // What the user actually typed outranks a match through an alias. Otherwise "Pakistan"
  // (alias PAK) scored "Pakistan Legends" (abbr PAK) at 100, above the team literally
  // named "Pakistan" at 98, and the assistant answered for the wrong side.
  if (abbr === q) return 100;
  if (name === q) return 100;

  for (const variant of teamNameSearchVariants(query)) {
    const v = variant.toLowerCase();
    if (v === q) continue;
    if (name === v) return 96;
    if (abbr === v) return 94;
    if (country === v) return 92;
  }

  if (q.length >= 4 && name.startsWith(q)) return 75;
  if (q.length >= 4 && name.includes(q)) return 55;

  // Short tokens: avoid "ind" matching inside "Rawalpindi" / random franchises.
  if (q.length <= 3) {
    if (abbr === q) return 100;
    if (name.startsWith(q)) return 60;
    if (name.includes(q)) return 8;
    if (abbr.includes(q)) return 15;
    return 0;
  }

  if (abbr.includes(q)) return 25;
  return 0;
}

export function pickTeamIdFromCandidates(
  query: string,
  candidates: Array<{ id: string; name: string; abbr: string; country?: string | null }>,
): string | null {
  if (!candidates.length) return null;
  const scored = candidates
    .map((c) => ({ id: c.id, score: scoreTeamCandidate(query, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  if (scored.length >= 2 && scored[0]!.score === scored[1]!.score) return null;
  if (scored[0]!.score < 20) return null;
  return scored[0]!.id;
}

/**
 * The ids sharing the best score when that score is a tie, e.g. the men's and women's
 * national sides, which are both stored as "Pakistan" / "PAK". `pickTeamIdFromCandidates`
 * returns null for a tie; this tells the caller which teams to break it between.
 */
export function tiedTopTeamIds(
  query: string,
  candidates: Array<{ id: string; name: string; abbr: string; country?: string | null }>,
): string[] {
  const scored = candidates
    .map((c) => ({ id: c.id, score: scoreTeamCandidate(query, c) }))
    .filter((x) => x.score >= 20)
    .sort((a, b) => b.score - a.score);
  if (scored.length < 2 || scored[0]!.score !== scored[1]!.score) return [];
  return scored.filter((x) => x.score === scored[0]!.score).map((x) => x.id);
}

/** "Pakistan women", "England Women's", "India (W)". */
export const WOMEN_TEAM_RE = /\bwom[ae]n(?:'s)?(?![a-z])|\(w\)/i;

export function withoutWomenMarker(query: string): string {
  return query.replace(new RegExp(WOMEN_TEAM_RE.source, 'gi'), ' ').replace(/\s+/g, ' ').trim();
}

const TEAM_NAME_HINT =
  /\b(lahore|karachi|islamabad|multan|peshawar|quetta|qalandars|kings|united|sultans|zalmi|gladiators|india|pakistan|england|australia|afghanistan|zimbabwe|bangladesh|windies|west indies|rawalpindi|hyderabad|kingsmen|pindiz|raiders|stars)\b/i;

const NATIONAL_OR_FRANCHISE_SHORT = new Set(
  Object.keys(TEAM_QUERY_ALIASES).filter((k) => k.length <= 3 || k.includes(' ')),
);

/** "babar vs rizwan" → players; "ind vs pak" → teams. */
export function looksLikePlayerVersusQuery(teamAQuery: string, teamBQuery: string): boolean {
  const ak = teamAQuery.trim().toLowerCase();
  const bk = teamBQuery.trim().toLowerCase();
  if (NATIONAL_OR_FRANCHISE_SHORT.has(ak) || NATIONAL_OR_FRANCHISE_SHORT.has(bk)) return false;
  if (TEAM_NAME_HINT.test(teamAQuery) || TEAM_NAME_HINT.test(teamBQuery)) return false;
  const a = teamAQuery.trim();
  const b = teamBQuery.trim();
  if (!a || !b) return false;
  if (a.split(/\s+/).length > 3 || b.split(/\s+/).length > 3) return false;
  if (/^(sr:|sr:competitor:|sr:team:)/i.test(a) || /^(sr:|sr:competitor:|sr:team:)/i.test(b)) {
    return false;
  }
  return true;
}
