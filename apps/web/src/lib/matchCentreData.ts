import { currentRunRate, formatCricketOvers } from './cricketMath';
import { parseTimelineEvents, type TimelineEvent } from '../components/MatchTimeline';
import { batterRuns, bowlerRuns } from './commentary';
import { pickMatchSides } from './matchScoreboard';
import { readCompetitors, readStatisticsInnings, readToss, unwrapTimelinePayload } from './matchInnings';
import { readProviderInningsCards } from './matchScorecardData';
import type { BattingRow, BowlingRow } from '../types';

export type InningsScorecard = {
  number: number;
  label: string;
  battingTeam: string;
  bowlingTeam: string;
  batting: BattingRow[];
  bowling: BowlingRow[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrap(payload: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!payload) return null;
  const nested = asRecord(payload.payload);
  if (nested && (nested.timeline || nested.sport_event || nested.statistics)) return nested;
  return payload;
}

function isLegal(event: TimelineEvent): boolean {
  const extra = String(event.extraType || '').toLowerCase().replace(/[-\s]/g, '_');
  return extra !== 'wide' && extra !== 'no_ball' && extra !== 'noball';
}

function isWicket(event: TimelineEvent): boolean {
  return event.type.toLowerCase().includes('wicket') || Boolean(event.dismissal);
}

function scorecardsFromEvents(events: TimelineEvent[]): InningsScorecard[] {
  const innings = new Map<number, { batting: Map<string, BattingRow>; bowling: Map<string, { id: string; balls: number; runs: number; wickets: number; maidens: number; overRuns: number }> }>();

  const bucket = (inning: number) => {
    const key = inning || 1;
    if (!innings.has(key)) innings.set(key, { batting: new Map(), bowling: new Map() });
    return innings.get(key)!;
  };

  for (const event of events) {
    if (event.over === undefined && !event.batsman && !event.bowler) continue;
    const inn = bucket(event.inning || 1);
    if (event.batsman) {
      const row = inn.batting.get(event.batsman) || {
        name: event.batsman,
        // Carried through from the feed so the scorecard can link the name to the player
        // page. It was parsed and then dropped, which is why every batter was plain text.
        id: event.batsmanId || '',
        out: false,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        sr: 0,
      };
      row.runs = Number(row.runs) + batterRuns(event);
      if (isLegal(event) && event.over !== undefined) row.balls = Number(row.balls) + 1;
      const scored = batterRuns(event);
      if (scored === 4) row.fours = Number(row.fours) + 1;
      if (scored === 6) row.sixes = Number(row.sixes) + 1;
      if (isWicket(event) && (event.dismissed === event.batsman || !event.dismissed)) row.out = true;
      const balls = Number(row.balls);
      row.sr = balls > 0 ? Number(((Number(row.runs) / balls) * 100).toFixed(2)) : 0;
      inn.batting.set(event.batsman, row);
    }
    if (event.bowler && event.over !== undefined) {
      const row = inn.bowling.get(event.bowler) || { id: event.bowlerId || '', balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0 };
      // `bowlerRuns` is the single source of truth for what a bowler is charged: the penalty
      // on a wide or a no-ball, nothing at all for a bye, and the runs otherwise. The old
      // `isLegal(event) ? runs + extras : extras || runs` counted the extras a second time
      // because the feed's `runs` already contains them, which also hid every maiden.
      const conceded = bowlerRuns(event);
      row.runs += conceded;
      if (isLegal(event)) {
        row.balls += 1;
        row.overRuns += conceded;
        if (row.balls % 6 === 0) {
          if (row.overRuns === 0) row.maidens += 1;
          row.overRuns = 0;
        }
      }
      if (isWicket(event)) row.wickets += 1;
      inn.bowling.set(event.bowler, row);
    }
  }

  return [...innings.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, inn]) => {
      const bowling = [...inn.bowling.entries()].map(([name, row]) => {
        const overs = formatCricketOvers(Math.floor(row.balls / 6) + (row.balls % 6) / 10) || '0';
        const econ = currentRunRate(row.runs, Number(overs));
        return {
          name,
          id: row.id,
          overs,
          maidens: row.maidens,
          runs: row.runs,
          wickets: row.wickets,
          econ: econ !== null ? Number(econ.toFixed(2)) : '—',
        };
      });
      return {
        number,
        label: `Innings ${number}`,
        battingTeam: '',
        bowlingTeam: '',
        batting: [...inn.batting.values()],
        bowling,
      };
    })
    .filter((inn) => inn.batting.length > 0 || inn.bowling.length > 0);
}

function humanNames(rows: Array<{ name: string }>): boolean {
  return rows.some((row) => row.name && !/^sr:player:|^Player\s+\d+/i.test(row.name));
}

