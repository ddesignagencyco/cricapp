import { currentRunRate, formatCricketOvers } from './cricketMath';
import { parseTimelineEvents, type TimelineEvent } from '../components/MatchTimeline';
import { pickMatchSides } from './matchScoreboard';
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
  const innings = new Map<number, { batting: Map<string, BattingRow>; bowling: Map<string, { balls: number; runs: number; wickets: number; maidens: number; overRuns: number }> }>();

  const bucket = (inning: number) => {
    const key = inning || 1;
    if (!innings.has(key)) innings.set(key, { batting: new Map(), bowling: new Map() });
    return innings.get(key)!;
  };

  for (const event of events) {
    if (event.over === undefined && !event.batsman && !event.bowler) continue;
    const inn = bucket(event.inning || 1);
    const runs = Number(event.runs) || 0;
    const extras = Number(event.extras) || 0;
    if (event.batsman) {
      const row = inn.batting.get(event.batsman) || {
        name: event.batsman,
        out: false,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        sr: 0,
      };
      row.runs = Number(row.runs) + runs;
      if (isLegal(event) && event.over !== undefined) row.balls = Number(row.balls) + 1;
      if (runs === 4) row.fours = Number(row.fours) + 1;
      if (runs === 6) row.sixes = Number(row.sixes) + 1;
      if (isWicket(event) && (event.dismissed === event.batsman || !event.dismissed)) row.out = true;
      const balls = Number(row.balls);
      row.sr = balls > 0 ? Number(((Number(row.runs) / balls) * 100).toFixed(2)) : 0;
      inn.batting.set(event.batsman, row);
    }
    if (event.bowler && event.over !== undefined) {
      const row = inn.bowling.get(event.bowler) || { balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0 };
      const conceded = isLegal(event) ? runs + extras : extras || runs;
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

function inningsSides(match: Record<string, unknown>, number: number): { battingTeam: string; bowlingTeam: string } {
  const { home, away } = pickMatchSides(match);
  const phase = String(match.matchStatus || '');
  const homeFirst =
    /first_innings_home|second_innings_away|home_batting/i.test(phase) ||
    (!/first_innings_away|second_innings_home|away_batting/i.test(phase) && Boolean(home.score));
  const firstBat = homeFirst ? home.name : away.name;
  const firstBowl = homeFirst ? away.name : home.name;
  if (number <= 1) return { battingTeam: firstBat, bowlingTeam: firstBowl };
  return { battingTeam: firstBowl, bowlingTeam: firstBat };
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
  const fromEvents = scorecardsFromEvents(parseTimelineEvents(timeline)).map((card) => {
    const sides = inningsSides(match, card.number);
    return labelCard({ ...card, ...sides });
  });
  const stored = Array.isArray(match.inningsScorecards) ? (match.inningsScorecards as InningsScorecard[]) : [];
  if (!stored.length) return fromEvents;
  if (!fromEvents.length) {
    return stored.map((card) => labelCard({ ...card, ...inningsSides(match, card.number), ...card }));
  }
  const numbers = new Set([...stored.map((inn) => inn.number), ...fromEvents.map((inn) => inn.number)]);
  return [...numbers].sort((a, b) => a - b).map((number) => {
    const api = stored.find((inn) => inn.number === number);
    const live = fromEvents.find((inn) => inn.number === number);
    const sides = inningsSides(match, number);
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

export function extractSquads(
  match: Record<string, unknown>,
  timeline: Record<string, unknown> | null
): { home: string[]; away: string[] } {
  const { home: homeSide } = pickMatchSides(match);
  const teams = asRecord(match.teams);
  const read = (side: Record<string, unknown> | null) => {
    const raw = side?.players || side?.lineup || side?.squad || side?.xi;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => (typeof item === 'string' ? item : String((item as { name?: string }).name || '')))
      .filter(Boolean);
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
        ? rec.starting_lineup
            .map((player) => String((player as { name?: string }).name || ''))
            .filter(Boolean)
        : [];
      if (rec?.team === 'home') home = names;
      if (rec?.team === 'away') away = names;
    }
  }
  if (home.length && away.length) return { home, away };

  const cards = extractInningsScorecards(match, timeline);
  const homeNames = new Set<string>(home);
  const awayNames = new Set<string>(away);
  for (const card of cards) {
    const battingIsHome = card.battingTeam === homeSide.name;
    const bat = battingIsHome ? homeNames : awayNames;
    const bowl = battingIsHome ? awayNames : homeNames;
    card.batting.forEach((row) => row.name && bat.add(row.name));
    card.bowling.forEach((row) => row.name && bowl.add(row.name));
  }
  return { home: [...homeNames], away: [...awayNames] };
}
