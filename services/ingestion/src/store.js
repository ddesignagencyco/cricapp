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
  INSERT INTO teams (id, name, abbr, country, logo_url, manager)
  VALUES ($1,$2,$3,$4,$5,$6)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    abbr = EXCLUDED.abbr,
    country = EXCLUDED.country,
    logo_url = EXCLUDED.logo_url,
    manager = EXCLUDED.manager,
    updated_at = NOW()
`;

const upsertPlayer = `
  INSERT INTO players (id, full_name, short_name, team_id, birth, nationality, batting_style, bowling_style, role, profile_url, country_code, jersey_number, height)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
    country_code = EXCLUDED.country_code,
    jersey_number = EXCLUDED.jersey_number,
    height = EXCLUDED.height,
    updated_at = NOW()
`;

export async function saveTeamsPlayers({ teams = [], players = [] }) {
  for (const t of teams) {
    await query(upsertTeam, [t.id, t.name, t.abbr, t.country, t.logoUrl, t.manager ?? null]);
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
      p.countryCode ?? null,
      p.jerseyNumber ?? null,
      p.height ?? null,
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

const upsertTours = `
  INSERT INTO tours (id, name, category, sport)
  VALUES ($1,$2,$3,$4)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    sport = EXCLUDED.sport,
    updated_at = NOW()
`;

export async function saveTours(rows) {
  for (const t of rows) {
    await query(upsertTours, [t.id, t.name, t.category, t.sport]);
  }
  return rows.length;
}

const upsertTournaments = `
  INSERT INTO tournaments (id, name, type, gender, category, current_season, sport, tour_id, parent_id)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    gender = EXCLUDED.gender,
    category = EXCLUDED.category,
    current_season = EXCLUDED.current_season,
    sport = EXCLUDED.sport,
    tour_id = EXCLUDED.tour_id,
    parent_id = EXCLUDED.parent_id,
    updated_at = NOW()
`;

export async function saveTournaments(rows) {
  for (const t of rows) {
    await query(upsertTournaments, [
      t.id,
      t.name,
      t.type,
      t.gender,
      t.category,
      t.currentSeason,
      t.sport,
      t.tourId,
      t.parentId,
    ]);
  }
  return rows.length;
}

/**
 * Backfill the tours table from synced tournaments. The Sportradar cricket
 * plan we use returns no tours via tours.json and no `tour_id` on the
 * tournament list, so tours are synthesized from the distinct tournament
 * categories (e.g. International, Pakistan, England) — a fabricated but
 * useful browsing/dropdown source.
 */
export async function backfillTours() {
  const r = await query(`
    INSERT INTO tours (id, name, category, sport)
    SELECT DISTINCT
      'cat:' || (t.category->>'id') AS id,
      COALESCE(NULLIF(t.category->>'name', ''), 'Unknown Tour') AS name,
      t.category,
      t.sport
    FROM tournaments t
    WHERE t.category ? 'id' AND COALESCE(NULLIF(t.category->>'id', ''), '') <> ''
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      sport = EXCLUDED.sport,
      updated_at = NOW()
  `);
  return r.rowCount ?? 0;
}

const upsertSportEventRecord = `
  INSERT INTO sport_event_records (kind, scope_key, event_id, status, scheduled, payload)
  VALUES ($1,$2,$3,$4,$5,$6)
  ON CONFLICT (kind, scope_key, event_id) DO UPDATE SET
    status = EXCLUDED.status,
    scheduled = EXCLUDED.scheduled,
    payload = EXCLUDED.payload,
    updated_at = NOW()
