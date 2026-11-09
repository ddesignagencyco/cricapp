process.env.RAPIDAPI_KEY = 'test-key';
process.env.RAPIDAPI_MIN_INTERVAL_MS = '1';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setStore, getRapidStats } from '../src/providers/rapidHttp.js';
import { QuotaExceededError } from '../src/providers/errors.js';
import * as cricbuzz from '../src/providers/cricbuzz.js';
import { cricbuzz2 } from '../src/providers/cricbuzz.js';
import * as facade from '../src/providers/index.js';
import { normalizeMatch } from '../src/normalize.js';
import { PROVIDERS } from '../src/schemas.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/cricbuzz/${name}`, import.meta.url)));

function memoryStore() {
  const data = new Map();
  return {
    data,
    get: async (k) => data.get(k) ?? null,
    set: async (k, v) => void data.set(k, v),
    incr: async (k) => {
      const n = Number(data.get(k) ?? 0) + 1;
      data.set(k, String(n));
      return n;
    },
    expire: async () => {},
  };
}

const realFetch = globalThis.fetch;
let fetchCalls;

function response(status, body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(text),
    text: async () => text,
    clone() {
      return response(status, body);
    },
  };
}

/** `route(url)` returns a body (200) or `{ __http: code, body }`. */
function mockFetch(route) {
  fetchCalls = [];
  globalThis.fetch = async (url) => {
    fetchCalls.push(String(url));
    const out = route(String(url));
    return out?.__http ? response(out.__http, out.body) : response(200, out);
  };
}

/** Serves the recorded list for list endpoints and the recorded scorecard for `/{id}/scard`. */
const recordedRoute = (scards = {}) => (url) => {
  const m = url.match(/mcenter\/v1\/(\d+)\/scard/);
  if (m) return fixture(scards[m[1]]);
  return fixture('live.json');
};
const SCARDS = {
  170703: 'scard-test-live.json',
  172727: 'scard-test-drawn.json',
  176143: 'scard-t10-chase.json',
};
describe('cricbuzz adapter (recorded responses)', () => {
  beforeEach(() => {
    setStore(memoryStore());
    process.env.DATA_PROVIDER = 'cricbuzz';
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.DATA_PROVIDER;
    delete process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET;
  });

  it('maps Cricbuzz states so normalize.js reads them correctly', () => {
    assert.deepEqual(cricbuzz.mapState('In Progress'), { status: 'live', matchStatus: 'inprogress' });
    assert.equal(cricbuzz.mapState('Stumps').status, 'interrupted');
    assert.equal(cricbuzz.mapState('Rain').status, 'interrupted');
    assert.equal(cricbuzz.mapState('Complete').status, 'closed');
    assert.equal(cricbuzz.mapState('Abandoned').matchStatus, 'abandoned');
    assert.equal(cricbuzz.mapState('Upcoming').status, 'not_started');
  });

  it('live schedule returns namespaced ids and statuses', async () => {
    mockFetch(recordedRoute());
    const byId = Object.fromEntries((await facade.fetchLiveSchedule()).map((e) => [e.id, e]));
    assert.equal(byId['cb:match:170703'].status, 'interrupted'); // Test, "Day 1: Stumps"
    assert.equal(byId['cb:match:176143'].status, 'live'); // T10 chase in progress
    assert.equal(byId['cb:match:172727'].status, 'closed'); // drawn Test
    assert.equal(byId['cb:match:170703'].competitors[0].id, 'cb:team:3');
    assert.equal(byId['cb:match:170703'].venue.name, 'Rawalpindi Cricket Stadium');
  });

  it('live Test: score, overs, run rate and toss reach the normalized match', async () => {
    mockFetch(recordedRoute(SCARDS));
    const raw = await facade.fetchMatchSummary('cb:match:170703');
    assert.match(fetchCalls.at(-1), /mcenter\/v1\/170703\/scard$/);
    const m = normalizeMatch(PROVIDERS.SPORTRADAR, raw);
    assert.equal(m.matchId, 'cb:match:170703');
    assert.deepEqual(m.teams, ['PAK', 'SL']);
    assert.equal(m.status, 'live'); // stumps is a pause, not an end
    assert.equal(m.teamScores.home.score, '281/5');
    assert.equal(m.currentInnings.overs, 67.2);
    assert.equal(m.currentInnings.runRate, 4.17);
    assert.equal(m.tossWonBy, 'cb:team:5');
    assert.equal(m.tossDecision, 'field');
    assert.equal(m.matchResult, null);
  });

  it('T10 chase: second innings batting, no result while in progress', async () => {
    mockFetch(recordedRoute(SCARDS));
    const m = normalizeMatch(PROVIDERS.SPORTRADAR, await facade.fetchMatchSummary('cb:match:176143'));
    assert.equal(m.status, 'live');
    assert.equal(m.teamScores.home.score, '81/9');
    assert.equal(m.teamScores.away.score, '37/1');
    assert.equal(m.currentInnings.battingTeam, m.teamScores.away.code);
    assert.equal(m.currentInning, 2);
    assert.equal(m.matchResult, null, 'a chase in progress is not a result');
  });

  it('drawn Test is completed, with the result text and no winner', async () => {
    mockFetch(recordedRoute(SCARDS));
    const m = normalizeMatch(PROVIDERS.SPORTRADAR, await facade.fetchMatchSummary('cb:match:172727'));
    assert.equal(m.status, 'completed');
    assert.equal(m.matchResult, 'Match drawn');
    assert.equal(m.winnerId ?? null, null);
  });

  it('daily results only include finished matches on that date', async () => {
    mockFetch(recordedRoute());
    const { results } = await facade.fetchDailyResults('2026-11-05');
    assert.ok(results.some((r) => r.sport_event.id === 'cb:match:172727'));
    assert.ok(results.every((r) => r.sport_event_status.status === 'closed'));
  });

  it('serves repeat calls from cache without spending quota', async () => {
    mockFetch(recordedRoute());
    await facade.fetchLiveSchedule();
    await facade.fetchLiveSchedule();
    assert.equal(fetchCalls.length, 1);
    assert.ok(getRapidStats().cacheHits >= 1);
  });

  it('blocks calls once the monthly budget is used up', async () => {
    process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET = '1';
    mockFetch(recordedRoute());
    await facade.fetchLiveSchedule();
    await assert.rejects(() => facade.fetchDailySchedule('2026-11-05'), QuotaExceededError);
    assert.equal(fetchCalls.length, 1);
  });

  it('retries once on the per-second 429 instead of treating it as quota exhaustion', async () => {
    let n = 0;
    mockFetch(() =>
      ++n === 1
        ? { __http: 429, body: '{"message":"You have exceeded the rate limit per second for your plan, BASIC"}' }
        : fixture('live.json'),
    );
    const events = await facade.fetchLiveSchedule();
    assert.ok(events.length > 0);
    assert.equal(fetchCalls.length, 2);
  });

  it('a real 429 (not per-second) surfaces as a quota error', async () => {
    mockFetch(() => ({ __http: 429, body: '{"message":"Monthly quota exceeded"}' }));
    await assert.rejects(() => facade.fetchLiveSchedule(), QuotaExceededError);
  });

  it('reports unsupported endpoints instead of guessing', async () => {
    await assert.rejects(() => facade.fetchMatchTimeline('cb:match:1'), /does not support fetchMatchTimeline/);
  });
});

