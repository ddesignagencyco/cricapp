import { PROVIDERS } from './schemas.js';
import { buildTeamFromCompetitor, managerDisplayName } from './teamMeta.js';
import { buildPlayerFromLineupEntry, parseFullName } from './playerMeta.js';
import { battingSideFromToken } from './matchSide.js';

export function computeRunRate(runs, overs) {
  if (!overs) return 0;
  const wholeOvers = Math.floor(overs);
  const balls = Math.round((overs - wholeOvers) * 10);
  const totalBalls = wholeOvers * 6 + balls;
  return totalBalls > 0 ? Number(((runs / totalBalls) * 6).toFixed(2)) : 0;
}

export function normalizeMatch(providerName, raw) {
  switch (providerName) {
    case PROVIDERS.MOCK:
      return normalizeMock(raw);
    case PROVIDERS.SPORTRADAR:
      return normalizeSportradar(raw);
    default:
      throw new Error(`No normalizer defined for provider "${providerName}"`);
  }
}

function sideTotal(periodScores, side) {
  let runs = 0;
  let wickets = null;
  let recorded = false;
  let overs = '';

  for (const inning of periodScores) {
    const value = Number(inning[`${side}_score`]);
    const w = Number(inning[`${side}_wickets`]);
    const hasRuns = !Number.isNaN(value);
    const hasWickets = !Number.isNaN(w);
    const inningCounts =
      (hasRuns && value > 0) || (hasWickets && w >= 0 && !Number.isNaN(w));
    if (inningCounts) {
      if (hasRuns && value > 0) runs += value;
      recorded = true;
      if (hasWickets) wickets = w;
      if (inning.display_overs != null) overs = String(inning.display_overs);
    }
  }

  if (!recorded) return { score: '', overs: '' };
  const score = wickets !== null ? `${runs}/${wickets}` : String(runs);
  return { score, overs };
}

function buildTeamScores(statusBlock, competitors) {
  const homeComp = competitors.find((c) => c.qualifier === 'home') ?? competitors[0];
  const awayComp = competitors.find((c) => c.qualifier === 'away') ?? competitors[1];
  const periods = statusBlock.period_scores ?? [];
  const homeTotals = sideTotal(periods, 'home');
  const awayTotals = sideTotal(periods, 'away');

  return {
    home: {
      code: homeComp?.abbreviation ?? '',
      name: homeComp?.name ?? '',
      score: homeTotals.score,
      overs: homeTotals.overs,
    },
    away: {
      code: awayComp?.abbreviation ?? '',
      name: awayComp?.name ?? '',
      score: awayTotals.score,
      overs: awayTotals.overs,
    },
  };
}

function normalizeMock(raw) {
  const innings = raw.score[raw.score.length - 1];
  const battingTeam = innings.inning.split(' ')[0];

  const teamScores = {
    home: {
      code: raw.teams?.[0] ?? '',
      name: raw.teamNames?.[0] ?? raw.teams?.[0] ?? '',
      score: battingTeam === (raw.teamNames?.[0] ?? raw.teams?.[0]) ? `${innings.r}/${innings.w}` : '',
      overs: battingTeam === (raw.teamNames?.[0] ?? raw.teams?.[0]) ? String(innings.o) : '',
    },
    away: {
      code: raw.teams?.[1] ?? '',
      name: raw.teamNames?.[1] ?? raw.teams?.[1] ?? '',
      score: battingTeam !== (raw.teamNames?.[0] ?? raw.teams?.[0]) ? `${innings.r}/${innings.w}` : '',
      overs: battingTeam !== (raw.teamNames?.[0] ?? raw.teams?.[0]) ? String(innings.o) : '',
    },
  };

  return {
    matchId: raw.id,
    status: mapStatus(raw.status),
    teams: raw.teams,
    teamNames: raw.teamNames ?? raw.teams,
    teamScores,
    tournament: raw.tournament ?? null,
    venue: raw.venue ?? null,
    scheduled: raw.scheduled ?? null,
    currentInnings: {
      battingTeam,
      runs: innings.r,
      wickets: innings.w,
      overs: innings.o,
      runRate: computeRunRate(innings.r, innings.o),
    },
    lastEvent: raw.lastEvent
      ? { type: raw.lastEvent.type, runs: raw.lastEvent.runs ?? 0, over: raw.lastEvent.over }
      : { type: 'none', runs: 0, over: 0 },
    displayScore: `${innings.r}/${innings.w}`,
    matchStatus: raw.status,
  };
}