/**
 * Which side batted an innings, and which bowled to it.
 *
 * Resolution order, strongest evidence first:
 *
 *  1. `statistics.innings[].batting_team` — a stable provider competitor id, matched
 *     against `sport_event.competitors[].id`. This is the authoritative mapping and
 *     it is what a Test's third and fourth innings depend on.
 *  2. `sport_event.competitors[].qualifier` via the toss — the side that won the
 *     toss and chose to bat opened, so it anchors the alternation.
 *  3. `matchStatus` text, for payloads that carry neither.
 *  4. Strict alternation from the first innings' side.
 *
 * Innings strictly alternate, so a Test has four of them: odd innings the side that
 * batted first, even innings the other. Returning the same side for every innings
 * after the first mislabels innings 3, 4, 5, ...
 */
function inningsSides(
  match: Record<string, unknown>,
  number: number,
  timeline: Record<string, unknown> | null,
): { battingTeam: string; bowlingTeam: string } {
  const { home, away } = pickMatchSides(match);
  const payload = unwrapTimelinePayload(timeline);
  const competitors = readCompetitors(payload);
  const statistics = readStatisticsInnings(payload);

  const byId = (id: string): 'home' | 'away' | null => {
    if (!id) return null;
    const needle = id.toLowerCase();
    if (competitors.home?.id && competitors.home.id.toLowerCase() === needle) return 'home';
    if (competitors.away?.id && competitors.away.id.toLowerCase() === needle) return 'away';
    return null;
  };

  const stats = statistics.get(number);
  let firstBat: 'home' | 'away' | null = null;
  if (stats) {
    const resolved = byId(stats.battingTeamId) ?? invert(byId(stats.bowlingTeamId));
    if (resolved) {
      const opponent = resolved === 'home' ? 'away' : 'home';
      return {
        battingTeam: resolved === 'home' ? home.name : away.name,
        bowlingTeam: opponent === 'home' ? home.name : away.name,
      };
    }
  }

  const toss = readToss(match, payload);
  if (toss.side) firstBat = toss.side;

  if (!firstBat) {
    const phase = String(match.matchStatus || '');
    firstBat = /first_innings_home|second_innings_away|home_batting/i.test(phase)
      ? 'home'
      : /first_innings_away|second_innings_home|away_batting/i.test(phase)
        ? 'away'
        : null;
  }

  if (!firstBat) {
    firstBat = (() => {
      const first = statistics.get(1);
      if (first) return byId(first.battingTeamId) ?? invert(byId(first.bowlingTeamId));
      return null;
    })();
  }

  if (!firstBat) {
    // With no id, no toss and no statistics, the only evidence left is which side
    // already has a total. Home having one and away having none means home batted
    // first; anything else means away did. This is deliberately the same rule the
    // pre-stable-id code used, so payloads that were already labelled correctly stay
    // labelled correctly.
    const homeScore = String(home.score ?? '').trim();
    firstBat = homeScore ? 'home' : 'away';
  }

  // Innings alternate, so parity from the first-batting side is the whole rule.
  const offset = Math.max(0, number - 1);
  const batting = offset % 2 === 0 ? firstBat : invert(firstBat) ?? firstBat;
  const bowling = invert(batting) ?? batting;
  return {
    battingTeam: batting === 'home' ? home.name : away.name,
    bowlingTeam: bowling === 'home' ? home.name : away.name,
  };
}

function invert(side: 'home' | 'away' | null): 'home' | 'away' | null {
  if (side === 'home') return 'away';
  if (side === 'away') return 'home';
  return null;
}

/**
 * Scorecards read from the provider's `statistics.innings[]` rather than replayed
 * from the ball-by-ball.
 *
 * `overs_bowled` and the dismissal overs arrive already in cricket notation, so
 * they are passed through `formatCricketOvers` rather than re-derived.
 */
function providerScorecards(
  match: Record<string, unknown>,
  timeline: Record<string, unknown> | null,
): InningsScorecard[] {
  const cards = readProviderInningsCards(timeline);
  if (cards.length === 0) return [];
  return cards.map((card) => {
    const sides = inningsSides(match, card.number, timeline);
    const batting: BattingRow[] = card.batting.map((row) => ({
      id: row.id,
      name: row.name,
      out: row.out,
      runs: row.runs ?? 0,
      balls: row.balls ?? 0,
      fours: row.fours ?? 0,
      sixes: row.sixes ?? 0,
      sr: row.strikeRate ?? 0,
    }));
    const bowling: BowlingRow[] = card.bowling.map((row) => ({
      id: row.id,
      name: row.name,
      overs: row.overs,
      maidens: row.maidens ?? 0,
      runs: row.runs ?? 0,
      wickets: row.wickets ?? 0,
      econ: row.economy ?? '—',
    }));
    return labelCard({
      number: card.number,
      battingTeam: card.battingTeamName || sides.battingTeam,
      bowlingTeam: card.bowlingTeamName || sides.bowlingTeam,
      batting,
      bowling,
    });
  });
}

function labelCard(card: Omit<InningsScorecard, 'label'> & { label?: string }): InningsScorecard {
  const batting = card.battingTeam || 'Batting';
  const bowling = card.bowlingTeam || 'Bowling';
  return {
    ...card,
    label: `Innings ${card.number || 1} · ${batting} vs ${bowling}`,
  };
}