describe('scorecard statistics (recorded T10 chase and live Test)', () => {
  const info = (id) => {
    const live = fixture('live.json');
    return live.typeMatches.flatMap((t) => t.seriesMatches).flatMap((m) => m.seriesAdWrapper?.matches ?? [])
      .map((m) => m.matchInfo).find((i) => i.matchId === id);
  };

  it('every innings adds up: batters runs + extras = the innings score', () => {
    const scard = fixture('scorecard-t10-chase.json');
    const { statistics } = cricbuzz.toStatistics(info(176143), scard);
    assert.equal(statistics.innings.length, 2);
    statistics.innings.forEach((inn, i) => {
      const batting = inn.teams[0].statistics.batting;
      const runs = batting.players.reduce((n, p) => n + p.statistics.runs, 0);
      assert.equal(runs + scard.scorecard[i].extras.total, batting.runs, `innings ${i + 1}`);
      assert.equal(batting.wickets_lost, scard.scorecard[i].wickets);
    });
  });

  it('keeps who bowled and who caught, with fall-of-wicket overs, for the web scorecard', () => {
    const { statistics, competitors } = cricbuzz.toStatistics(info(176143), fixture('scorecard-t10-chase.json'));
    const first = statistics.innings[0];
    const pooran = first.teams[0].statistics.batting.players.find((p) => p.name === 'Nicholas Pooran').statistics;
    assert.equal(pooran.dismissal.type, 'caught');
    assert.equal(pooran.dismissal.bowler_id, 'cb:player:22936'); // Awais Ali
    assert.match(pooran.dismissal.fielder_id, /^cb:player:\d+$/); // Sahibzada Farhan, from the other innings
    assert.deepEqual([pooran.dismissal.over_number, pooran.dismissal.ball_number], [1, 1]); // fell on 0.1
    assert.equal(pooran.order, 1);
    const awais = first.teams[1].statistics.bowling.players.find((p) => p.name === 'Awais Ali').statistics;
    assert.deepEqual([awais.overs_bowled, awais.wickets, awais.conceded_runs], ['2', 2, 16]);
    assert.deepEqual(competitors.map((c) => c.qualifier), ['home', 'away']);
    assert.equal(first.batting_team, competitors[0].id, 'home is the side that batted first');
  });

  it('players still at the crease have no dismissal, players yet to bat are left out', () => {
    const { statistics } = cricbuzz.toStatistics(info(176143), fixture('scorecard-t10-chase.json'));
    const batters = statistics.innings[0].teams[0].statistics.batting.players;
    const notOut = batters.filter((b) => !b.statistics.dismissal);
    assert.ok(notOut.length >= 1 && notOut.every((b) => b.statistics.balls_faced > 0));
  });

  it('parses every dismissal form', () => {
    const names = new Map([['a b', 1], ['c d', 2], ['e f', 3]]);
    const t = (s) => cricbuzz.parseDismissal(s, names);
    assert.deepEqual(t('c A B b C D'), { type: 'caught', bowler: 'cb:player:2', fielder: 'cb:player:1' });
    assert.deepEqual(t('c & b E F'), { type: 'caught', bowler: 'cb:player:3', fielder: 'cb:player:3' });
    assert.equal(t('lbw b C D').type, 'lbw');
    assert.equal(t('b C D').type, 'bowled');
    assert.deepEqual(t('st A B b C D'), { type: 'stumped', bowler: 'cb:player:2', fielder: 'cb:player:1' });
    assert.deepEqual(t('run out (A B/E F)'), { type: 'run_out', bowler: null, fielder: 'cb:player:1' });
    assert.deepEqual(t('c B Azam b C D'), { type: 'caught', bowler: 'cb:player:2', fielder: null }, 'a capital B in a name is not the separator');
    assert.equal(t('not out'), null);
    assert.equal(t('batting'), null);
    assert.equal(t('c Unknown Sub b C D').fielder, null, 'a substitute not in the lists links nowhere');
  });
});

