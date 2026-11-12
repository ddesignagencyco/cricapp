import { cricbuzzGet, cricbuzzStatistics, findMatchInfo, periodsFromMatchScore } from './cricbuzz.js';
import { memoGet, memoSet } from './rapidHttp.js';
import { ProviderUnsupportedError } from './errors.js';

/**
 * Official Cricbuzz Cricket commentary (`mcenter/v1/{id}/comm`) → a SportsRadar-style
 * ball-by-ball timeline.
 *
 * The feed has no per-ball runs or player ids: each delivery is a sentence ("Shaheen Afridi to
 * Riley Meredith, 2 runs, …") whose bold fragments are placeholders (`B0$`) filled from
 * `commentaryformats`. Runs, extras and wickets are read from that text, and the running score
 * is pinned to the authoritative totals the feed does carry: the over summary on every
 * end-of-over entry (`oversep`) and the live mini-score.
 *
 * One request returns only the latest ~10-20 entries, so entries are accumulated per match
 * across polls; a match first seen part-way through (or already finished) is backfilled by
 * paging backwards (`?iid=<innings>&tms=<oldest timestamp>`), at most
 * RAPIDAPI_COMM_BACKFILL_PAGES requests, once.
 */

const LIVE_TTL_S = Number(process.env.RAPIDAPI_LIVE_TTL_S || 60);
const PAGE_TTL_S = 7 * 86400; // an older page never changes
const STORE_TTL_S = 14 * 86400;
// ~20 entries a page and run once per match: 150 covers a five-day Test (~2,700 balls).
const backfillPages = () => Number(process.env.RAPIDAPI_COMM_BACKFILL_PAGES ?? 150);

const PREFIX = { match: 'cb:match:' };

function rawMatchId(id) {
  const s = String(id);
  if (!s.startsWith(PREFIX.match)) throw new ProviderUnsupportedError(`cricbuzz commentary needs a cb:match id, got ${s}`);
  return s.slice(PREFIX.match.length);
}

/** Replace `B0$`-style placeholders with their text; any placeholder left unresolved is dropped. */
export function fillFormats(text, formats) {
  let out = String(text ?? '');
  for (const f of formats ?? []) {
    for (const v of f?.value ?? []) {
      if (v?.id) out = out.split(v.id).join(v.value ?? '');
    }
  }
  return out.replace(/\b[A-Z]\d+\$/g, '').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
}

export function dismissalType(text) {
  const t = String(text ?? '').toLowerCase();
  if (/run out/.test(t)) return 'run_out';
  if (/stumped/.test(t)) return 'stumped';
  if (/lbw/.test(t)) return 'lbw';
  if (/hit wicket/.test(t)) return 'hit_wicket';
  if (/caught|\bc\b .+\bb\b/.test(t)) return 'caught';
  if (/bowled|\bb\b/.test(t)) return 'bowled';
  return 'wicket';
}

/**
 * The outcome is stated in the opening clauses ("2 runs", "FOUR", "3 wides", "no ball, FOUR",
 * "leg byes, 1 run"); the rest is description, where words like "wide" mean nothing.
 */
const clauses = (outcome) => String(outcome ?? '').toLowerCase().split(',').map((c) => c.trim());

export function extraOf(outcome) {
  const first = clauses(outcome)[0];
  if (/^no[- ]?ball\b/.test(first)) return 'no_ball';
  if (/^(\d+ )?wides?$/.test(first)) return 'wide';
  if (/^leg[- ]?byes?\b/.test(first)) return 'leg_bye';
  if (/^byes?\b/.test(first)) return 'bye';
  return null;
}

/** Runs on a delivery including extras. */
export function runsFromOutcome(outcome) {
  const [first = '', second = ''] = clauses(outcome);
  const extra = extraOf(outcome);
  // "no ball, 1 run" / "leg byes, FOUR": the runs follow in the next clause
  const runClause = extra && extra !== 'wide' && !/\d/.test(first) ? second : first;
  const n = runClause.match(/^(\d+)\s+(?:runs?|wides?|byes?|leg byes?)\b/);
  const bat = n ? Number(n[1]) : /^six\b/.test(runClause) ? 6 : /^four\b/.test(runClause) ? 4 : 0;
  if (extra === 'no_ball') return 1 + bat;
  if (extra === 'wide') return bat || 1;
  return bat;
}

/**
 * One commentary entry → a parsed delivery, or null for anything that is not a ball (notes,
 * interviews, rain updates). `checkpoint` carries an authoritative innings total after it.
 */
