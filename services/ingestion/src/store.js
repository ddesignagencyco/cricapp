import { query } from './db.js';
import redis, { redisKeys, REDIS_TTL } from './redis.js';

export async function saveMatch(match) {
  await query(
    `INSERT INTO matches (match_id, status, teams, team_names, tournament, venue, scheduled, current_innings, last_event, display_score, match_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (match_id) DO UPDATE SET
       status = EXCLUDED.status,
       teams = EXCLUDED.teams,
       team_names = EXCLUDED.team_names,
       tournament = EXCLUDED.tournament,
       venue = EXCLUDED.venue,
       scheduled = EXCLUDED.scheduled,
       current_innings = EXCLUDED.current_innings,
       last_event = EXCLUDED.last_event,
       display_score = EXCLUDED.display_score,
       match_status = EXCLUDED.match_status,
       updated_at = NOW()`,
    [
      match.matchId,
      match.status,
      JSON.stringify(match.teams),
      JSON.stringify(match.teamNames),
      match.tournament,
      match.venue,
      match.scheduled,
      JSON.stringify(match.currentInnings),
      JSON.stringify(match.lastEvent),
      match.displayScore,
      match.matchStatus,
    ],
  );
}

export async function publishMatchState(match) {
  const key = redisKeys.matchState(match.matchId);
  await redis.set(key, JSON.stringify(match), 'EX', REDIS_TTL.MATCH_STATE);

  if (match.status === 'live') {
    await redis.sadd(redisKeys.liveMatches(), match.matchId);
  } else {
    await redis.srem(redisKeys.liveMatches(), match.matchId);
  }
}

export async function publishEvents(events) {
  for (const event of events) {
    const channel = redisKeys.matchChannel(event.matchId);
    await redis.publish(channel, JSON.stringify(event));
  }
}

const upsertTeam = `
  INSERT INTO teams (id, name, abbr, country, logo_url)
  VALUES ($1,$2,$3,$4,$5)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    abbr = EXCLUDED.abbr,
    country = EXCLUDED.country,
    logo_url = EXCLUDED.logo_url,
    updated_at = NOW()
`;

const upsertPlayer = `
  INSERT INTO players (id, full_name, short_name, team_id, birth, nationality, batting_style, bowling_style, role, profile_url)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    short_name = EXCLUDED.short_name,
    team_id = EXCLUDED.team_id,
    birth = EXCLUDED.birth,
    nationality = EXCLUDED.nationality,
    batting_style = EXCLUDED.batting_style,
    bowling_style = EXCLUDED.bowling_style,
    role = EXCLUDED.role,
    profile_url = EXCLUDED.profile_url,
    updated_at = NOW()
`;

export async function saveTeamsPlayers({ teams = [], players = [] }) {
  for (const t of teams) {
    await query(upsertTeam, [t.id, t.name, t.abbr, t.country, t.logoUrl]);
  }
  for (const p of players) {
    await query(upsertPlayer, [
      p.id,
      p.fullName,
      p.shortName,
      p.teamId,
      p.birth,
      p.nationality,
      p.battingStyle,
      p.bowlingStyle,
      p.role,
      p.profileUrl,
    ]);
  }
  return { teams: teams.length, players: players.length };
}

const upsertStanding = `
  INSERT INTO psl_standings (
    season_id, team_id, team_name, team_abbr, rank, played, won, lost, tied,
    no_result, points, net_run_rate, runs_for, runs_against, overs_for, overs_against, change
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
  ON CONFLICT (season_id, team_id) DO UPDATE SET
    team_name = EXCLUDED.team_name,
    team_abbr = EXCLUDED.team_abbr,
    rank = EXCLUDED.rank,
    played = EXCLUDED.played,
    won = EXCLUDED.won,
    lost = EXCLUDED.lost,
    tied = EXCLUDED.tied,
    no_result = EXCLUDED.no_result,
    points = EXCLUDED.points,
    net_run_rate = EXCLUDED.net_run_rate,
    runs_for = EXCLUDED.runs_for,
    runs_against = EXCLUDED.runs_against,
    overs_for = EXCLUDED.overs_for,
    overs_against = EXCLUDED.overs_against,
    change = EXCLUDED.change,
    updated_at = NOW()
`;

