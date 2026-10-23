import { commentary, matches, scorecards } from './mock/matches';
import { predictions } from './mock/insights';
import { playerShort } from './refs';
import type { Ball, BallOutcome, Innings, Match, Prediction } from './types';

/*
 * Live feed simulator for the featured match. It stands in for the
 * WebSocket / SSE stream the backend will push: screens subscribe, receive
 * a fresh snapshot after each ball, and never refetch the page.
 */

const LIVE_ID = 'm1';
const TICK_MS = 9000;

type Listener = () => void;

interface State {
  match: Match;
  card: Innings[];
  balls: Ball[];
  prediction: Prediction;
  bowlerOrder: string[];
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

let state: State | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();

function init(): State {
  const match = clone(matches.find(m => m.id === LIVE_ID)!);
  return {
    match,
    card: clone(scorecards[LIVE_ID]),
    balls: clone(commentary[LIVE_ID]),
    prediction: clone(predictions[LIVE_ID]),
    bowlerOrder: ['rabada', 'jansen', 'ngidi', 'rabada', 'jansen'],
  };
}

const oversText = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

/** Chasing side's win probability from runs needed, balls and wickets left. */
function chaseProbability(need: number, ballsLeft: number, wicketsLeft: number) {
  if (need <= 0) return 1;
  if (ballsLeft <= 0 || wicketsLeft <= 0) return 0;
  const capacity = (ballsLeft / 6) * 12 * (0.55 + 0.45 * (wicketsLeft / 10));
  return 1 / (1 + Math.exp(-(capacity - need) / 11));
}

function roll(): BallOutcome {
  const r = Math.random();
  if (r < 0.28) return { kind: 'runs', runs: 0 };
  if (r < 0.62) return { kind: 'runs', runs: 1 };
  if (r < 0.72) return { kind: 'runs', runs: 2 };
  if (r < 0.85) return { kind: 'four' };
  if (r < 0.92) return { kind: 'six' };
  if (r < 0.97) return { kind: 'wicket', text: '' };
  return { kind: 'extra', label: 'wd', runs: 1 };
}

const lines: Record<string, string[]> = {
  '0': ['Good length outside off, left alone.', 'Full and straight, defended back to the bowler.', 'Beaten! Lovely shape away from the bat.'],
  '1': ['Worked off the pads for a single.', 'Dabbed to third man, they take one.', 'Pushed to long-on for one.'],
  '2': ['Driven into the gap, they come back for two.', 'Flicked to deep square, quick running gets two.'],
  four: ['FOUR! Cracking drive through the covers.', 'FOUR! Pulled hard, beats deep square.', 'FOUR! Edged, and it flies past the keeper.'],
  six: ['SIX! Launched over long-on, into the stands.', 'SIX! Picked the slower ball and cleared midwicket.'],
  wicket: ['OUT! Holes out to long-off. Huge moment.', 'OUT! Bowled him — the stumps are a mess.'],
  wd: ['Wide. Strays down the leg side.'],
};
const pick = (k: string) => lines[k][Math.floor(Math.random() * lines[k].length)];

function step(s: State) {
  const m = s.match;
  const inn = m.innings[1];
  const card = s.card[1];
  if (m.status !== 'live') return;

  const outcome = roll();
  const striker = card.batting.find(b => b.onStrike && !b.dismissal)!;
  const nonStriker = card.batting.find(b => !b.onStrike && !b.dismissal)!;
  const bowler = card.bowling.find(b => b.current)!;
  const legal = outcome.kind !== 'extra';
  let runs = 0;
  let key = '0';

  switch (outcome.kind) {
    case 'runs':
      runs = outcome.runs;
      key = String(runs);
      break;
    case 'four':
      runs = 4;
      key = 'four';
      striker.fours++;
      break;
    case 'six':
      runs = 6;
      key = 'six';
      striker.sixes++;
      break;
    case 'extra':
      runs = 1;
      key = 'wd';
      card.extras.wides++;
      break;
    case 'wicket':
      key = 'wicket';
      break;
  }

  inn.runs += runs;
  bowler.runs += runs;
  if (legal) {
    inn.balls++;
    bowler.balls++;
    striker.balls++;
    if (outcome.kind !== 'wicket') striker.runs += runs;
  }
  const overIndex = Math.floor((inn.balls - 1) / 6);
  card.overRuns[overIndex] = (card.overRuns[overIndex] ?? 0) + runs;
  m.live!.partnership.runs += runs;
  if (legal) m.live!.partnership.balls++;

  const ballId = oversText(inn.balls);
  const textOutcome: BallOutcome = outcome;
  if (outcome.kind === 'wicket') {
    inn.wickets++;
    bowler.wickets++;
    card.overWickets[overIndex] = (card.overWickets[overIndex] ?? 0) + 1;
    striker.dismissal = `c Miller b ${playerShort(bowler.playerId)}`;
    striker.onStrike = false;
    (textOutcome as { text: string }).text = `${playerShort(striker.playerId)} ${striker.runs} (${striker.balls})`;
    m.live!.lastWicket = `${playerShort(striker.playerId)} ${striker.runs} (${striker.balls}) · ${striker.dismissal}`;
    m.live!.partnership = { runs: 0, balls: 0 };
    card.fow.push({ score: inn.runs, wicket: inn.wickets, balls: inn.balls, playerId: striker.playerId });
    const next = card.yetToBat.shift();
    if (next) card.batting.push({ playerId: next, runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: true });
  } else if (runs % 2 === 1 && outcome.kind === 'runs') {
    striker.onStrike = false;
    nonStriker.onStrike = true;
  }

  s.balls.unshift({
    id: `${ballId}-${Date.now()}`,
    over: legal ? ballId : `${ballId}`,
    outcome: textOutcome,
    text: pick(key),
    bowler: playerShort(bowler.playerId),
    batter: playerShort(striker.playerId),
  });
  m.live!.recent = [...m.live!.recent.slice(-11), outcome];

  // End of over: swap strike and change bowler.
  if (legal && inn.balls % 6 === 0) {
    const a = card.batting.find(b => b.onStrike && !b.dismissal);
    const c = card.batting.find(b => !b.onStrike && !b.dismissal);
    if (a && c) {
      a.onStrike = false;
      c.onStrike = true;
    }
    bowler.current = false;
    // Prefer the planned order, then anyone with overs left who didn't bowl the last one.
    const eligible = card.bowling.filter(b => b.balls < 24 && b !== bowler);
    const planned = s.bowlerOrder.map(id => eligible.find(b => b.playerId === id)).find(Boolean);
    let nextBowler = planned ?? eligible.sort((x, y) => x.balls - y.balls)[0];
    if (!nextBowler) {
      nextBowler = { playerId: 'bosch', balls: 0, maidens: 0, runs: 0, wickets: 0 };
      card.bowling.push(nextBowler);
    }
    s.bowlerOrder = s.bowlerOrder.filter(id => id !== nextBowler.playerId);
    nextBowler.current = true;
  }

  const need = (m.target ?? 0) - inn.runs;
  const ballsLeft = 120 - inn.balls;
  const p = chaseProbability(need, ballsLeft, 10 - inn.wickets);
  m.live!.crr = inn.balls ? +(inn.runs / (inn.balls / 6)).toFixed(2) : 0;
  m.live!.rrr = ballsLeft > 0 ? +((need / ballsLeft) * 6).toFixed(2) : 0;

  const pred = s.prediction;
  pred.winA = +p.toFixed(3);
  pred.generatedAt = new Date().toISOString();
  pred.history = [...(pred.history ?? []), { over: +(inn.balls / 6).toFixed(2), p, event: outcome.kind === 'wicket' ? 'wicket' : outcome.kind === 'six' ? 'six' : undefined }];

  if (need <= 0) {
    m.status = 'completed';
    m.result = { winnerId: 'pak', text: `Pakistan won by ${10 - inn.wickets} wickets` };
    m.statusText = m.result.text;
    stop();
  } else if (ballsLeft <= 0 || inn.wickets >= 10) {
    m.status = 'completed';
    m.result = need === 1 ? { text: 'Match tied' } : { winnerId: 'sa', text: `South Africa won by ${need - 1} runs` };
    m.statusText = m.result.text;
    stop();
  } else {
    m.statusText = `Pakistan need ${need} run${need === 1 ? '' : 's'} from ${ballsLeft} ball${ballsLeft === 1 ? '' : 's'}`;
  }

  // New object identities so React sees the change.
  s.match = { ...m, innings: m.innings.map(i => ({ ...i })), live: m.live && { ...m.live } };
  s.card = s.card.map(i => ({ ...i, batting: i.batting.map(x => ({ ...x })), bowling: i.bowling.map(x => ({ ...x })) }));
  s.balls = [...s.balls];
  s.prediction = { ...pred };
  listeners.forEach(l => l());
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  // Demo only: replay the chase so there is always a live match to look at.
  setTimeout(() => {
    state = init();
    listeners.forEach(l => l());
    liveState.start();
  }, 45_000);
}

export const liveState = {
  start() {
    if (!state) state = init();
    if (!timer && state.match.status === 'live') timer = setInterval(() => state && step(state), TICK_MS);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    liveState.start();
    return () => {
      listeners.delete(listener);
    };
  },
  match: (id: string) => (id === LIVE_ID ? state?.match : undefined),
  scorecard: (id: string) => (id === LIVE_ID ? state?.card : undefined),
  commentary: (id: string) => (id === LIVE_ID ? state?.balls : undefined),
  prediction: (id: string) => (id === LIVE_ID ? state?.prediction : undefined),
  isLive: (id: string) => id === LIVE_ID,
};