`;

/**
 * Map a raw Sportradar status (e.g. 'closed', 'live', 'cancelled') onto the
 * canonical match status set.
 */
function mapMatchStatus(status, matchStatus) {
  const s = `${status ?? ''} ${matchStatus ?? ''}`.toLowerCase();
  if (s.includes('cancel') || s.includes('postpon')) return 'cancelled';
  if (s.includes('live') || s.includes('progress') || s.includes('inning')) return 'live';
  if (
    s.includes('closed') ||
    s.includes('complete') ||
    s.includes('ended') ||
    s.includes('won') ||
    s.includes('tied') ||
    s.includes('abandon') ||
    s.includes('result')
  ) {
    return 'completed';
  }
  return 'upcoming';
}

/**
 * Build a canonical match row from a persisted sport_event_record so the read
 * API's /matches endpoints are populated even when no match is currently live.
 */
function recordToMatch(record) {
  const raw = record.payload ?? {};
  const event = raw.sport_event ?? raw;
  const statusBlock = raw.sport_event_status ?? event.sport_event_status ?? {};
  const comps = event.competitors ?? [];
  const home = comps.find((c) => c.qualifier === 'home') ?? null;
  const away = comps.find((c) => c.qualifier === 'away') ?? null;
  const first = home ?? comps[0] ?? null;
  const second = away ?? comps[1] ?? null;

  return {
    matchId: record.eventId,
    status: mapMatchStatus(
      record.status ?? statusBlock.status ?? '',
      statusBlock.match_status ?? statusBlock.matchStatus,
    ),
    teams: [first?.id, second?.id].filter(Boolean),
    teamNames: [first?.name, second?.name].filter(Boolean),
    tournament: event.tournament?.name ?? null,
    venue: event.venue?.name ?? null,
    scheduled: record.scheduled ?? event.scheduled ?? null,
    currentInnings: null,
    lastEvent: { type: 'none', runs: 0, over: 0 },
    displayScore: statusBlock.display_score ?? null,
    matchStatus:
      statusBlock.result ?? statusBlock.match_status ?? record.status ?? null,
  };
}

export async function saveSportEventRecords(rows) {
  const teamsToUpsert = new Map();
  for (const r of rows) {
    if (!r.eventId) continue;
    await query(upsertSportEventRecord, [
      r.kind,
      r.scopeKey,
      r.eventId,
      r.status,
      r.scheduled,
      JSON.stringify(r.payload),
    ]);

    const rawe = r.payload ?? {};
    const event = rawe.sport_event ?? rawe;
    for (const comp of event.competitors ?? []) {
      if (!comp?.id) continue;
      teamsToUpsert.set(comp.id, {
        id: comp.id,
        name: comp.name ?? 'Unknown',
        abbr: comp.abbreviation ?? null,
        country: comp.country ?? null,
        logoUrl: null,
        manager: null,
      });
    }

    await saveMatch(recordToMatch(r));
  }

  if (teamsToUpsert.size > 0) {
    await saveTeamsPlayers({ teams: [...teamsToUpsert.values()] });
  }

  return rows.length;
}

const upsertMatchTimeline = `
  INSERT INTO match_timelines (match_id, payload)
  VALUES ($1,$2)
  ON CONFLICT (match_id) DO UPDATE SET
    payload = EXCLUDED.payload,
    updated_at = NOW()
`;

export async function saveMatchTimeline(matchId, payload) {
  await query(upsertMatchTimeline, [matchId, JSON.stringify(payload)]);
  return 1;
}

const upsertHeadToHead = `
  INSERT INTO head_to_head (team_a_id, team_b_id, payload)
  VALUES ($1,$2,$3)
  ON CONFLICT (team_a_id, team_b_id) DO UPDATE SET
    payload = EXCLUDED.payload,
    updated_at = NOW()
`;

export async function saveHeadToHead({ teamAId, teamBId, payload }) {
  await query(upsertHeadToHead, [teamAId, teamBId, JSON.stringify(payload)]);
  return 1;
}

const upsertTeamProfile = `
  INSERT INTO team_profiles (team_id, manager, team_info)
  VALUES ($1,$2,$3)
  ON CONFLICT (team_id) DO UPDATE SET
    manager = EXCLUDED.manager,
    team_info = EXCLUDED.team_info,
    updated_at = NOW()
`;

export async function saveTeamProfile({ teamId, manager, teamInfo }) {
  await query(upsertTeamProfile, [teamId, manager, teamInfo]);
  await query(
    `UPDATE teams SET manager = $2, updated_at = NOW() WHERE id = $1`,
    [teamId, manager?.name ?? null],
  );
  return 1;
}

const upsertPlayerProfile = `
  INSERT INTO player_profiles (player_id, payload)
  VALUES ($1,$2)
  ON CONFLICT (player_id) DO UPDATE SET
    payload = EXCLUDED.payload,
    updated_at = NOW()
`;

export async function savePlayerProfile({ playerId, payload }) {
  await query(upsertPlayerProfile, [playerId, JSON.stringify(payload)]);
  const p = payload?.player;
  if (p) {
    await query(
      `UPDATE players SET
         full_name = COALESCE($2, full_name),
         short_name = COALESCE($3, short_name),
         country_code = COALESCE($4, country_code),
         batting_style = COALESCE($5, batting_style),
         bowling_style = COALESCE($6, bowling_style),
         jersey_number = COALESCE($7, jersey_number),
         height = COALESCE($8, height),
         nationality = COALESCE($9, nationality),
         updated_at = NOW()
       WHERE id = $1`,
      [
        playerId,
        p.full_name ?? null,
        p.name ?? null,
        p.country_code ?? null,
        p.batting_style ?? null,
        p.bowling_style ?? null,
        p.jersey_number ?? null,
        p.height ?? null,
        p.nationality ?? null,
      ],
    );
  }
  return 1;
}

const upsertTournamentSeason = `
  INSERT INTO tournament_seasons (id, tournament_id, name, year, start_date, end_date)
  VALUES ($1,$2,$3,$4,$5,$6)
  ON CONFLICT (id) DO UPDATE SET
    tournament_id = EXCLUDED.tournament_id,
    name = EXCLUDED.name,
    year = EXCLUDED.year,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    updated_at = NOW()
