/** Match user phrasing ("Babar Azam") to Sportradar "Last, First" rows in Postgres. */

export function playerNameSearchVariants(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const variants = new Set<string>([q]);
  if (q.includes(',')) {
    const [last, first] = q.split(',').map((s) => s.trim());
    if (first && last) variants.add(`${first} ${last}`);
  } else {
    const parts = q.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      variants.add(`${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`);
      variants.add(parts[parts.length - 1]!);
      variants.add(parts[0]!);
    }
  }
  return [...variants];
}

export function normalizePlayerNameForMatch(name: string): string {
  const trimmed = name.trim();
  if (trimmed.includes(',')) {
    const [last, first] = trimmed.split(',').map((s) => s.trim());
    if (first && last) return `${first} ${last}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export function pickPlayerIdFromCandidates(
  candidates: Array<{ id: string; fullName: string }>,
  query: string,
): string | null {
  if (!candidates.length) return null;
  const target = normalizePlayerNameForMatch(query);
  const exact = candidates.find((c) => normalizePlayerNameForMatch(c.fullName) === target);
  if (exact) return exact.id;
  if (candidates.length === 1) return candidates[0]!.id;
  const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = candidates
    .map((c) => {
      const name = c.fullName.toLowerCase();
      const hits = queryTokens.filter((t) => name.includes(t)).length;
      return { id: c.id, hits };
    })
    .sort((a, b) => b.hits - a.hits);
  return scored[0]?.hits ? scored[0].id : candidates[0]!.id;
}