export function parseBall(c) {
  if (!c || !(Number(c.ballnbr) > 0) || !(Number(c.overnum) > 0)) return null;
  const text = fillFormats(c.commtxt, c.commentaryformats);
  const m = text.match(/^(.+?) to (.+?),\s*([\s\S]*)$/);
  if (!m) return null;
  const [, bowler, batsman, outcome] = m;
  const events = String(c.eventtype ?? '').toUpperCase().split(',');
  // "would've been out" (RUNOUT_MISS) is a commentary flourish, not a wicket
  const wicket = events.includes('WICKET') || /^(out|thats out)\b/i.test(outcome.trim());
  const dismissed = wicket
    ? (text.match(/([A-Z][\w'.-]+(?: [A-Z][\w'.-]+)*) (?:run out|c |b |lbw|st |hit wicket)/)?.[1] ?? batsman)
    : null;
  const cp = c.oversep ?? c.ms;
  return {
    inning: Number(c.inningsid) || 1,
    over: Number(c.overnum),
    timestamp: Number(c.timestamp),
    bowler: bowler.trim(),
    batsman: batsman.trim(),
    runs: wicket ? runsFromOutcome(outcome.replace(/^(out|thats out)\b[^,]*,?/i, '')) : runsFromOutcome(outcome),
    extra: extraOf(outcome),
    wicket,
    dismissal: wicket ? dismissalType(text) : null,
    dismissed,
    commentary: text,
    checkpoint: cp && Number.isFinite(Number(cp.score)) ? { score: Number(cp.score), wickets: Number(cp.wickets) || 0 } : null,
  };
}

const playerRef = (name) => ({ id: null, name: name ?? null });

/**
 * Parsed deliveries (any order, may repeat) → SportsRadar-style timeline payload.
 * `basePeriods` (from the match list's `matchScore`) supplies innings whose commentary was
 * never fetched, and says which side batted in each innings (a follow-on breaks the
 * odd/even rule), so the innings list is always complete.
 */
export function toCommTimeline(entries, matchId, scorecard = null, basePeriods = []) {
  const byTs = new Map();
  for (const e of entries ?? []) {
    const ball = parseBall(e);
    if (ball && Number.isFinite(ball.timestamp)) byTs.set(ball.timestamp, ball);
  }
  const balls = [...byTs.values()].sort((a, b) => a.timestamp - b.timestamp);

  // Raw running totals per innings, then pinned to the checkpoints: balls after a checkpoint
  // use its correction; balls before an innings' first checkpoint use that first correction.
  const raw = new Map();
  const totals = balls.map((b) => {
    const t = raw.get(b.inning) ?? { runs: 0, wickets: 0 };
    t.runs += b.runs;
    if (b.wicket) t.wickets += 1;
    raw.set(b.inning, t);
    return { runs: t.runs, wickets: t.wickets };
  });
  const offsets = balls.map(() => null);
  const firstOffset = new Map();
  const current = new Map();
  balls.forEach((b, i) => {
    if (b.checkpoint) {
      const off = { runs: b.checkpoint.score - totals[i].runs, wickets: b.checkpoint.wickets - totals[i].wickets };
      current.set(b.inning, off);
      if (!firstOffset.has(b.inning)) firstOffset.set(b.inning, off);
    }
    offsets[i] = current.get(b.inning) ?? null;
  });

  const scores = new Map(); // innings → last { runs, wickets, overs }
  const timeline = balls.map((b, i) => {
    const off = offsets[i] ?? firstOffset.get(b.inning) ?? { runs: 0, wickets: 0 };
    const runsSoFar = totals[i].runs + off.runs;
    const wicketsSoFar = totals[i].wickets + off.wickets;
    const whole = Math.floor(b.over);
    const ballNo = Math.round((b.over - whole) * 10);
    const display = b.over.toFixed(1);
    scores.set(b.inning, { runs: runsSoFar, wickets: wicketsSoFar, overs: display });
    const event = {
      id: String(b.timestamp),
      sequence: b.timestamp,
      type: b.wicket ? 'wicket' : 'ball',
      inning: b.inning,
      over_number: ballNo > 0 ? whole + 1 : whole,
      ball_number: ballNo || undefined,
      display_overs: display,
      display_score: `${runsSoFar}/${wicketsSoFar}`,
      runs: b.runs,
      commentary: b.commentary,
      batting_params: { striker: playerRef(b.batsman) },
      bowling_params: {
        bowler: playerRef(b.bowler),
        ...(b.extra && {
          extra_runs_type: b.extra,
          extra_runs_conceded: b.extra === 'no_ball' ? 1 : b.runs,
        }),
      },
    };
    if (b.wicket) {
      event.dismissal_params = { dismissal_details: { type: b.dismissal }, player: playerRef(b.dismissed) };
    }
    return event;
  });

  // The batting side comes from the list's innings when known; otherwise odd innings are
  // "home" and even "away", the convention the summary uses too.
  const base = new Map((basePeriods ?? []).map((p) => [Number(p.number), p]));
  const sideOf = (inning) => {
    const p = base.get(inning);
    if (p && ('away_score' in p) !== ('home_score' in p)) return 'away_score' in p ? 'away' : 'home';
    return inning % 2 === 1 ? 'home' : 'away';
  };
  const byInning = new Map(base);
  for (const [inning, s] of scores) {
    const side = sideOf(inning);
    byInning.set(inning, { number: inning, [`${side}_score`]: s.runs, [`${side}_wickets`]: s.wickets, display_overs: s.overs });
  }
  const period_scores = [...byInning.values()].sort((a, b) => a.number - b.number);
  const latest = timeline[timeline.length - 1];

  return {
    sport_event: { id: matchId, ...(scorecard && { competitors: scorecard.competitors }) },
    sport_event_status: {
      current_inning: latest?.inning ?? null,
      display_score: latest?.display_score ?? null,
      display_overs: latest?.display_overs ?? null,
      period_scores,
    },
    ...(scorecard && { statistics: scorecard.statistics }),
    timeline,
  };
}

