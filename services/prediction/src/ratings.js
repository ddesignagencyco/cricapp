import { detectFormat, extractWinnerId, eloEdge, tossMagnitude, venueHistoryEdge } from './features.js';

const RATING_START = 1500;
const HOME_ADVANTAGE = 60;
const K_FACTOR = 20;

function expectedScore(ratingWithAdvantage, opponentRating) {
  return 1 / (1 + 10 ** (-(ratingWithAdvantage - opponentRating) / 400));
}

export function marginMultiplier(margin) {
  const m = Math.max(0, Number(margin) || 0);
  return Math.max(1, Math.min(2, 1 + Math.log1p(m) / Math.log(41)));
}

export function computeEloRatings(settled) {
  const ratings = new Map();
  const get = (teamId) => {
    if (!ratings.has(teamId)) ratings.set(teamId, { elo: RATING_START, played: 0 });
    return ratings.get(teamId);
  };
  for (const match of settled) {
    const { homeTeamId, awayTeamId, format, homeWon } = match;
    if (!homeTeamId || !awayTeamId || homeWon == null) continue;
    const homeRec = get(`${format}|${homeTeamId}`);
    const awayRec = get(`${format}|${awayTeamId}`);
    const expected = expectedScore(homeRec.elo + HOME_ADVANTAGE, awayRec.elo);
    const actual = homeWon ? 1 : 0;
    const mult = marginMultiplier(match.margin ?? 0);
    const delta = K_FACTOR * mult * (actual - expected);
    homeRec.elo += delta;
    awayRec.elo -= delta;
    homeRec.played += 1;
    awayRec.played += 1;
  }
  return [...ratings.entries()].map(([key, rec]) => {
    const [format, teamId] = key.split('|');
    return {
      teamId,
      format,
      elo: Number(rec.elo.toFixed(2)),
      played: rec.played,
    };
  });
}

export function computeTossTrends(settled) {
  const buckets = new Map([['*', { matches: 0, tossWinnerWon: 0, firstBatWon: 0 }]]);
  for (const match of settled) {
    const { tossWonBy, tossDecision, winnerId, homeTeamId, awayTeamId, format } = match;
    if (!tossWonBy || !winnerId) continue;
    const bucketFor = (key) => {
      if (!buckets.has(key)) buckets.set(key, { matches: 0, tossWinnerWon: 0, firstBatWon: 0 });
      return buckets.get(key);
    };
    const firstBatter =
      tossDecision === 'bat'
        ? tossWonBy
        : tossDecision === 'bowl'
          ? (tossWonBy === homeTeamId ? awayTeamId : homeTeamId)
          : null;
    for (const bucket of [bucketFor('*'), bucketFor(format)]) {
      bucket.matches += 1;
      if (winnerId === tossWonBy) bucket.tossWinnerWon += 1;
      if (firstBatter && winnerId === firstBatter) bucket.firstBatWon += 1;
    }
  }
  return [...buckets.entries()]
    .filter(([, v]) => v.matches > 0)
    .map(([format, v]) => ({
      format,
      matches: v.matches,
      tossWinnerWinRate: Number((v.tossWinnerWon / v.matches).toFixed(4)),
      firstBatWinRate: Number((v.firstBatWon / v.matches).toFixed(4)),
    }));
}

function runsFromPeriodScores(periodScores) {
  if (!Array.isArray(periodScores)) return null;
  let home = 0;
  let away = 0;
  let seen = false;
  for (const period of periodScores) {
    if (period?.type !== 'inning') continue;
    home += Number(period.home_score ?? 0);
    away += Number(period.away_score ?? 0);
    seen = true;
  }
  return seen ? Math.abs(home - away) : null;
}

export function settledMatchesFromRows(rows) {
  return rows.flatMap((row) => {
    const payload = row.payload ?? {};
    const event = payload.sport_event ?? payload;
    const status = payload.sport_event_status ?? event.sport_event_status ?? {};
    const comps = Array.isArray(event.competitors) ? event.competitors : [];
    const homeTeamId = comps.find((c) => c?.qualifier === 'home')?.id ?? null;
    const awayTeamId = comps.find((c) => c?.qualifier === 'away')?.id ?? null;
    if (!homeTeamId || !awayTeamId) return [];
    const winnerId = extractWinnerId(payload, [homeTeamId, awayTeamId]);
    const format = detectFormat(row.tournament, status.match_status ?? row.match_status);
    const margin = runsFromPeriodScores(status.period_scores);
    return [
      {
        matchId: row.match_id,
        scheduled: row.scheduled ?? null,
        format: format === 'unknown' ? '*' : format,
        homeTeamId,
        awayTeamId,
        winnerId,
        homeWon: winnerId ? winnerId === homeTeamId : null,
        margin,
        tossWonBy: status.toss_won_by ?? null,
        tossDecision: status.toss_decision ?? null,
      },
    ];
  }).filter((match) => match.homeTeamId !== match.awayTeamId)
    .sort((a, b) => String(a.scheduled ?? '').localeCompare(String(b.scheduled ?? '')));
}

export async function loadSettledMatchRows(query) {
  const r = await query(
    `SELECT m.match_id, m.tournament, m.match_status, m.scheduled, rec.payload
     FROM matches m
     LEFT JOIN LATERAL (
       SELECT payload
       FROM sport_event_records
       WHERE event_id = m.match_id
       ORDER BY updated_at DESC
       LIMIT 1
     ) rec ON true
     WHERE m.status = 'completed'
     ORDER BY m.scheduled ASC NULLS LAST`,
  );
  return r.rows;
}

export async function saveTeamRatings(query, ratings) {
  for (const rating of ratings) {
    await query(
      `INSERT INTO prediction_team_ratings (team_id, format, elo, played, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (team_id, format)
       DO UPDATE SET elo = EXCLUDED.elo, played = EXCLUDED.played, updated_at = NOW()`,
      [rating.teamId, rating.format, rating.elo, rating.played],
    );
  }
}

export async function saveTossTrends(query, trends) {
  for (const trend of trends) {
    await query(
      `INSERT INTO prediction_situation_stats
         (format, matches, toss_winner_win_rate, first_bat_win_rate, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (format)
       DO UPDATE SET
         matches = EXCLUDED.matches,
         toss_winner_win_rate = EXCLUDED.toss_winner_win_rate,
         first_bat_win_rate = EXCLUDED.first_bat_win_rate,
         updated_at = NOW()`,
      [trend.format, trend.matches, trend.tossWinnerWinRate, trend.firstBatWinRate],
    );
  }
}

export { eloEdge, tossMagnitude, venueHistoryEdge };
export async function refreshRatings(query) {
  const rows = await loadSettledMatchRows(query);
  const settled = settledMatchesFromRows(rows);
  const scored = settled.filter((match) => match.homeWon != null);
  const ratings = computeEloRatings(scored);
  const trends = computeTossTrends(scored);
  await saveTeamRatings(query, ratings);
  await saveTossTrends(query, trends);
  return {
    applied: true,
    settledMatches: scored.length,
    ratedTeams: ratings.length,
    trendBuckets: trends.length,
  };
}
