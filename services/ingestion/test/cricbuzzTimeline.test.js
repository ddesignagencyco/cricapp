process.env.RAPIDAPI_KEY = 'test-key';
process.env.RAPIDAPI_MIN_INTERVAL_MS = '1';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setStore } from '../src/providers/rapidHttp.js';
import {
  fillFormats,
  runsFromOutcome,
  extraOf,
  parseBall,
  pageEntries,
  toCommTimeline,
  fetchMatchTimeline,
  fetchMatchTimelineDelta,
} from '../src/providers/cricbuzzTimeline.js';

// Real commentary from the official host: PSL 2026 match 148962 (LHQ 199/6 beat HYDK 130/10),
// newest page and the page before it, and a live Test (PAK v SL, 170703) at 57/1 after 21.2.
const fx = (name) => JSON.parse(readFileSync(new URL(`./fixtures/cricbuzz-official/${name}.json`, import.meta.url)));

describe('commentary parsing', () => {
  it('fills bold placeholders from commentaryformats', () => {
    const text = fillFormats('Kumara to Taha, B0$, B1$, pitched up', [
      { type: 'bold', value: [{ id: 'B0$', value: 'FOUR' }, { id: 'B1$', value: 'nicely played' }] },
    ]);
    assert.equal(text, 'Kumara to Taha, FOUR, nicely played, pitched up');
  });

  it('reads runs and extras only from the opening clauses', () => {
    const cases = [
      ['1 run, pushed wide of point', 1, null],
      ['no run, beaten', 0, null],
      ['2 runs, short', 2, null],
      ['FOUR, nicely played', 4, null],
      ['SIX, massive', 6, null],
      ['wide', 1, 'wide'],
      ['3 wides', 3, 'wide'],
      ['no ball, 1 run', 2, 'no_ball'],
      ['no ball, FOUR', 5, 'no_ball'],
      ['leg byes, 1 run', 1, 'leg_bye'],
      ['byes, FOUR', 4, 'bye'],
    ];
    for (const [outcome, runs, extra] of cases) {
      assert.equal(runsFromOutcome(outcome), runs, outcome);
      assert.equal(extraOf(outcome), extra, outcome);
    }
  });

  it('skips entries that are not deliveries', () => {
    assert.equal(parseBall({ commtxt: 'Rain has stopped play', ballnbr: 0, overnum: 0 }), null);
    assert.equal(parseBall({ commtxt: 'no bowler here', ballnbr: 3, overnum: 4.2 }), null);
  });

  it('a near run-out (RUNOUT_MISS) is not a wicket', () => {
    const ball = parseBall({
      commtxt: "Shaheen Afridi to Riley Meredith, 1 run, a direct hit and that would've been out",
      ballnbr: 109,
      overnum: 18.1,
      inningsid: 2,
      timestamp: 1,
      eventtype: 'RUNOUT_MISS',
    });
    assert.equal(ball.wicket, false);
    assert.equal(ball.runs, 1);
  });
});

describe('commentary → timeline (recorded)', () => {
  const entries = () => [...pageEntries(fx('psl-comm')), ...pageEntries(fx('comm-p2'))];

  it('ends on the official result: HYDK 130/10 after 19.6 overs', () => {
    const t = toCommTimeline(entries(), 'cb:match:148962');
    assert.equal(t.sport_event_status.display_score, '130/10');
    assert.equal(t.sport_event_status.display_overs, '19.6');
    assert.deepEqual(t.sport_event_status.period_scores, [{ number: 2, away_score: 130, away_wickets: 10, display_overs: '19.6' }]);
  });

  it('per-ball runs add up between the over checkpoints (123/9 after 18.6, +7 to 130)', () => {
    const t = toCommTimeline(entries(), 'cb:match:148962');
    const i = t.timeline.findIndex((e) => e.display_overs === '18.6');
    assert.equal(t.timeline[i].display_score, '123/9');
    const after = t.timeline.slice(i + 1);
    assert.equal(after.reduce((a, e) => a + e.runs, 0), 7);
  });

  it('marks the no-ball, the extra delivery and the final run-out', () => {
    const t = toCommTimeline(entries(), 'cb:match:148962');
    const twenty = t.timeline.filter((e) => e.over_number === 20);
    assert.equal(twenty.length, 7); // six legal balls plus the no-ball
    assert.equal(twenty.filter((e) => e.bowling_params.extra_runs_type === 'no_ball').length, 1);
    assert.equal(twenty.filter((e) => e.bowling_params.extra_runs_type === 'wide').length, 0);
    const last = t.timeline.at(-1);
    assert.equal(last.type, 'wicket');
    assert.equal(last.dismissal_params.dismissal_details.type, 'run_out');
    assert.equal(last.dismissal_params.player.name, 'Mohammad Ali');
    assert.equal(last.bowling_params.bowler.name, 'Mustafizur Rahman');
  });

  it('uses one-based over numbers like the rest of the app (19.3 is over 20, ball 3)', () => {
    const t = toCommTimeline(entries(), 'cb:match:148962');
    const e = t.timeline.find((x) => x.display_overs === '19.3' && !x.bowling_params.extra_runs_type);
    assert.equal(e.over_number, 20);
    assert.equal(e.ball_number, 3);
  });

  it('a live page is pinned to the mini-score (PAK 57/1 after 21.2)', () => {
    const t = toCommTimeline(pageEntries(fx('live-comm')), 'cb:match:170703');
    assert.equal(t.sport_event_status.display_score, '57/1');
    assert.equal(t.sport_event_status.current_inning, 3);
  });
});

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