/** Keep only what parsing needs, so a whole match fits comfortably in one Redis value. */
function slim(c) {
  return {
    commtxt: c.commtxt,
    timestamp: c.timestamp,
    overnum: c.overnum,
    inningsid: c.inningsid,
    eventtype: c.eventtype,
    ballnbr: c.ballnbr,
    commentaryformats: (c.commentaryformats ?? []).filter((f) => f?.value?.length),
    ...(c.oversep && { oversep: { score: c.oversep.score, wickets: c.oversep.wickets } }),
    ...(c.ms && { ms: c.ms }),
  };
}

/** Page entries, with the live mini-score attached to the delivery it describes. */
export function pageEntries(page) {
  const entries = (page?.comwrapper ?? []).map((w) => w?.commentary).filter(Boolean);
  for (const s of page?.miniscore?.inningsscores?.inningsscore ?? []) {
    const hit = entries
      .filter((e) => Number(e.inningsid) === Number(s.inningsid) && Number(e.overnum) === Number(s.overs) && Number(e.ballnbr) > 0)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (hit && !hit.oversep) hit.ms = { score: s.runs, wickets: s.wickets };
  }
  return entries;
}

function merge(stored, incoming) {
  const map = new Map((stored ?? []).map((e) => [e.timestamp, e]));
  let added = 0;
  for (const e of incoming) {
    if (!Number.isFinite(Number(e?.timestamp))) continue;
    if (!map.has(e.timestamp)) added += 1;
    map.set(e.timestamp, slim(e));
  }
  return { list: [...map.values()], added };
}

/** True once the first delivery of the first innings is held, i.e. nothing older remains. */
const reachedStart = (list) => list.some((e) => Number(e.inningsid) === 1 && Number(e.ballnbr) > 0 && Number(e.overnum) < 1);

export async function fetchMatchTimeline(id) {
  const raw = rawMatchId(id);
  const key = `cbcomm:${raw}`;
  let list = (await memoGet(key)) ?? [];

  const latest = await cricbuzzGet(`mcenter/v1/${raw}/comm`, LIVE_TTL_S);
  list = merge(list, pageEntries(latest)).list;

  // Backfill once: page backwards innings by innings until the first ball or the page cap.
  const doneKey = `cbcomm:done:${raw}`;
  if (!reachedStart(list) && !(await memoGet(doneKey))) {
    let pages = 0;
    while (pages < backfillPages() && !reachedStart(list)) {
      const oldest = list.reduce((a, e) => (a && a.timestamp <= e.timestamp ? a : e), null);
      if (!oldest) break;
      let iid = Number(oldest.inningsid) || 1;
      let added = 0;
      while (iid >= 1 && pages < backfillPages()) {
        pages += 1;
        const page = await cricbuzzGet(`mcenter/v1/${raw}/comm`, PAGE_TTL_S, { iid, tms: oldest.timestamp });
        const merged = merge(list, pageEntries(page));
        added = merged.added;
        list = merged.list;
        if (added) break;
        iid -= 1; // this innings has nothing older: continue with the previous one
      }
      if (!added) break;
    }
    await memoSet(doneKey, true, STORE_TTL_S);
  }

  await memoSet(key, list, STORE_TTL_S);
  // The scorecard request is the one the summary poll already made (cached).
  const scorecard = await cricbuzzStatistics(id).catch((err) => {
    console.warn(`[cricbuzz timeline] no scorecard for ${id}: ${err.message}`);
    return null;
  });
  // The list entry the poller just read (cached): every innings total, even ones whose
  // commentary is older than the backfill reached.
  const info = await findMatchInfo(id).catch(() => null);
  return toCommTimeline(list, id, scorecard, info?.matchScore ? periodsFromMatchScore(info.matchScore) : []);
}

/** Same work as the full timeline (cached), filtered to entries after `since`. */
export async function fetchMatchTimelineDelta(id, since = 0) {
  const full = await fetchMatchTimeline(id);
  return { ...full, timeline: full.timeline.filter((e) => e.sequence > Number(since || 0)) };
}
