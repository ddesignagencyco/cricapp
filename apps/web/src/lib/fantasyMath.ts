import { cricketOvers } from './cricketMath';

export type FantasyFormat = 't20' | 'odi';

export interface FantasyLine {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissed: boolean;
  wickets: number;
  overs: number;
  maidens: number;
  bowlRuns: number;
  catches: number;
  stumpings: number;
  runOuts: number;
}

function srPoints(runs: number, balls: number, format: FantasyFormat): number {
  if (balls < (format === 't20' ? 10 : 20)) return 0;
  const sr = (runs / balls) * 100;
  if (format === 't20') {
    if (sr > 170) return 6;
    if (sr > 150) return 4;
    if (sr > 130) return 2;
    if (sr < 50) return -6;
    if (sr < 60) return -4;
    if (sr < 70) return -2;
    return 0;
  }
  if (sr > 140) return 6;
  if (sr > 120) return 4;
  if (sr > 100) return 2;
  if (sr < 40) return -6;
  if (sr < 50) return -4;
  if (sr < 60) return -2;
  return 0;
}

function econPoints(bowlRuns: number, overs: number, format: FantasyFormat): number {
  const decimal = cricketOvers(overs);
  if (decimal === null || decimal < 2) return 0;
  const econ = bowlRuns / decimal;
  if (format === 't20') {
    if (econ < 5) return 6;
    if (econ < 6) return 4;
    if (econ < 7) return 2;
    if (econ > 12) return -6;
    if (econ > 11) return -4;
    if (econ > 10) return -2;
    return 0;
  }
  if (econ < 2.5) return 6;
  if (econ < 3.5) return 4;
  if (econ < 4.5) return 2;
  if (econ > 8) return -6;
  if (econ > 7) return -4;
  if (econ > 6) return -2;
  return 0;
}

/** Informational Dream11-style T20/ODI points — not an official contest scorer. */
export function fantasyPoints(line: FantasyLine, format: FantasyFormat): number {
  let pts = line.runs + line.fours + line.sixes * 2;
  if (line.runs >= 100) pts += format === 't20' ? 16 : 16;
  else if (line.runs >= 50) pts += format === 't20' ? 8 : 8;
  else if (line.runs >= 30 && format === 't20') pts += 4;
  if (line.dismissed && line.runs === 0) pts -= 2;
  pts += srPoints(line.runs, line.balls, format);

  pts += line.wickets * 25;
  if (line.wickets >= 5) pts += 16;
  else if (line.wickets >= 4) pts += 8;
  else if (line.wickets >= 3) pts += 4;
  pts += line.maidens * (format === 't20' ? 12 : 4);
  pts += econPoints(line.bowlRuns, line.overs, format);

  pts += line.catches * 8;
  pts += line.stumpings * 12;
  pts += line.runOuts * 6;
  return pts;
}

export const emptyFantasyLine = (): FantasyLine => ({
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  dismissed: false,
  wickets: 0,
  overs: 0,
  maidens: 0,
  bowlRuns: 0,
  catches: 0,
  stumpings: 0,
  runOuts: 0,
});