export function extractInningsScorecards(
  match: Record<string, unknown>,
  timeline: Record<string, unknown> | null
): InningsScorecard[] {
  // The provider's own figures win when the payload carries them. Rebuilding a
  // scorecard by replaying every ball is a second implementation of cricket, and
  // it disagrees with the provider on maidens, extras and economy.
  const fromProvider = providerScorecards(match, timeline);
  if (fromProvider.length) return fromProvider;

  const fromEvents = scorecardsFromEvents(parseTimelineEvents(timeline)).map((card) => {
    const sides = inningsSides(match, card.number, timeline);
    return labelCard({ ...card, ...sides });
  });
  const stored = Array.isArray(match.inningsScorecards) ? (match.inningsScorecards as InningsScorecard[]) : [];
  if (!stored.length) return fromEvents;
  if (!fromEvents.length) {
    return stored.map((card) => labelCard({ ...card, ...inningsSides(match, card.number, timeline), ...card }));
  }
  const numbers = new Set([...stored.map((inn) => inn.number), ...fromEvents.map((inn) => inn.number)]);
  return [...numbers].sort((a, b) => a - b).map((number) => {
    const api = stored.find((inn) => inn.number === number);
    const live = fromEvents.find((inn) => inn.number === number);
    const sides = inningsSides(match, number, timeline);
    const batting = api?.batting?.length && (!live?.batting.length || humanNames(api.batting) || !humanNames(live.batting))
      ? api.batting
      : live?.batting ?? api?.batting ?? [];
    const bowling = live?.bowling?.length ? live.bowling : api?.bowling ?? [];
    return labelCard({
      number,
      battingTeam: api?.battingTeam || live?.battingTeam || sides.battingTeam,
      bowlingTeam: api?.bowlingTeam || live?.bowlingTeam || sides.bowlingTeam,
      batting,
      bowling,
    });
  });
}

/** A squad entry, carrying the player's id when the payload carries one. */
export type SquadPlayer = { name: string; id: string };

/**
 * Reads the playing XI for both sides.
 *
 * The player's id comes along with the name so a squad can link to the player page. A row
 * the feed gave us as a bare string has no id, so it is listed as plain text rather than
 * linked to a guessed slug.
 */
export function extractSquads(
  match: Record<string, unknown>,
  timeline: Record<string, unknown> | null
): { home: SquadPlayer[]; away: SquadPlayer[] } {
  const { home: homeSide } = pickMatchSides(match);
  const teams = asRecord(match.teams);
  const toPlayer = (item: unknown): SquadPlayer | null => {
    if (typeof item === 'string') {
      const name = item.trim();
      return name ? { name, id: '' } : null;
    }
    const rec = asRecord(item);
    if (!rec) return null;
    const name = String(rec.name || rec.full_name || rec.short_name || '').trim();
    if (!name) return null;
    const id = String(rec.id || rec.player_id || rec.playerId || '').trim();
    return { name, id: /^\s*$/.test(id) ? '' : id };
  };
  const read = (side: Record<string, unknown> | null) => {
    const raw = side?.players || side?.lineup || side?.squad || side?.xi;
    if (!Array.isArray(raw)) return [];
    return raw.map(toPlayer).filter((row): row is SquadPlayer => row !== null);
  };
  let home = read(asRecord(teams?.home));
  let away = read(asRecord(teams?.away));
  if (home.length && away.length) return { home, away };

  const payload = unwrap(timeline);
  const lineups = payload ? (payload.lineups as unknown) : null;
  if (Array.isArray(lineups)) {
    for (const lineup of lineups) {
      const rec = asRecord(lineup);
      const names = Array.isArray(rec?.starting_lineup)
        ? rec.starting_lineup.map(toPlayer).filter((row): row is SquadPlayer => row !== null)
        : [];
      if (rec?.team === 'home') home = names;
      if (rec?.team === 'away') away = names;
    }
  }
  if (home.length && away.length) return { home, away };

  const cards = extractInningsScorecards(match, timeline);
  const homeNames = new Map<string, SquadPlayer>();
  const awayNames = new Map<string, SquadPlayer>();
  home.forEach((row) => homeNames.set(row.name, row));
  away.forEach((row) => awayNames.set(row.name, row));
  for (const card of cards) {
    const battingIsHome = card.battingTeam === homeSide.name;
    const bat = battingIsHome ? homeNames : awayNames;
    const bowl = battingIsHome ? awayNames : homeNames;
    // A name the lineup did not have, found on the scorecard, still gets an entry so the
    // side is complete. It carries no id, because the scorecard row did not give us one,
    // so it stays plain text rather than linking to a guess.
    card.batting.forEach((row) => {
      if (row.name && !bat.has(row.name)) bat.set(row.name, { name: row.name, id: '' });
    });
    card.bowling.forEach((row) => {
      if (row.name && !bowl.has(row.name)) bowl.set(row.name, { name: row.name, id: '' });
    });
  }
  return { home: [...homeNames.values()], away: [...awayNames.values()] };
}
