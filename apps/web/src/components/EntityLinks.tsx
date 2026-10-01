import Link from 'next/link';

/**
 * Links to the entity pages a reader is most likely to want next.
 *
 * The commentary deliberately has none of these — a ball-by-ball list where every name is
 * a link is a list of traps, and a reader mid-over is not navigating. Everywhere else,
 * though, an entity name is the natural way to get to that entity's page, and leaving it
 * as plain text is a dead end.
 *
 * Each helper takes the id as well as the name, and renders plain text when the id is
 * missing rather than building a link to `/teams/undefined`. A name we cannot resolve is
 * text; only a real id becomes a link.
 */

function clean(value: unknown): string {
  const trimmed = String(value ?? '').trim();
  // Only a `sportradar:` prefix is stripped, and only because it turns up inside a
  // *display name*. A real id is left exactly as the API gave it: the teams table
  // stores `sr:competitor:142690`, and `/api/teams/142690` is a 404 while
  // `/api/teams/sr:competitor:142690` resolves. Stripping the prefix built a dead link
  // to a number that does not exist, on every team name, player name and logo on the
  // match page.
  return trimmed.replace(/^sr:sportradar:/i, '');
}

/**
 * True when the value looks like an id rather than a name.
 *
 * A single bare word is treated as a name, not an id. `India`, `WI` and `Lahore` are
 * single words, and `/teams/India` is a dead link — worse than leaving the text alone.
 * Real ids carry structure: a provider prefix (`sr:team:1`), a separator (`tour-2026`,
 * `t20_ipl`) or at least one digit. A name containing a space fails for the obvious
 * reason.
 */
function isUsableId(value: unknown): boolean {
  const id = clean(value);
  if (!id) return false;
  if (/\s/.test(id)) return false;
  if (id.includes(':') || /[-_./]/.test(id)) return true;
  // A bare word is a display name unless it is at least partly numeric.
  return /\d/.test(id);
}

/**
 * Percent-encodes an id for a URL path, leaving the colon intact.
 *
 * `sr:competitor:142690` became `sr%3Acompetitor%3A142690`, which resolved to the same
 * place but read as noise in every href on the page — and, worse, disagreed with the
 * rest of the site, where the ticker and the match cards interpolate the raw id and
 * produce `/matches/sr:match:42214237`. Two spellings of the same link on one site is
 * the thing to avoid.
 *
 * A colon is a legal `pchar` in a path segment (RFC 3986), so it is left alone.
 * Everything else still goes through `encodeURIComponent`, so a name containing a
 * space or a slash is escaped exactly as before.
 */
function encodeId(value: string): string {
  return encodeURIComponent(value).replace(/%3A/gi, ':');
}

export function teamHref(teamId: unknown): string | null {
  const id = clean(teamId);
  return isUsableId(id) ? `/teams/${encodeId(id)}` : null;
}

export function playerHref(playerId: unknown): string | null {
  const id = clean(playerId);
  return isUsableId(id) ? `/players/${encodeId(id)}` : null;
}

export function tournamentHref(tournamentId: unknown): string | null {
  const id = clean(tournamentId);
  return isUsableId(id) ? `/tournaments/${encodeId(id)}` : null;
}

export function matchHref(matchId: unknown): string | null {
  const id = clean(matchId);
  return isUsableId(id) ? `/matches/${encodeId(id)}` : null;
}

/** The entity kinds that can have their own news listing. */
export const NEWS_ENTITY_TYPES = ['match', 'team', 'player', 'series'] as const;
export type NewsEntityType = (typeof NEWS_ENTITY_TYPES)[number];

export function isNewsEntityType(value: unknown): value is NewsEntityType {
  return NEWS_ENTITY_TYPES.includes(String(value ?? '') as NewsEntityType);
}

/**
 * The "all news about this" page.
 *
 * The path carries a static `by` segment. `app/news/[id]` is already the article route, and
 * Next.js refuses two different parameter names for the same position in a path — putting
 * this at `app/news/[type]/[id]` took the whole site down with
 * "You cannot use different slug names for the same dynamic path". A static segment before
 * the parameters keeps both routes valid.
 *
 * Entity pages used to list every linked story inline, which made a match page longer than
 * the match. They now show a handful and send the reader here, where the list paginates on
 * the server and every page is a real link.
 */
export function entityNewsHref(type: NewsEntityType, id: unknown): string | null {
  if (!isNewsEntityType(type)) return null;
  const entityId = clean(id);
  if (!isUsableId(entityId)) return null;
  return `/news/by/${type}/${encodeId(entityId)}`;
}

const LINK_CLASS = 'transition-colors hover:text-accent';

/**
 * A team name that links to the team page when the id is known.
 *
 * Rendered inline so it can sit inside a heading, a table cell or a stat without
 * changing the layout — the underline and hit area are the only difference.
 */
export function TeamLink({
  teamId,
  name,
  className,
}: {
  teamId?: string | null;
  name: string;
  className?: string;
}) {
  const href = teamHref(teamId);
  if (!href) return <span className={className}>{name}</span>;
  return (
    <Link href={href} prefetch={false} className={`${LINK_CLASS} ${className ?? ''}`.trim()}>
      {name}
    </Link>
  );
}

export function PlayerLink({
  playerId,
  name,
  className,
}: {
  playerId?: string | null;
  name: string;
  className?: string;
}) {
  const href = playerHref(playerId);
  if (!href) return <span className={className}>{name}</span>;
  return (
    <Link href={href} prefetch={false} className={`${LINK_CLASS} ${className ?? ''}`.trim()}>
      {name}
    </Link>
  );
}

export function TournamentLink({
  tournamentId,
  name,
  className,
}: {
  tournamentId?: string | null;
  name: string;
  className?: string;
}) {
  const href = tournamentHref(tournamentId);
  if (!href) return <span className={className}>{name}</span>;
  return (
    <Link href={href} prefetch={false} className={`${LINK_CLASS} ${className ?? ''}`.trim()}>
      {name}
    </Link>
  );
}
