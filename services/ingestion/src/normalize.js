import { PROVIDERS } from './schemas.js';
import { resolveWinnerId } from '@cricapp/shared-types';
import { buildTeamFromCompetitor, canonicalTeamAbbr, managerDisplayName } from './teamMeta.js';
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

/** Legal balls in a cricket-notation overs value (14.3 → 87). Null when unparseable. */
function oversToBalls(overs) {
  const n = Number(overs);
  if (overs === null || overs === undefined || overs === '' || !Number.isFinite(n) || n < 0) return null;
  const whole = Math.floor(n);
  return whole * 6 + Math.round((n - whole) * 10);
}

function ballsToOvers(balls) {
  return Number((Math.floor(balls / 6) + (balls % 6) / 10).toFixed(1));
}

/**
 * Overs bowled in an innings, summed ball by ball from the bowlers' figures.
 *
 * This lives in the same `statistics` block as the batting runs, so the two describe
 * the same instant. `overs_completed` in that block only counts whole overs (14 at
 * 14.3), and `sport_event_status.display_overs` is written separately and is often a
 * ball behind the scorecard — pairing either with the scorecard runs produced scores
 * that never existed (60 runs at 14.2 when the scorecard said 60 at 14.3).
 */
function scorecardOvers(inning) {
  const teams = inning?.teams ?? [];
  const bowling =
    teams.find((t) => t.id === inning.bowling_team)?.statistics?.bowling ??
    teams.find((t) => t.statistics?.bowling)?.statistics?.bowling;
  const players = bowling?.players ?? [];
  let balls = 0;
  let counted = false;
  for (const player of players) {
    const b = oversToBalls(player?.statistics?.overs_bowled);
    if (b === null) continue;
    balls += b;
    counted = true;
  }
  return counted && balls > 0 ? ballsToOvers(balls) : null;
}

/** The last "runs/wickets" in a display score ("IND 120/2", "250 & 120/3" → 120/2, 120/3). */
function lastScorePair(displayScore) {
  const all = [...String(displayScore ?? '').matchAll(/(\d+)\/(\d+)/g)];
  const m = all[all.length - 1];
  return m ? { runs: Number(m[1]), wickets: Number(m[2]), index: m.index, text: m[0] } : null;
}

/**
 * Runs, wickets and overs for the current innings, taken from one provider block so
 * they always agree with each other.
 *
 * 1. The scorecard: batting runs/wickets + the bowlers' overs (same block, freshest).
 * 2. The status block's own pair, `display_score` + `display_overs`, when the bowlers'
 *    figures are missing. If the status block disagrees with the scorecard runs, the
 *    status pair is used whole rather than mixed with the scorecard.
 * 3. The scorecard's whole overs, as a last resort.
 */
function consistentInningsLine(inning, batting, statusBlock) {
  const runs = batting?.runs ?? 0;
  const wickets = batting?.wickets_lost ?? 0;
  const fromScorecard = scorecardOvers(inning);
  if (fromScorecard !== null) return { runs, wickets, overs: fromScorecard };

  const statusOvers = statusBlock.display_overs;
  const statusPair = lastScorePair(statusBlock.display_score);
  if (statusOvers != null && statusOvers !== '') {
    if (!statusPair || (statusPair.runs === runs && statusPair.wickets === wickets)) {
      return { runs, wickets, overs: statusOvers };
    }
    return { runs: statusPair.runs, wickets: statusPair.wickets, overs: statusOvers };
  }
  return { runs, wickets, overs: inning.overs_completed ?? 0 };
}

function sideTotal(periodScores, side) {
  let runs = 0;
  let wickets = null;
  let recorded = false;
  let overs = '';
  let oversBalls = null;

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
      if (inning.display_overs != null) {
        overs = String(inning.display_overs);
        const numeric = Number(inning.display_overs);
        if (!Number.isNaN(numeric)) oversBalls = numeric;
      }
    }
  }

  if (!recorded) return { score: '', overs: '', oversBalls: null };
  const score = wickets !== null ? `${runs}/${wickets}` : String(runs);
  return { score, overs, oversBalls };
}