export async function saveStandings(seasonId, rows) {
  for (const r of rows) {
    await query(upsertStanding, [
      seasonId,
      r.teamId,
      r.teamName,
      r.teamAbbr,
      r.rank,
      r.played,
      r.won,
      r.lost,
      r.tied,
      r.noResult,
      r.points,
      r.netRunRate,
      r.runsFor,
      r.runsAgainst,
      r.oversFor,
      r.oversAgainst,
      r.change,
    ]);
  }
  return rows.length;
}

const upsertFixture = `
  INSERT INTO psl_fixtures (
    match_id, season_id, status, scheduled, home_team_id, home_team_name, home_team_abbr,
    away_team_id, away_team_name, away_team_abbr, venue, result_text, round
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
  ON CONFLICT (match_id) DO UPDATE SET
    season_id = EXCLUDED.season_id,
    status = EXCLUDED.status,
    scheduled = EXCLUDED.scheduled,
    home_team_id = EXCLUDED.home_team_id,
    home_team_name = EXCLUDED.home_team_name,
    home_team_abbr = EXCLUDED.home_team_abbr,
    away_team_id = EXCLUDED.away_team_id,
    away_team_name = EXCLUDED.away_team_name,
    away_team_abbr = EXCLUDED.away_team_abbr,
    venue = EXCLUDED.venue,
    result_text = EXCLUDED.result_text,
    round = EXCLUDED.round,
    updated_at = NOW()
`;

export async function saveFixtures(seasonId, rows) {
  for (const r of rows) {
    await query(upsertFixture, [
      r.matchId,
      r.seasonId ?? seasonId,
      r.status,
      r.scheduled,
      r.homeTeamId,
      r.homeTeamName,
      r.homeTeamAbbr,
      r.awayTeamId,
      r.awayTeamName,
      r.awayTeamAbbr,
      r.venue,
      r.resultText,
      r.round,
    ]);
  }
  return rows.length;
}

const upsertLeader = `
  INSERT INTO psl_leaders (
    season_id, category, stat, rank, player_id, player_name, team_abbr, team_name, value
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  ON CONFLICT (season_id, category, stat, player_id) DO UPDATE SET
    rank = EXCLUDED.rank,
    player_name = EXCLUDED.player_name,
    team_abbr = EXCLUDED.team_abbr,
    team_name = EXCLUDED.team_name,
    value = EXCLUDED.value,
    updated_at = NOW()
`;

export async function saveLeaders(seasonId, leaderGroups) {
  let count = 0;
  for (const group of leaderGroups) {
    for (const entry of group.entries) {
      if (!entry.playerId) continue;
      await query(upsertLeader, [
        seasonId,
        group.category,
        group.stat,
        entry.rank,
        entry.playerId,
        entry.playerName,
        entry.teamAbbr,
        entry.teamName,
        entry.value,
      ]);
      count += 1;
    }
  }
  return count;
}

export async function saveSquad(seasonId, squad) {
  // Upsert the team so the roster can be related to a team row.
  const teams = squad.teamId
    ? [
        {
          id: squad.teamId,
          name: squad.teamName,
          abbr: squad.teamAbbr,
          country: null,
          logoUrl: null,
        },
      ]
    : [];
  const players = (squad.players ?? []).map((p) => ({
    id: p.playerId,
    fullName: p.playerName,
    shortName: p.playerShortName,
    teamId: squad.teamId,
    birth: p.dateOfBirth,
    nationality: p.nationality,
    battingStyle: p.battingStyle,
    bowlingStyle: p.bowlingStyle,
    role: p.role,
    profileUrl: null,
  }));
  return saveTeamsPlayers({ teams, players });
}

export async function clearSeasonData(seasonId) {
  await query(`DELETE FROM psl_leaders WHERE season_id = $1`, [seasonId]);
  return Promise.resolve();
}

export async function cachePsData(seasonId, type, payload) {
  const k =
    type === "standings"
      ? redisKeys.pslStandings(seasonId)
      : type === "fixtures"
        ? redisKeys.pslFixtures(seasonId)
        : type === "leaders"
          ? redisKeys.pslLeaders(seasonId)
          : redisKeys.pslSquads(seasonId);
  await redis.set(k, JSON.stringify(payload), "EX", REDIS_TTL.PSL);
}