function normalizeSportradar(raw) {
  const event = raw.sport_event ?? {};
  const statusBlock = raw.sport_event_status ?? {};
  const competitors = event.competitors ?? [];

  const teams = competitors.map((c) => c.abbreviation ?? c.name?.slice(0, 3)?.toUpperCase() ?? 'TBD');
  const teamNames = competitors.map((c) => c.name ?? c.abbreviation ?? 'TBD');

  const innings = raw.statistics?.innings ?? [];
  const currentInningNum = statusBlock.current_inning || innings.length;
  const currentInning =
    innings.find((i) => i.number === currentInningNum) ?? innings[innings.length - 1];

  let currentInnings = null;

  if (currentInning) {
    const battingTeamId = currentInning.batting_team;
    const battingComp = competitors.find((c) => c.id === battingTeamId);
    const battingTeamStats = currentInning.teams?.find(
      (t) => t.id === battingTeamId || t.statistics?.batting,
    );
    const batting = battingTeamStats?.statistics?.batting;

    const runs = batting?.runs ?? 0;
    const wickets = batting?.wickets_lost ?? 0;
    const overs = currentInning.overs_completed ?? statusBlock.display_overs ?? 0;

    currentInnings = {
      battingTeam: battingComp?.abbreviation ?? battingTeamId ?? teams[0],
      runs,
      wickets,
      overs: typeof overs === 'number' ? overs : parseFloat(overs) || 0,
      runRate: batting?.run_rate ?? statusBlock.run_rate ?? computeRunRate(runs, overs),
    };
  } else if (statusBlock.period_scores?.length) {
    const period = statusBlock.period_scores[statusBlock.period_scores.length - 1];
    const homeComp = competitors.find((c) => c.qualifier === 'home');
    const awayComp = competitors.find((c) => c.qualifier === 'away');
    const ms = String(statusBlock.match_status ?? '').toLowerCase();
    const awayBattingFirst =
      ms.includes('away') && ms.includes('inning') && !ms.includes('second');
    const inningNum = Number(statusBlock.current_inning) || 1;
    let battingComp = homeComp;
    let runs = period.home_score;
    let wickets = period.home_wickets;
    if (inningNum > 1) {
      battingComp = awayComp;
      runs = period.away_score;
      wickets = period.away_wickets;
    } else if (awayBattingFirst || (period.away_score > 0 && !period.home_score)) {
      battingComp = awayComp;
      runs = period.away_score;
      wickets = period.away_wickets;
    }
    const overs = period.display_overs ?? statusBlock.display_overs ?? 0;

    currentInnings = {
      battingTeam: battingComp?.abbreviation ?? battingComp?.id ?? teams[0],
      runs: runs ?? 0,
      wickets: wickets ?? 0,
      overs: typeof overs === 'number' ? overs : parseFloat(overs) || 0,
      runRate: statusBlock.run_rate ?? computeRunRate(runs ?? 0, overs),
    };
  }

  const rawStatus = statusBlock.status ?? event.status ?? statusBlock.match_status ?? '';
  const canonicalStatus = mapSportradarStatus(rawStatus, statusBlock.match_status);
  const teamScores = buildTeamScores(statusBlock, competitors);

  const homeComp = competitors.find((c) => c.qualifier === 'home') ?? competitors[0];
  const awayComp = competitors.find((c) => c.qualifier === 'away') ?? competitors[1];

  if (currentInnings) {
    const battingSide =
      battingSideFromToken(currentInnings.battingTeam, homeComp, awayComp) ??
      (currentInnings.battingTeam === teamScores.home.code ||
      currentInnings.battingTeam === teamScores.home.name
        ? 'home'
        : 'away');
    const parsed = parseScoreLine(teamScores[battingSide].score);
    const liveWickets = currentInnings.wickets ?? 0;
    const liveRuns = currentInnings.runs ?? 0;
    const useLiveLine =
      liveRuns > 0 ||
      liveWickets > 0 ||
      !parsed ||
      (canonicalStatus === 'live' && (currentInnings.overs ?? 0) > 0);
    if (useLiveLine) {
      teamScores[battingSide].score = `${liveRuns}/${liveWickets}`;
      if (currentInnings.overs != null) {
        teamScores[battingSide].overs = String(currentInnings.overs);
      }
    }
  }

  if (innings.length >= 2) {
    fillTeamScoresFromStatisticsInnings(innings, competitors, teamScores);
  }

  let status = canonicalStatus;
  if (status === 'live' && isMatchDecided(statusBlock, currentInnings, teamScores)) {
    status = 'completed';
  }

  const matchResult =
    statusBlock.match_result_text ??
    (typeof statusBlock.result === 'string' ? statusBlock.result : null) ??
    null;

  const displayOversRaw = statusBlock.display_overs;
  const displayOvers =
    displayOversRaw != null && displayOversRaw !== '' && !Number.isNaN(Number(displayOversRaw))
      ? Number(displayOversRaw)
      : null;

  return {
    matchId: event.id ?? raw.id,
    status,
    teams,
    teamNames,
    teamScores,
    tournament: event.tournament?.name ?? null,
    venue: event.venue?.name ?? raw.venue?.name ?? null,
    scheduled: event.scheduled ?? null,
    currentInnings,
    lastEvent: { type: 'none', runs: 0, over: currentInnings?.overs ?? 0 },
    displayScore: statusBlock.display_score ?? null,
    matchStatus: statusBlock.match_status ?? rawStatus,
    matchResult,
    winnerId: statusBlock.winner_id ?? null,
    tossWonBy: statusBlock.toss_won_by ?? null,
    tossDecision: statusBlock.toss_decision ?? null,
    currentInning:
      statusBlock.current_inning != null && !Number.isNaN(Number(statusBlock.current_inning))
        ? Number(statusBlock.current_inning)
        : null,
    periodScores: statusBlock.period_scores ?? null,
    displayOvers,
  };
}

