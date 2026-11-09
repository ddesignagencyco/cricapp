/**
 * Which in-play matches the poller follows this cycle.
 *
 * Every followed match costs provider requests on every refresh, so on a metered plan the
 * number must be capped (POLL_MAX_LIVE_MATCHES, 0 = follow all). When capping, matches that
 * are actually being played come before paused ones (stumps, rain, bad light), since a
 * paused match rarely changes between polls.
 */
export function pickLiveIds(events, inPlayStatuses, max = 0) {
  const inPlay = events.filter((e) => inPlayStatuses.has(e.status));
  if (!(max > 0)) return inPlay.map((e) => e.id);
  const rank = (e) => (e.status === 'live' ? 0 : 1);
  return [...inPlay]
    .sort((a, b) => rank(a) - rank(b)) // stable: provider order is kept within a rank
    .slice(0, max)
    .map((e) => e.id);
}
