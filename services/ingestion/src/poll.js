import { PROVIDERS } from './schemas.js';
import { normalizeMatch, normalizeLineups } from './normalize.js';
import { diffMatch } from './diff.js';
import { saveMatch, saveTeamsPlayers, publishMatchState, publishEvents } from './store.js';
import redis, { redisKeys } from './redis.js';
import { fetchLiveSchedule, fetchMatchSummary, fetchMatchLineups } from './sportradar.js';

async function readPrevious(matchId) {
  const raw = await redis.get(redisKeys.matchState(matchId));
  return raw ? JSON.parse(raw) : null;
}

async function processLineups(id) {
  try {
    const raw = await fetchMatchLineups(id);
    const { teams, players } = normalizeLineups(raw);
    if (teams.length || players.length) {
      const res = await saveTeamsPlayers({ teams, players });
      console.log(`[ingest] ${id}: upserted ${res.teams} team(s), ${res.players} player(s)`);
    }
  } catch (err) {
    console.error(`[ingest] lineups failed for ${id}`, err.message);
  }
}

async function processLiveMatch(id) {
  const summary = await fetchMatchSummary(id);
  const next = normalizeMatch(PROVIDERS.SPORTRADAR, summary);
  const previous = await readPrevious(next.matchId);

  const events = diffMatch(previous, next);

  await saveMatch(next);
  await publishMatchState(next);
  if (events.length) {
    await publishEvents(events);
    console.log(`[ingest] ${next.matchId}: ${events.map((e) => e.type).join(', ')}`);
  }

  // Persist team + player profiles once per live match so the read API can
  // serve team rosters / player profiles backed by the provider.
  await processLineups(id);
}

export async function pollOnce() {
  const liveEvents = await fetchLiveSchedule();
  const liveIds = liveEvents
    .filter((se) => se.status === 'live')
    .map((se) => se.id);

  for (const id of liveIds) {
    try {
      await processLiveMatch(id);
    } catch (err) {
      console.error(`[ingest] failed for ${id}`, err.message);
    }
  }

  return liveIds.length;
}
