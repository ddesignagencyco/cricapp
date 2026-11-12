process.env.RAPIDAPI_KEY = 'test-key';
process.env.RAPIDAPI_MIN_INTERVAL_MS = '1';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setStore } from '../src/providers/rapidHttp.js';
import * as facade from '../src/providers/index.js';
import { hostCountry, isRecentSeries } from '../src/providers/cricbuzzRef.js';

// Real responses from the official Cricbuzz Cricket host (cricbuzz-cricket.p.rapidapi.com), 2026-11-12.
const fx = (name) => JSON.parse(readFileSync(new URL(`./fixtures/cricbuzz-official/${name}.json`, import.meta.url)));

const PSL_2026 = 'sr:season:140552';
const PSL_2025 = 'sr:season:129023';
const PSL_2024 = 'sr:season:114833';

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

/** Routes official paths to recorded responses; 204 stands for "no content upstream". */
function route(url) {
  const { pathname, searchParams } = new URL(url);
  const p = pathname.replace(/^\//, '');
  if (p === 'series/v1/league') return fx('catalogue');
  if (/^series\/v1\/(international|domestic|women)$/.test(p) || p.startsWith('series/v1/archives/')) return { seriesMapProto: [] };
  if (p === 'series/v1/11537' || p === 'series/v1/11372') return fx('psl26-matches');
  if (p === 'series/v1/7492') return fx('psl24-matches');
  if (p === 'stats/v1/series/11537/points-table') return fx('psl26-points');
  if (p === 'stats/v1/series/11372/points-table') return 204;
  if (p === 'stats/v1/series/11537') return searchParams.get('statsType') === 'mostRuns' ? fx('psl26-mostruns') : {};
  if (p === 'series/v1/11537/squads') return fx('psl26-squads');
  if (p === 'series/v1/11537/squads/114048') return fx('squad-players');
  if (p === 'teams/v1/3/players') return fx('team-players');
  return 404;
}

function mockFetch() {
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const out = route(String(url));
    const status = typeof out === 'number' ? out : 200;
    const text = typeof out === 'number' ? '' : JSON.stringify(out);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => JSON.parse(text),
      text: async () => text,
      clone() {
        return this;
      },
    };
  };
}

describe('official Cricbuzz reference data', () => {
  beforeEach(() => {
    setStore(memoryStore());
    process.env.DATA_PROVIDER = 'cricbuzz';
    mockFetch();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.DATA_PROVIDER;
  });

  it('every request goes to the official host', async () => {
    await facade.fetchSeasonStandings(PSL_2026);
    await facade.fetchTournaments();
    assert.ok(calls.length > 0);
    assert.ok(calls.every((u) => u.startsWith('https://cricbuzz-cricket.p.rapidapi.com/')), calls.join('\n'));
  });

  it('lists catalogue series as tournaments, with the PSL tournament first', async () => {
    const { tournaments } = await facade.fetchTournaments();
    assert.equal(tournaments[0].id, 'sr:tournament:14931');
    const npl = tournaments.find((t) => t.name === 'Nepal Premier League 2026');
    assert.ok(npl, 'league series from series/v1/league');
    assert.equal(npl.type, 'league');
    assert.match(npl.id, /^cb:tournament:\d+$/);
  });

  it('PSL 2026 standings come from the official points table', async () => {
    const env = await facade.fetchSeasonStandingsRaw(PSL_2026);
    assert.equal(env.derived, false);
    const rows = env.standings[0].groups[0].team_standings;
    assert.equal(rows.length, 8);
    assert.equal(rows[0].team.name, 'Peshawar Zalmi');
    assert.deepEqual([rows[0].played, rows[0].win, rows[0].loss, rows[0].no_result, rows[0].points], [10, 8, 1, 1, 17]);
    assert.equal(rows[0].net_run_rate, 2.324);
  });

  it('a season without an upstream table (204) is derived from results, matching the official order', async () => {
    const official = (await facade.fetchSeasonStandingsRaw(PSL_2026)).standings[0].groups[0].team_standings;
    const env = await facade.fetchSeasonStandingsRaw(PSL_2025); // routed to the 2026 fixtures with an empty table
    assert.equal(env.derived, true);
    const derived = env.standings[0].groups[0].team_standings;
    assert.deepEqual(derived.map((r) => r.team.id), official.map((r) => r.team.id));
    assert.deepEqual(derived.map((r) => r.points), official.map((r) => r.points));
  });

  it('fixtures for 2026 and 2024, with result text on finished games', async () => {
    const s26 = await facade.fetchSeasonSchedule(PSL_2026);
    const s24 = await facade.fetchSeasonSchedule(PSL_2024);
    assert.equal(s26.length, 44);
    assert.equal(s24.length, 34);
    const first = s26.find((e) => e.id === 'cb:match:148962');
    assert.equal(first.status, 'closed');
    assert.match(first.match_status, /won/i);
    assert.equal(first.season.id, PSL_2026);
  });

  it('team list for a tournament comes from its fixtures', async () => {
    const info = await facade.fetchTournamentInfo(PSL_2026);
    assert.equal(info.groups[0].teams.length, 8);
  });

  it('leaders read the t20StatsList table', async () => {
    const leaders = await facade.fetchSeasonLeaders(PSL_2026);
    const runs = leaders.batting.top_runs;
    assert.equal(runs[0].player.id, 'cb:player:8359');
    assert.equal(runs[0].player.name, 'Babar Azam');
    assert.equal(runs[0].total, 588);
    assert.deepEqual(leaders.bowling.top_wickets, []); // empty upstream response, not an error
  });

  it('a season squad is found by team id and lists players with roles', async () => {
    const { team, players } = await facade.fetchSeasonSquad(PSL_2026, 'cb:team:330');
    assert.equal(team.id, 'cb:team:330');
    assert.equal(players.length, 20);
    assert.ok(players.every((p) => p.id.startsWith('cb:player:')));
    assert.ok(calls.some((u) => u.endsWith('/series/v1/11537/squads/114048')));
  });

  it('team rosters come from teams/v1/{id}/players', async () => {
    const roster = await facade.fetchTeamRoster('cb:team:3');
    assert.ok(roster.players.length >= 40);
  });

  it('refuses ids it has no series for', async () => {
    await assert.rejects(() => facade.fetchSeasonSchedule('sr:season:1'), /no series/);
  });

  it('reuses one cached fixtures request for schedule, standings and team list', async () => {
    await facade.fetchSeasonSchedule(PSL_2026);
    await facade.fetchSeasonStandingsRaw(PSL_2026);
    await facade.fetchTournamentInfo(PSL_2026);
    assert.equal(calls.filter((u) => u.endsWith('/series/v1/11537')).length, 1);
  });
});

describe('series helpers', () => {
  it('reads the host out of a tour name', () => {
    assert.equal(hostCountry('Sri Lanka tour of Pakistan, 2026'), 'Pakistan');
    assert.equal(hostCountry("ICC Men's Cricket World Cup 2027"), null);
  });

  it('ignores series that ended long ago or are far in the future', () => {
    const now = Date.UTC(2026, 10, 12);
    assert.equal(isRecentSeries({ startDt: now - 10 * 86400000, endDt: now + 86400000 }, now), true);
    assert.equal(isRecentSeries({ startDt: now - 400 * 86400000, endDt: now - 300 * 86400000 }, now), false);
  });
});
