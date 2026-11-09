process.env.RAPIDAPI_KEY = 'test-key';
process.env.RAPIDAPI_MIN_INTERVAL_MS = '1';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setStore } from '../src/providers/rapidHttp.js';
import { ProviderUnsupportedError } from '../src/providers/errors.js';
import * as live1 from '../src/providers/live1.js';
import * as facade from '../src/providers/index.js';
import { normalizeStandings, normalizeSquad } from '../src/psl.js';

// Fixtures are responses recorded from cricbuzz-live1 on 2026-11-09 (images and unused fields removed).
const fx = (dir, name) => JSON.parse(readFileSync(new URL(`./fixtures/${dir}/${name}`, import.meta.url)));
const live1Fx = (name) => fx('live1', name);

function memoryStore() {
  const data = new Map();
  return {
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
let calls;
function mockFetch(route) {
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const body = route(String(url));
    if (body === undefined) throw new Error(`unrouted ${url}`);
    const text = JSON.stringify(body);
    return { ok: true, status: 200, json: async () => JSON.parse(text), text: async () => text, clone() { return this; } };
  };
}

/** Routes every host the tests touch to the recorded responses. */
const route = (url) => {
  if (url.includes('/scard')) return fx('cricbuzz', 'scorecard-t10-chase.json');
  if (url.includes('/commentary')) return live1Fx('commentary-psl-inn2.json');
  if (url.includes('/point-table')) return live1Fx('point-table.json');
  if (url.includes('/squads')) return live1Fx('squads.json');
  if (url.includes('match/schedule')) return live1Fx('schedule-live.json');
  if (url.includes('matches/v1/')) return fx('cricbuzz', 'live.json');
  return undefined;
};

beforeEach(() => {
  setStore(memoryStore());
  mockFetch(route);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.DATA_PROVIDER;
});

describe('live1 timeline (recorded PSL match, second innings)', () => {
  it('turns every delivery into one event and merges the wicket widgets', async () => {
    const entries = live1Fx('commentary-psl-inn2.json');
    const t = live1.toTimeline(entries, 'lv:match:sx_wVYScYVr');
    assert.equal(t.timeline.length, entries.filter((e) => e.ballType === 'ball').length);
    assert.equal(t.timeline.filter((e) => e.type === 'wicket').length, 10, 'HK lost 10 wickets, not 20');
  });

  it('per-ball runs add up to the real innings total and the score tracks it', () => {
    const t = live1.toTimeline(live1Fx('commentary-psl-inn2.json'), 'x');
    assert.equal(t.timeline.reduce((n, e) => n + e.runs, 0), 130);
    assert.equal(t.timeline.at(-1).display_score, '130/10');
    assert.equal(t.sport_event_status.display_score, '130/10');
    assert.deepEqual(t.sport_event_status.period_scores, [
      { number: 2, away_score: 130, away_wickets: 10, display_overs: '19.6' },
    ]);
  });

  it('is chronological with strictly increasing sequence', () => {
    const { timeline } = live1.toTimeline(live1Fx('commentary-psl-inn2.json'), 'x');
    for (let i = 1; i < timeline.length; i++) assert.ok(timeline[i].sequence > timeline[i - 1].sequence);
    assert.equal(timeline[0].display_overs, '0.1');
  });

  it('marks extras the way the web reads them', () => {
    const { timeline } = live1.toTimeline(live1Fx('commentary-psl-inn2.json'), 'x');
    const nb = timeline.find((e) => e.bowling_params.extra_runs_type === 'no_ball');
    assert.equal(nb.runs, 2); // total on the ball
    assert.equal(nb.bowling_params.extra_runs_conceded, 1); // the penalty
    const wd = timeline.find((e) => e.bowling_params.extra_runs_type === 'wide');
    assert.equal(wd.runs, 1);
    assert.ok(timeline.some((e) => e.bowling_params.extra_runs_type === 'leg_bye'));
  });

  it('carries dismissal type and the dismissed player', () => {
    const { timeline } = live1.toTimeline(live1Fx('commentary-psl-inn2.json'), 'x');
    const wickets = timeline.filter((e) => e.type === 'wicket');
    assert.ok(wickets.every((w) => w.dismissal_params.player.name && w.dismissal_params.player.id.startsWith('lv:player:')));
    const kinds = new Set(wickets.map((w) => w.dismissal_params.dismissal_details.type));
    assert.ok(kinds.has('run_out') && kinds.has('caught') && kinds.has('bowled'), [...kinds].join());
  });

  it('classifies dismissal text', () => {
    assert.equal(live1.dismissalType('Out LBW !! carrom ball'), 'lbw');
    assert.equal(live1.dismissalType('Spectacular Run out!!'), 'run_out');
    assert.equal(live1.dismissalType('and is perfectly caught by Saim Ayub'), 'caught');
    assert.equal(live1.dismissalType('somebody gone'), 'wicket');
  });

  it('fetches a lv match directly and stores it under the caller id', async () => {
    const t = await live1.fetchMatchTimeline('lv:match:sx_wVYScYVr');
    assert.equal(t.sport_event.id, 'lv:match:sx_wVYScYVr');
    assert.match(calls[0], /\/cricket\/api\/v2\/match\/sx_wVYScYVr\/commentary$/);
    assert.equal(t.statistics, undefined, 'a live1-only match has no Cricbuzz scorecard to attach');
  });

  it('delta returns only events after the given sequence', async () => {
    const full = await live1.fetchMatchTimeline('lv:match:sx_wVYScYVr');
    const since = full.timeline[99].sequence;
    const delta = await live1.fetchMatchTimelineDelta('lv:match:sx_wVYScYVr', since);
    assert.equal(delta.timeline.length, full.timeline.length - 100);
  });
});

describe('cricbuzz id → live1 match mapping', () => {
  beforeEach(() => {
    process.env.DATA_PROVIDER = 'auto';
  });

  it('finds the live1 match by team pair and start time, and remembers it', async () => {
    const t = await facade.fetchMatchTimeline('cb:match:176143'); // RDC v UT, Abu Dhabi T10
    assert.equal(t.sport_event.id, 'cb:match:176143', 'stored under the poller\'s id');
    assert.ok(calls.some((u) => u.includes('/match/sx_1n3nEZvc/commentary')), calls.join('\n'));
    // the scorecard the web draws is attached to the same payload
    assert.equal(t.statistics.innings.length, 2);
    assert.deepEqual(t.sport_event.competitors.map((c) => c.qualifier), ['home', 'away']);
    assert.ok(t.statistics.innings[0].teams[0].statistics.batting.players.length >= 5);
    const before = calls.filter((u) => u.includes('match/schedule')).length;
    await live1.fetchMatchTimeline('cb:match:176143'); // lookup is remembered; commentary is cached
    assert.equal(calls.filter((u) => u.includes('match/schedule')).length, before);
  });

  it('still returns the commentary when the scorecard cannot be fetched', async () => {
    mockFetch((url) => (url.includes('/scard') ? { message: 'x' } && undefined : route(url)));
    const t = await facade.fetchMatchTimeline('cb:match:176143');
    assert.ok(t.timeline.length > 0);
    assert.equal(t.statistics, undefined);
  });

  it('a match live1 does not list still gets its scorecard (no commentary)', async () => {
    mockFetch((url) => (url.includes('match/schedule') ? [] : route(url)));
    const t = await facade.fetchMatchTimeline('cb:match:176143');
    assert.deepEqual(t.timeline, []);
    assert.equal(t.statistics.innings.length, 2);
    assert.equal(t.sport_event.id, 'cb:match:176143');
  });

  it('refuses ids it cannot map instead of guessing', async () => {
    await assert.rejects(() => live1.fetchMatchTimeline('sr:match:1'), ProviderUnsupportedError);
  });
});

describe('PSL standings, tournament teams and squads', () => {
  it('standings map to the shape psl.js normalizes', async () => {
    const raw = await live1.fetchSeasonStandingsRaw('sr:season:140552');
    assert.match(calls[0], /\/series\/sx_hCVTIvl\/point-table$/);
    const rows = normalizeStandings(raw.standings);
    assert.equal(rows.length, 8);
    assert.deepEqual(
      { id: rows[0].teamId, name: rows[0].teamName, abbr: rows[0].teamAbbr, rank: rows[0].rank },
      { id: 'lv:team:14467', name: 'Peshawar Zalmi', abbr: 'PZ', rank: 1 },
    );
    assert.deepEqual(
      { p: rows[0].played, w: rows[0].won, l: rows[0].lost, nr: rows[0].noResult, pts: rows[0].points, nrr: rows[0].netRunRate },
      { p: 10, w: 8, l: 1, nr: 1, pts: 17, nrr: 2.324 },
    );
    assert.ok(rows.at(-1).netRunRate < 0, 'negative net run rate keeps its sign');
  });

  it('tournament info lists the teams the squad sync iterates', async () => {
    const info = await live1.fetchTournamentInfo('sr:tournament:14931');
    const teams = info.groups.flatMap((g) => g.teams);
    assert.equal(teams.length, 8);
    assert.ok(teams.every((t) => t.id.startsWith('lv:team:') && t.name && t.abbreviation));
  });

  it('standings and tournament info share one request', async () => {
    await live1.fetchSeasonStandingsRaw('sr:season:140552');
    await live1.fetchTournamentInfo('sr:tournament:14931');
    assert.equal(calls.filter((u) => u.includes('/point-table')).length, 1);
  });

  it('a squad maps to what normalizeSquad reads', async () => {
    const raw = await live1.fetchSeasonSquad('sr:season:140552', 'lv:team:14464');
    const squad = normalizeSquad(raw);
    assert.equal(squad.teamId, 'lv:team:14464');
    assert.equal(squad.teamAbbr, 'IU');
    const gous = squad.players.find((p) => p.playerName === 'A Gous');
    assert.deepEqual({ id: gous.playerId, role: gous.role }, { id: 'lv:player:53114', role: 'wicketkeeper' });
    assert.ok(squad.players.some((p) => p.role === 'all_rounder'));
  });

  it('refuses a season it has no series for (2024/2025 are not in live1)', async () => {
    await assert.rejects(() => live1.fetchSeasonStandingsRaw('sr:season:129023'), ProviderUnsupportedError);
    await assert.rejects(() => live1.fetchSeasonSquad('sr:season:140552', 'lv:team:999'), ProviderUnsupportedError);
  });

  it('auto routes PSL calls past Cricbuzz (which lacks them) to live1', async () => {
    process.env.DATA_PROVIDER = 'auto';
    const info = await facade.fetchTournamentInfo('sr:tournament:14931');
    assert.equal(info.groups[0].teams.length, 8);
  });
});