`;

export async function saveTournamentSeasons(rows) {
  for (const s of rows) {
    await query(upsertTournamentSeason, [
      s.id,
      s.tournamentId,
      s.name,
      s.year,
      s.startDate,
      s.endDate,
    ]);
  }
  return rows.length;
}

/**
 * Season ids referenced by tournaments' `current_season` (active within the
 * last `minYear`) — used to auto-derive tournament results targets instead of
 * hardcoding ids.
 */
export async function listActiveSeasonIds({ minYear, limit = 10 } = {}) {
  const threshold = String(minYear ?? new Date().getFullYear() - 1);
  const r = await query(
    `SELECT DISTINCT current_season->>'id' AS season_id
     FROM tournaments
     WHERE current_season ? 'id'
       AND current_season->>'year' >= $1
       AND current_season->>'id' <> ''
     ORDER BY season_id
     LIMIT $2`,
    [threshold, limit],
  );
  return r.rows.map((x) => x.season_id).filter(Boolean);
}

/**
 * Tournament ids that carry an active current_season — used to drive season
 * list syncs without hardcoding tournament ids.
 */
export async function listActiveTournamentIds({ minYear, limit = 10 } = {}) {
  const threshold = String(minYear ?? new Date().getFullYear() - 1);
  const r = await query(
    `SELECT DISTINCT id
     FROM tournaments
     WHERE current_season ? 'id'
       AND current_season->>'year' >= $1
     ORDER BY id
     LIMIT $2`,
    [threshold, limit],
  );
  return r.rows.map((x) => x.id).filter(Boolean);
}

/**
 * Match ids from sport_event_records that do not yet have a timeline,
 * most recently scheduled first — the auto-derived timeline sync queue.
 */
export async function listEventIdsWithoutTimeline({ limit = 20 } = {}) {
  const r = await query(
    `SELECT ser.event_id AS event_id
     FROM sport_event_records ser
     LEFT JOIN match_timelines mt ON mt.match_id = ser.event_id
     WHERE mt.match_id IS NULL AND ser.event_id IS NOT NULL
     GROUP BY ser.event_id
     ORDER BY MAX(ser.scheduled) DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
  return r.rows.map((x) => x.event_id).filter(Boolean);
}

/**
 * Team ids that do not yet have a synced profile — the auto-derived team
 * sync queue (profile + schedule + results). Teams get covered progressively
 * over sync cycles until all are profiled.
 */
export async function listTeamsWithoutSync({ limit = 10 } = {}) {
  const r = await query(
    `SELECT t.id AS id
     FROM teams t
     LEFT JOIN team_profiles tp ON tp.team_id = t.id
     WHERE tp.team_id IS NULL
     ORDER BY t.id
     LIMIT $1`,
    [limit],
  );
  return r.rows.map((x) => x.id).filter(Boolean);
}

const MATCH_COMPETITORS = `
  CASE WHEN ser.payload ? 'sport_event' THEN ser.payload->'sport_event'->'competitors'
       ELSE ser.payload->'competitors' END
`;

/**
 * Materialize per-team `team_schedule` / `team_results` rows from the match
 * records we already store (daily schedule/results, tournament results).
 * Gives every team schedule + results data without extra provider calls.
 */
export async function materializeTeamEvents() {
  const r = await query(
    `INSERT INTO sport_event_records (kind, scope_key, event_id, status, scheduled, payload, created_at, updated_at)
     SELECT
       CASE WHEN ser.kind = 'daily_schedule' THEN 'team_schedule' ELSE 'team_results' END,
       comp->>'id',
       ser.event_id,
       ser.status,
       ser.scheduled,
       ser.payload,
       NOW(),
       NOW()
     FROM sport_event_records ser
     CROSS JOIN LATERAL jsonb_array_elements(${MATCH_COMPETITORS}) comp
     WHERE ser.kind IN ('daily_schedule','daily_results','tournament_results','team_schedule','team_results')
       AND ser.event_id IS NOT NULL
       AND (comp->>'id') IS NOT NULL
     ON CONFLICT (kind, scope_key, event_id) DO NOTHING`,
  );
  return r.rowCount ?? 0;
}

/**
 * Match ids whose teams have no players yet in the players table, most
 * recently scheduled first — the auto-derived roster/lineup queue.
 */
export async function listMatchesForRosterlessTeams({ limit = 20 } = {}) {
  const r = await query(
    `SELECT ser.event_id AS event_id
     FROM sport_event_records ser
     CROSS JOIN LATERAL jsonb_array_elements(${MATCH_COMPETITORS}) comp
     JOIN teams t ON t.id = (comp->>'id')
     LEFT JOIN players p ON p.team_id = t.id
     WHERE ser.event_id IS NOT NULL
       AND (comp->>'id') IS NOT NULL
       AND p.team_id IS NULL
     GROUP BY ser.event_id
     ORDER BY MAX(ser.scheduled) DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
  return r.rows.map((x) => x.event_id).filter(Boolean);
}

/**
 * Team pairs already persisted in head_to_head, so existing pairs are kept
 * fresh without configuring them again.
 */
export async function listHeadToHeadPairs() {
  const r = await query(
    `SELECT team_a_id AS a, team_b_id AS b FROM head_to_head`,
  );
  return r.rows.map((x) => [x.a, x.b]).filter(([a, b]) => a && b);
}
