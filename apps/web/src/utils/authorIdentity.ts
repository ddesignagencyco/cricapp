/**
 * Author identity is keyed on a byline string the admin types by hand, so the same
 * person can easily end up with two profiles ("Shad" and "Umair shad" both exist).
 * The merge itself belongs in the API (see docs/proposals/author-identity-backend.md);
 * this only warns the admin before a duplicate row is created.
 */

export interface AuthorNameRef {
  id: string;
  name: string;
  slug?: string;
}

/** Lowercase, strip punctuation, collapse whitespace. */
function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(' ').filter(Boolean));
}

/** True when one token set contains the other, in either direction. */
function isSubsetOf(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  return [...small].every((token) => large.has(token));
}

/** Mirrors the API's slugify so slug collisions are caught on the client too. */
export function authorSlug(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');
}

export type DuplicateReason = 'slug' | 'name' | 'overlap';

/**
 * Finds existing authors that look like the same person as `name`.
 *
 * - `slug`  : same generated slug — the API will reject this anyway.
 * - `name`  : same normalised name, where the stored row has no usable slug.
 * - `overlap`: one name's tokens are a subset of the other's, in either
 *             direction ("shad" / "Umair shad"). This is the case that actually
 *             slips through today.
 */
export function findSimilarAuthors(
  name: string,
  existing: AuthorNameRef[],
  ignoreId?: string
): { author: AuthorNameRef; reason: DuplicateReason }[] {
  const target = normalize(name);
  if (!target) return [];

  const targetTokens = tokens(name);
  const slug = authorSlug(name);
  const found: { author: AuthorNameRef; reason: DuplicateReason }[] = [];

  for (const author of existing) {
    if (ignoreId && author.id === ignoreId) continue;

    let reason: DuplicateReason | null = null;
    if (slug && author.slug === slug) reason = 'slug';
    else if (normalize(author.name) === target) reason = 'name';
    else if (isSubsetOf(tokens(author.name), targetTokens)) reason = 'overlap';

    if (reason) found.push({ author, reason });
  }

  return found;
}

/** Human-readable summary for the create/update guard. */
export function describeDuplicates(matches: { author: AuthorNameRef; reason: DuplicateReason }[]): string {
  if (matches.length === 0) return '';
  const names = matches.map((match) => match.author.name);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `An author close to "${list}" already exists. Publish under that profile, or delete the unused one, to avoid a duplicate byline.`;
}