function buildTeamScores(statusBlock, competitors) {
  const homeComp = competitors.find((c) => c.qualifier === 'home') ?? competitors[0];
  const awayComp = competitors.find((c) => c.qualifier === 'away') ?? competitors[1];
  const periods = statusBlock.period_scores ?? [];
  const homeTotals = sideTotal(periods, 'home');
  const awayTotals = sideTotal(periods, 'away');

  return {
    home: {
      id: homeComp?.id ?? '',
      code: canonicalTeamAbbr(homeComp?.abbreviation, homeComp?.name) ?? '',
      name: homeComp?.name ?? '',
      score: homeTotals.score,
      overs: homeTotals.overs,
      oversBalls: homeTotals.oversBalls,
    },
    away: {
      id: awayComp?.id ?? '',
      code: canonicalTeamAbbr(awayComp?.abbreviation, awayComp?.name) ?? '',
      name: awayComp?.name ?? '',
      score: awayTotals.score,
      overs: awayTotals.overs,
      oversBalls: awayTotals.oversBalls,
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

  const teams = competitors.map((c) => canonicalTeamAbbr(c.abbreviation, c.name) ?? c.name?.slice(0, 3)?.toUpperCase() ?? 'TBD');
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

    const { runs, wickets, overs } = consistentInningsLine(currentInning, batting, statusBlock);

    currentInnings = {
      battingTeam: canonicalTeamAbbr(battingComp?.abbreviation, battingComp?.name) ?? battingTeamId ?? teams[0],
      runs,
      wickets,
      overs: typeof overs === 'number' ? overs : parseFloat(overs) || 0,
      // Derived from the same runs/overs written above. Upstream run_rate is a
      // separate field that lags, so it could contradict these two.
      runRate: computeRunRate(runs, overs),
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
      battingTeam: canonicalTeamAbbr(battingComp?.abbreviation, battingComp?.name) ?? battingComp?.id ?? teams[0],
      runs: runs ?? 0,
      wickets: wickets ?? 0,
      overs: typeof overs === 'number' ? overs : parseFloat(overs) || 0,
      // Same derivation as the innings branch above: one source of truth.
      runRate: computeRunRate(runs ?? 0, overs),
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

  // The headline score and overs must describe the same instant as `currentInnings`;
  // the status block is written separately and can trail the scorecard by a ball.
  const displayOversRaw = currentInnings ? currentInnings.overs : statusBlock.display_overs;
  const displayOvers =
    displayOversRaw != null && displayOversRaw !== '' && !Number.isNaN(Number(displayOversRaw))
      ? Number(displayOversRaw)
      : null;
  let displayScore = statusBlock.display_score ?? null;
  const shownPair = lastScorePair(displayScore);
  if (currentInnings && shownPair) {
    const line = `${currentInnings.runs}/${currentInnings.wickets}`;
    if (shownPair.text !== line) {
      displayScore =
        displayScore.slice(0, shownPair.index) + line + displayScore.slice(shownPair.index + shownPair.text.length);
    }
  }

  return {
    matchId: event.id ?? raw.id,
    status,
    teams,
    teamNames,
    teamScores,
    tournament: event.tournament?.name ?? null,
    tournamentId: event.tournament?.id ?? null,
    venue: event.venue?.name ?? raw.venue?.name ?? null,
    scheduled: event.scheduled ?? null,
    currentInnings,
    lastEvent: { type: 'none', runs: 0, over: currentInnings?.overs ?? 0 },
    displayScore,
    matchStatus: statusBlock.match_status ?? rawStatus,
    matchResult,
    // Sportradar often omits winner_id; fall back to the winner named in the result text.
    winnerId: resolveWinnerId(raw),
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
    // Bowlers' overs, not `overs_completed`, which drops the balls of the current over.
    const overs = scorecardOvers(inn) ?? inn.overs_completed ?? '';
    if (runs > 0 || wickets > 0) {
      teamScores[side].score = `${runs}/${wickets}`;
      if (overs !== '') teamScores[side].overs = String(overs);
    }
  }
}

function isMatchDecided(statusBlock, currentInnings, teamScores) {
  const ms = `${statusBlock.match_status ?? ''} ${statusBlock.status ?? ''}`.toLowerCase();
  // Each word must start a token: a bare `ended` also matched "susp-ended", so a
  // rain-suspended match was marked completed mid-game.
  if (/(?<![a-z])(won|tied|draw|abandon|all.?out|closed|ended|complete|result)/.test(ms)) {
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
  // Rain or bad light stops play without ending the match: Sportradar reports it as
  // interrupted / suspended. Mapping that to "upcoming" dropped the match out of the
  // live set mid-game and froze its score until the daily sync hours later.
  if (
    s.includes('live') ||
    s.includes('inprogress') ||
    s.includes('in progress') ||
    s.includes('innings') ||
    s.includes('interrupt') ||
    s.includes('suspend')
  ) {
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
      abbr: canonicalTeamAbbr(comp.abbreviation, comp.name) ?? abbrOf(comp.name) ?? 'TBD',
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