describe('fetchMatchScorecard', () => {
  beforeEach(() => {
    setStore(memoryStore());
    process.env.DATA_PROVIDER = 'cricbuzz';
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.DATA_PROVIDER;
  });

  it('returns competitors and per-player statistics for a Cricbuzz match', async () => {
    mockFetch((url) => (url.includes('/scard') ? fixture('scorecard-t10-chase.json') : fixture('live.json')));
    const { competitors, statistics } = await facade.fetchMatchScorecard('cb:match:176143');
    assert.equal(statistics.innings.length, 2);
    assert.deepEqual(competitors.map((c) => c.qualifier), ['home', 'away']);
    assert.ok(statistics.innings[0].teams[0].statistics.batting.players.length > 5);
  });
});

describe('second Cricbuzz host as a quota pool', () => {
  beforeEach(() => {
    setStore(memoryStore());
    process.env.DATA_PROVIDER = 'auto';
    process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET = '1';
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.DATA_PROVIDER;
    delete process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET;
    delete process.env.RAPIDAPI_CRICBUZZ2_MONTHLY_BUDGET;
  });

  it('falls over to cricbuzz-cricket2 when the first host budget is spent', async () => {
    mockFetch(recordedRoute());
    await facade.fetchLiveSchedule(); // spends the single request of host 1
    const { results } = await facade.fetchDailyResults('2026-11-05'); // other pages → host 1 is blocked
    assert.ok(results.length > 0);
    assert.match(fetchCalls[0], /^https:\/\/cricbuzz-cricket\.p\.rapidapi\.com\//);
    assert.ok(fetchCalls.some((u) => u.startsWith('https://cricbuzz-cricket2.p.rapidapi.com/')));
  });

  it('shares the response cache across both hosts', async () => {
    mockFetch(recordedRoute());
    await facade.fetchLiveSchedule(); // host 1 fetches matches/v1/live
    const before = fetchCalls.length;
    await facade.fetchLiveSchedule(); // cached: neither host is called
    assert.equal(fetchCalls.length, before);
  });

  it('gives each host its own budget counter', async () => {
    process.env.RAPIDAPI_CRICBUZZ2_MONTHLY_BUDGET = '1';
    mockFetch(recordedRoute());
    await facade.fetchLiveSchedule(); // host 1 spends its 1 request
    // A daily schedule reads three pages: live is cached, "recent" falls to host 2
    // (its 1 request), "upcoming" finds both budgets spent.
    await assert.rejects(() => facade.fetchDailySchedule('2026-11-05'), QuotaExceededError);
    assert.equal(fetchCalls.filter((u) => u.includes('cricbuzz-cricket.p.')).length, 1);
    assert.equal(fetchCalls.filter((u) => u.includes('cricbuzz-cricket2.p.')).length, 1);
  });
});

describe('facade fallback', () => {
  afterEach(() => {
    delete process.env.DATA_PROVIDER;
    facade.setModules({ cricbuzz, cricbuzz2, highlightly: {} });
  });

  it('auto falls back to the next provider on quota errors', async () => {
    process.env.DATA_PROVIDER = 'auto';
    facade.setModules({
      cricbuzz: { fetchLiveSchedule: async () => { throw new QuotaExceededError('out'); } },
      cricbuzz2: {},
      highlightly: { fetchLiveSchedule: async () => [{ id: 'hl:match:9', status: 'live' }] },
    });
    assert.deepEqual(await facade.fetchLiveSchedule(), [{ id: 'hl:match:9', status: 'live' }]);
  });

  it('rejects an unknown DATA_PROVIDER', () => {
    process.env.DATA_PROVIDER = 'nope';
    assert.throws(() => facade.providerChain(), /Unknown DATA_PROVIDER/);
  });
});
