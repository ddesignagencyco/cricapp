/**
 * A player's numbers across the scorecards this app has stored. These are not career figures:
 * they cover only the matches we track, and the API says how many that is.
 */

export interface BattingInnings {
  runs?: number | null;
  balls_faced?: number | null;
  fours?: number | null;
  sixes?: number | null;
  dismissal?: unknown;
}

export interface BowlingSpell {
  overs_bowled?: string | number | null;
  maidens?: number | null;
  conceded_runs?: number | null;
  wickets?: number | null;
}

export interface TrackedStats {
  matches: number;
  batting: {
    innings: number;
    runs: number;
    balls: number;
    notOuts: number;
    highest: number;
    highestNotOut: boolean;
    average: number | null;
    strikeRate: number | null;
    fifties: number;
    hundreds: number;
    fours: number;
    sixes: number;
    ducks: number;
  } | null;
  bowling: {
    innings: number;
    overs: string;
    maidens: number;
    runs: number;
    wickets: number;
    average: number | null;
    economy: number | null;
    strikeRate: number | null;
    best: string;
    fourWickets: number;
    fiveWickets: number;
  } | null;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round = (v: number, dp = 2): number => Number(v.toFixed(dp));

/** Cricket overs notation: "3.2" is 3 overs and 2 balls, not 3.2 overs. */
export function oversToBalls(overs: string | number | null | undefined): number {
  const [whole, part] = String(overs ?? '0').split('.');
  return num(whole) * 6 + Math.min(5, num(part));
}

export function ballsToOvers(balls: number): string {
  return `${Math.floor(balls / 6)}${balls % 6 ? `.${balls % 6}` : ''}`;
}

export function aggregateTrackedStats(
  batting: Array<{ matchId: string; s: BattingInnings }>,
  bowling: Array<{ matchId: string; s: BowlingSpell }>,
): TrackedStats {
  const matches = new Set([...batting, ...bowling].map((r) => r.matchId)).size;

  let bat: TrackedStats['batting'] = null;
  if (batting.length) {
    const b = { innings: 0, runs: 0, balls: 0, notOuts: 0, highest: -1, highestNotOut: false, fifties: 0, hundreds: 0, fours: 0, sixes: 0, ducks: 0 };
    for (const { s } of batting) {
      const runs = num(s.runs);
      const out = Boolean(s.dismissal);
      b.innings += 1;
      b.runs += runs;
      b.balls += num(s.balls_faced);
      b.fours += num(s.fours);
      b.sixes += num(s.sixes);
      if (!out) b.notOuts += 1;
      if (out && runs === 0) b.ducks += 1;
      if (runs >= 100) b.hundreds += 1;
      else if (runs >= 50) b.fifties += 1;
      if (runs > b.highest || (runs === b.highest && !out)) {
        b.highest = runs;
        b.highestNotOut = !out;
      }
    }
    const dismissals = b.innings - b.notOuts;
    bat = {
      ...b,
      highest: Math.max(0, b.highest),
      average: dismissals > 0 ? round(b.runs / dismissals) : null,
      strikeRate: b.balls > 0 ? round((b.runs / b.balls) * 100) : null,
    };
  }

  let bowl: TrackedStats['bowling'] = null;
  const spells = bowling.filter((r) => oversToBalls(r.s.overs_bowled) > 0);
  if (spells.length) {
    let balls = 0, maidens = 0, runs = 0, wickets = 0, four = 0, five = 0;
    let best = { w: -1, r: 0 };
    for (const { s } of spells) {
      const w = num(s.wickets);
      const r = num(s.conceded_runs);
      balls += oversToBalls(s.overs_bowled);
      maidens += num(s.maidens);
      runs += r;
      wickets += w;
      if (w >= 5) five += 1;
      else if (w >= 4) four += 1;
      if (w > best.w || (w === best.w && r < best.r)) best = { w, r };
    }
    bowl = {
      innings: spells.length,
      overs: ballsToOvers(balls),
      maidens,
      runs,
      wickets,
      average: wickets > 0 ? round(runs / wickets) : null,
      economy: balls > 0 ? round((runs / balls) * 6) : null,
      strikeRate: wickets > 0 ? round(balls / wickets, 1) : null,
      best: `${best.w}/${best.r}`,
      fourWickets: four,
      fiveWickets: five,
    };
  }

  return { matches, batting: bat, bowling: bowl };
}