function parseScoreLine(score) {
  if (!score || typeof score !== 'string') return null;
  const m = score.match(/^(\d+)\/(\d+)/);
  if (!m) return null;
  return { runs: Number(m[1]), wickets: Number(m[2]) };
}

function fillTeamScoresFromStatisticsInnings(inningsList, competitors, teamScores) {
  for (const inn of inningsList) {
    const battingId = inn.batting_team;
    const side = battingSideFromToken(
      battingId,
      competitors.find((c) => c.qualifier === 'home'),
      competitors.find((c) => c.qualifier === 'away'),
    );
    if (!side) continue;
    const batting = inn.teams?.find((t) => t.id === battingId)?.statistics?.batting;
    const runs = batting?.runs ?? 0;
    const wickets = batting?.wickets_lost ?? 0;
    const overs = inn.overs_completed ?? '';
    if (runs > 0 || wickets > 0) {
      teamScores[side].score = `${runs}/${wickets}`;
      if (overs !== '') teamScores[side].overs = String(overs);
    }
  }
}

function isMatchDecided(statusBlock, currentInnings, teamScores) {
  const ms = `${statusBlock.match_status ?? ''} ${statusBlock.status ?? ''}`.toLowerCase();
  if (/won|tied|draw|abandon|all.?out|closed|ended|complete|result/.test(ms)) {
    return true;
  }
  const w = currentInnings?.wickets ?? 0;
  const inning = Number(statusBlock.current_inning) || 1;
  if (inning >= 2 && w >= 10) return true;
  const home = parseScoreLine(teamScores?.home?.score);
  const away = parseScoreLine(teamScores?.away?.score);
  if (inning >= 2 && home?.runs && away?.runs != null && away.wickets >= 10 && away.runs < home.runs) {
    return true;
  }
  return false;
}

function mapSportradarStatus(status, matchStatus) {
  const s = `${status} ${matchStatus ?? ''}`.toLowerCase();
  if (s.includes('cancel') || s.includes('postpon')) {
    return 'cancelled';
  }
  if (s.includes('live') || s.includes('inprogress') || s.includes('in progress') || s.includes('innings')) {
    return 'live';
  }
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

function mapStatus(rawStatus) {
  const s = (rawStatus || '').toLowerCase();
  if (s.includes('cancel') || s.includes('postpon')) return 'cancelled';
  if (s.includes('progress') || s.includes('inning') || s.includes('live')) return 'live';
  if (s.includes('complete') || s.includes('won') || s.includes('tied') || s.includes('abandon')) {
    return 'completed';
  }
  return 'upcoming';
}

function abbrOf(name) {
  return name
    ?.split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Normalize a Sportradar lineups payload into teams + players for the read API.
 * Produces: { teams, players } where teams carry a roster reference via teamId,
 * and players carry teamId + parsed role/flags.
 */
export function normalizeLineups(raw) {
  const sportEvent = raw?.sport_event ?? {};
  const competitors = sportEvent.competitors ?? [];

  const lineupByQualifier = new Map(
    (raw?.lineups ?? []).map((l) => [l.team, l]),
  );

  const teams = [];
  const players = [];

  for (const comp of competitors) {
    const qualifier = comp.qualifier === 'away' ? 'away' : 'home';
    const lineup = lineupByQualifier.get(qualifier);
    const manager = lineup?.manager;
    const team = {
      ...buildTeamFromCompetitor(comp, sportEvent),
      abbr: comp.abbreviation ?? abbrOf(comp.name) ?? 'TBD',
      manager: managerDisplayName(manager),
    };
    teams.push(team);
    if (manager?.id) {
      players.push({
        ...buildPlayerFromLineupEntry(
          { ...manager, type: 'manager', nationality: manager.country_code },
          team.id,
        ),
        role: 'manager',
        countryCode: manager.country_code ?? null,
      });
    }

    for (const p of lineup?.starting_lineup ?? []) {
      const row = buildPlayerFromLineupEntry(p, team.id);
      if (row) players.push(row);
    }
  }

  return { teams, players };
}
