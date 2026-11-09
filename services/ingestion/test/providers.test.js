process.env.RAPIDAPI_KEY = 'test-key';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setStore, getRapidStats } from '../src/providers/rapidHttp.js';
import { QuotaExceededError } from '../src/providers/errors.js';
import * as cricbuzz from '../src/providers/cricbuzz.js';
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

function mockFetch(route) {
  fetchCalls = [];
  globalThis.fetch = async (url) => {
    fetchCalls.push(String(url));
    const body = route(String(url));
    return { ok: true, status: 200, json: async () => body, text: async () => '' };
  };
}

describe('cricbuzz adapter', () => {
  beforeEach(() => {
    setStore(memoryStore());
    process.env.DATA_PROVIDER = 'cricbuzz';
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.DATA_PROVIDER;
    delete process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET;
  });

  it('maps states so normalize.js reads them correctly', () => {
    assert.deepEqual(cricbuzz.mapState('In Progress'), { status: 'live', matchStatus: 'inprogress' });
    assert.equal(cricbuzz.mapState('Rain').status, 'interrupted');
    assert.equal(cricbuzz.mapState('Complete').status, 'closed');
    assert.equal(cricbuzz.mapState('Abandoned').matchStatus, 'abandoned');
    assert.equal(cricbuzz.mapState('Upcoming').status, 'not_started');
  });

  it('live schedule returns namespaced ids and statuses', async () => {
    mockFetch(() => fixture('live.json'));
    const events = await facade.fetchLiveSchedule();
    assert.deepEqual(events.map((e) => [e.id, e.status]), [
      ['cb:match:1001', 'live'],
      ['cb:match:1002', 'interrupted'],
      ['cb:match:1003', 'closed'],
    ]);
    assert.equal(events[0].competitors[0].id, 'cb:team:1');
  });

  it('live summary goes through normalizeMatch with the right score and status', async () => {
    mockFetch(() => fixture('scard-live.json'));
    const raw = await facade.fetchMatchSummary('cb:match:1001');
    assert.match(fetchCalls[0], /mcenter\/v1\/1001\/scard$/);
    const m = normalizeMatch(PROVIDERS.SPORTRADAR, raw);
    assert.equal(m.matchId, 'cb:match:1001');
    assert.equal(m.status, 'live');
    assert.equal(m.currentInnings.runs, 160);
    assert.equal(m.currentInnings.wickets, 4);
    assert.equal(m.teamScores.home.score, '180/6');
    assert.equal(m.teamScores.away.score, '160/4');
    assert.equal(m.tossDecision, 'bat');
    assert.equal(m.matchResult, null, 'a chase in progress is not a result');
  });

  it('completed summary is completed with winner and result text', async () => {
    mockFetch(() => fixture('scard-complete.json'));
    const m = normalizeMatch(PROVIDERS.SPORTRADAR, await facade.fetchMatchSummary('cb:match:1003'));
    assert.equal(m.status, 'completed');
    assert.equal(m.winnerId, 'cb:team:1');
    assert.equal(m.matchResult, 'Karachi Kings won by 5 runs');
  });

  it('daily results only include finished matches on that date', async () => {
    mockFetch(() => fixture('live.json'));
    const day = new Date(1782900000000).toISOString().slice(0, 10);
    const { results } = await facade.fetchDailyResults(day);
    assert.deepEqual(results.map((r) => r.sport_event.id), ['cb:match:1003']);
  });

  it('serves repeat calls from cache without spending quota', async () => {
    mockFetch(() => fixture('live.json'));
    await facade.fetchLiveSchedule();
    await facade.fetchLiveSchedule();
    assert.equal(fetchCalls.length, 1);
    assert.ok(getRapidStats().cacheHits >= 1);
  });

  it('blocks calls once the monthly budget is used up', async () => {
    process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET = '1';
    mockFetch(() => fixture('scard-live.json'));
    await facade.fetchMatchSummary('cb:match:1');
    await assert.rejects(() => facade.fetchMatchSummary('cb:match:2'), QuotaExceededError);
    assert.equal(fetchCalls.length, 1);
  });

  it('reports unsupported endpoints instead of guessing', async () => {
    await assert.rejects(() => facade.fetchMatchTimeline('cb:match:1'), /does not support fetchMatchTimeline/);
  });
});

describe('facade fallback', () => {
  afterEach(() => {
    delete process.env.DATA_PROVIDER;
    facade.setModules({ cricbuzz, highlightly: {} });
  });

  it('auto falls back to the next provider on quota errors', async () => {
    process.env.DATA_PROVIDER = 'auto';
    facade.setModules({
      cricbuzz: { fetchLiveSchedule: async () => { throw new QuotaExceededError('out'); } },
      highlightly: { fetchLiveSchedule: async () => [{ id: 'hl:match:9', status: 'live' }] },
    });
    assert.deepEqual(await facade.fetchLiveSchedule(), [{ id: 'hl:match:9', status: 'live' }]);
  });

  it('rejects an unknown DATA_PROVIDER', () => {
    process.env.DATA_PROVIDER = 'nope';
    assert.throws(() => facade.providerChain(), /Unknown DATA_PROVIDER/);
  });
});