describe('fetchMatchTimeline (accumulate + backfill)', () => {
  const realFetch = globalThis.fetch;
  let calls;

  beforeEach(() => {
    setStore(memoryStore());
    calls = [];
    const oldest = Math.min(...pageEntries(fx('psl-comm')).filter((e) => e.timestamp).map((e) => e.timestamp));
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      const u = new URL(String(url));
      let body = {};
      if (u.pathname.endsWith('/comm') && !u.searchParams.has('tms')) body = fx('psl-comm');
      else if (u.searchParams.get('iid') === '2' && Number(u.searchParams.get('tms')) === oldest) body = fx('comm-p2');
      else if (u.pathname.endsWith('/comm')) body = { comwrapper: [] }; // nothing older
      else body = 404;
      const status = typeof body === 'number' ? body : 200;
      const text = typeof body === 'number' ? '' : JSON.stringify(body);
      return { ok: status === 200, status, json: async () => JSON.parse(text), text: async () => text, clone() { return this; } };
    };
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.RAPIDAPI_COMM_BACKFILL_PAGES;
  });

  it('backfills older pages once, then each poll costs a single request', async () => {
    const first = await fetchMatchTimeline('cb:match:148962');
    assert.equal(first.sport_event_status.display_score, '130/10');
    assert.ok(first.timeline.length >= 20);
    const commCalls = () => calls.filter((u) => u.includes('/mcenter/v1/148962/comm'));
    const afterFirst = commCalls().length;
    assert.ok(afterFirst >= 2, 'latest page plus at least one older page');
    assert.ok(commCalls().some((u) => u.includes('iid=2')));

    await fetchMatchTimeline('cb:match:148962'); // latest page is cached, backfill already done
    assert.equal(commCalls().length, afterFirst);
  });

  it('respects the backfill page cap', async () => {
    process.env.RAPIDAPI_COMM_BACKFILL_PAGES = '0';
    const t = await fetchMatchTimeline('cb:match:148962');
    assert.equal(calls.filter((u) => u.includes('tms=')).length, 0);
    assert.equal(t.sport_event_status.display_score, '130/10'); // the newest page alone still ends on the result
  });

  it('delta returns only entries after the given sequence', async () => {
    const full = await fetchMatchTimeline('cb:match:148962');
    const cut = full.timeline.at(-3).sequence;
    const delta = await fetchMatchTimelineDelta('cb:match:148962', cut);
    assert.equal(delta.timeline.length, 2);
  });

  it('refuses ids that are not Cricbuzz matches', async () => {
    await assert.rejects(() => fetchMatchTimeline('sr:match:1'), /cb:match/);
  });
});

describe('innings list completeness', () => {
  it('keeps innings the commentary never reached, from the list entry', () => {
    // Live Test: commentary covers only the third innings, the list knows all three.
    const base = [
      { number: 1, home_score: 434, home_wickets: 9, display_overs: '106.3' },
      { number: 2, away_score: 446, away_wickets: 10, display_overs: '117.2' },
      { number: 3, home_score: 50, home_wickets: 1, display_overs: '20.0' },
    ];
    const t = toCommTimeline(pageEntries(fx('live-comm')), 'cb:match:170703', null, base);
    assert.deepEqual(t.sport_event_status.period_scores.map((p) => p.number), [1, 2, 3]);
    assert.equal(t.sport_event_status.period_scores[1].away_score, 446);
    // the third innings is the fresher commentary value, on the side the list names
    assert.equal(t.sport_event_status.period_scores[2].home_score, 57);
  });
});
