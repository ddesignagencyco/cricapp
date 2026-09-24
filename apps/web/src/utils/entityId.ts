/** Sportradar ids use colons (`sr:competitor:1`). Keep `:` in query strings. */

export function decodeEntityId(raw: string | null | undefined): string {
  if (!raw) return '';
  let value = raw.trim();
  try {
    while (/%[0-9a-f]{2}/i.test(value)) {
      const next = decodeURIComponent(value);
      if (next === value) break;
      value = next;
    }
  } catch {
    value = raw.replace(/%3A/gi, ':');
  }
  return value;
}

export function encodeEntityId(id: string): string {
  return encodeURIComponent(decodeEntityId(id)).replace(/%3A/gi, ':');
}

/** Path segment for `/api/.../:id` so `:` is not read as another route token. */
export function entityIdPath(id: string): string {
  return encodeURIComponent(decodeEntityId(id));
}

export function withColonEntityQuery(
  searchParams: URLSearchParams,
  keys: string[] = ['a', 'b'],
): string {
  const kept = new Map<string, string>();
  for (const key of keys) {
    const value = decodeEntityId(searchParams.get(key));
    if (value) kept.set(key, value);
    searchParams.delete(key);
  }
  const rest = searchParams.toString();
  const parts: string[] = [];
  for (const [key, value] of kept) {
    parts.push(`${key}=${encodeEntityId(value)}`);
  }
  if (rest) parts.push(rest);
  return parts.join('&');
}
