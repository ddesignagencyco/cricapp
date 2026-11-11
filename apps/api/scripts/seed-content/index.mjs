/**
 * Content seed: authors, news articles, streams, gallery and editorial pages, so a fresh
 * environment has a site worth looking at.
 *
 *   node --env-file=.env scripts/seed-content/index.mjs [--force]
 *
 * - Articles are written from data already in the database (see generators.mjs); nothing is
 *   quoted and no figure is invented. Phrasing is templated, and the editorial-standards page says so.
 * - Authors are demonstration profiles with invented names, not real journalists.
 * - Artwork is generated SVG under apps/web/public/seed.
 * - Idempotent: rows are keyed by slug / title / public id, so re-running updates them.
 * - Refuses to run when NODE_ENV=production unless --force is given.
 */
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { heroSvg, avatarSvg, writeAsset } from './art.mjs';
import { EXPLAINERS } from './explainers.mjs';
import { matchResultBrief, cricketToday, tournamentWatch, busiestCompetitions, matchReport, matchPreview, pslTable, batterSpotlight, bowlerSpotlight, recordList, inningsOf } from './generators.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(here, '../../../web/public');

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('[seed-content] refusing to run with NODE_ENV=production (pass --force to override)');
  process.exit(1);
}

const AUTHORS = [
  { slug: 'imran-khalid-mirza', name: 'Imran Khalid Mirza', hue: 150, bio: 'Covers Pakistan cricket and the PSL. Writes match reports and season reviews.', cats: ['pakistan-cricket', 'psl', 'international'] },
  { slug: 'sadia-anwar-chaudhry', name: 'Sadia Anwar Chaudhry', hue: 330, bio: 'Reports on international and women’s cricket, with a focus on tournament tables and qualification races.', cats: ['international', 'features'] },
  { slug: 'daniel-whitcombe', name: 'Daniel Whitcombe', hue: 210, bio: 'Writes match reports and previews across the global T20 calendar.', cats: ['match-news', 'international'] },
  { slug: 'priya-venkataraman', name: 'Priya Venkataraman', hue: 28, bio: 'Analyst. Writes player and team numbers pieces from scorecard data.', cats: ['analysis', 'records', 'features'] },
  { slug: 'tariq-hussain-baig', name: 'Tariq Hussain Baig', hue: 260, bio: 'Explains the laws and the statistics of the game for newer fans.', cats: ['explainers'] },
  { slug: 'marcus-oyelaran', name: 'Marcus Oyelaran', hue: 185, bio: 'Breaking news and live coverage desk.', cats: ['breaking', 'match-news'] },
];

const STREAMS = [
  ['ICC – official YouTube channel (live when broadcasting)', 'UCt2JXOLNxqry7B_4rRZME3Q'],
  ['Pakistan Cricket – official YouTube channel (live when broadcasting)', 'UCiWrjBhlICf_L_RK5y6Vrxw'],
  ['cricket.com.au – official YouTube channel (live when broadcasting)', 'UCkBY0aHJP9BwjZLDYxAQrKg'],
  ['NZCricket – official YouTube channel (live when broadcasting)', 'UClnloXu2UHUv9JZlTFT_N-Q'],
  ['Windies Cricket – official YouTube channel (live when broadcasting)', 'UC2MHTOXktfTK26aDKyQs3cQ'],
  ['CSA – official YouTube channel (live when broadcasting)', 'UCByLd-yB8MDD7zRR9hD2l2A'],
  ['Afghanistan Cricket Board – official YouTube channel (live when broadcasting)', 'UCdFZnFf0nGeync5_gLJvcfg'],
];

const PAGES = [
  {
    slug: 'about',
    title: 'About CricApp',
    content: '<p>CricApp is a cricket platform for live scores, scorecards, tournament tables, squads, player profiles, predictions and news.</p><p>Match data comes from licensed cricket data providers and is refreshed continuously while matches are live.</p>',
  },
  {
    slug: 'editorial-standards',
    title: 'Editorial standards',
    content: '<p>Match reports, previews, table reviews and “by the numbers” pieces on this site are generated from stored match data: scorecards, results and standings. Every figure comes from that data, and we do not invent quotes.</p><p>Explainers on rules and statistics are written by hand. Author profiles in the demonstration content are not real journalists.</p><p>Tracked-match statistics cover only the scorecards we store and are not career totals.</p>',
  },
];

const { Client } = pg;
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const q = (text, params) => db.query(text, params);

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/* ---------- authors ---------- */
const authorBySlug = new Map();
for (const a of AUTHORS) {
  writeAsset(`${PUBLIC}/seed/authors/${a.slug}.svg`, avatarSvg(a.name, a.hue));
  const r = await q(
    `INSERT INTO authors (id, name, slug, bio, avatar_url, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, bio = EXCLUDED.bio, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
     RETURNING id`,
    [a.name, a.slug, a.bio, `/seed/authors/${a.slug}.svg`],
  );
  authorBySlug.set(a.slug, { id: r.rows[0].id, name: a.name, cats: a.cats });
}
const authorFor = (category, key) => {
  const matching = AUTHORS.filter((a) => a.cats.includes(category));
  const pool = matching.length ? matching : AUTHORS;
  return authorBySlug.get(pool[hash(key) % pool.length].slug);
};

const categoryId = new Map((await q(`SELECT id, slug FROM news_categories`)).rows.map((r) => [r.slug, r.id]));

/* ---------- gather data ---------- */
const articles = [];

const reports = await q(
  `SELECT m.*, t.payload,
          ARRAY[m.team_scores->'home'->>'id', m.team_scores->'away'->>'id'] AS teams_ids
     FROM matches m JOIN match_timelines t ON t.match_id = m.match_id
    WHERE m.status = 'completed' AND m.result_text IS NOT NULL AND t.payload ? 'statistics'
      AND jsonb_typeof(t.payload->'statistics'->'innings') = 'array' AND jsonb_array_length(t.payload->'statistics'->'innings') > 0
    ORDER BY m.scheduled DESC LIMIT 24`,
);
for (const m of reports.rows) {
  const a = matchReport(m, m.payload);
  if (a) articles.push(a);
}

const upcoming = await q(
  `SELECT m.*, ARRAY[m.team_scores->'home'->>'id', m.team_scores->'away'->>'id'] AS teams_ids
     FROM matches m WHERE m.status = 'upcoming' AND m.scheduled::timestamptz > NOW() ORDER BY m.scheduled LIMIT 10`,
);
async function form(teamId) {
  if (!teamId) return [];
  const r = await q(
    `SELECT winner_id FROM matches
      WHERE status = 'completed' AND winner_id IS NOT NULL
        AND (team_scores->'home'->>'id' = $1 OR team_scores->'away'->>'id' = $1)
      ORDER BY scheduled DESC LIMIT 5`,
    [teamId],
  );
  return r.rows.map((x) => (x.winner_id === teamId ? 'W' : 'L'));
}
for (const m of upcoming.rows) {
  const a = matchPreview(m, await form(m.teams_ids[0]), await form(m.teams_ids[1]));
  if ((m.team_names ?? []).some((n) => /pakistan/i.test(n))) a.category = 'pakistan-cricket';
  articles.push(a);
}

/* ---------- fresh coverage from the fixtures list (works without scorecards) ---------- */
const window_ = (await q(
  `SELECT m.*, ARRAY[m.team_scores->'home'->>'id', m.team_scores->'away'->>'id'] AS teams_ids
     FROM matches m ORDER BY m.scheduled DESC LIMIT 200`,
)).rows;
const haveReport = new Set(articles.filter((a) => a.slug.startsWith('match-report-')).map((a) => a.matchIds[0]));
const finished = window_.filter((m) => m.status === 'completed' && m.result_text);
for (const m of finished.slice(0, 20)) if (!haveReport.has(m.match_id)) { const a = matchResultBrief(m); if (a) articles.push(a); }
const liveNow = window_.filter((m) => m.status === 'live');
const nextUp = window_.filter((m) => m.status === 'upcoming').reverse().slice(0, 8);
{ const a = cricketToday(liveNow.slice(0, 8), finished.slice(0, 6), nextUp); if (a) articles.push(a); }
const byTournament = new Map();
for (const m of window_) if (m.tournament) byTournament.set(m.tournament, [...(byTournament.get(m.tournament) ?? []), m]);
for (const [name, rows] of [...byTournament.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6)) {
  const a = tournamentWatch(name, rows[0].tournament_id, rows); if (a) articles.push(a);
}
{ const a = busiestCompetitions(window_); if (a) articles.push(a); }

const SEASON_YEAR = { 'sr:season:114833': 2024, 'sr:season:129023': 2025, 'sr:season:140552': 2026 };
for (const [seasonId, year] of Object.entries(SEASON_YEAR)) {
  const rows = (await q(`SELECT * FROM psl_standings WHERE season_id = $1`, [seasonId])).rows;
  const a = rows.length ? pslTable(year, rows) : null;
  if (a) articles.push(a);
}

/* ---------- numbers from every stored scorecard ---------- */
const players = new Map();
const best = { totals: [], scores: [], spells: [] };
const timelines = await q(`SELECT t.match_id, t.payload FROM match_timelines t WHERE t.payload ? 'statistics' AND jsonb_typeof(t.payload->'statistics'->'innings') = 'array'`);
const matchNames = new Map((await q(`SELECT match_id, team_names FROM matches`)).rows.map((r) => [r.match_id, r.team_names]));
const nm = (id) => (matchNames.get(id) ? matchNames.get(id).join(' v ') : id);
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
for (const { match_id, payload } of timelines.rows) {
  for (const inn of payload.statistics.innings) {
    const [bat, bowl] = inn.teams ?? [];
    if (bat?.statistics?.batting?.runs != null) best.totals.push({ matchId: match_id, team: bat.name, runs: n(bat.statistics.batting.runs), wkts: n(bat.statistics.batting.wickets_lost) });
    for (const b of bat?.statistics?.batting?.players ?? []) {
      const s = b.statistics ?? {};
      const e = players.get(b.id) ?? { id: b.id, name: b.name, teamId: bat.id, matches: new Set(), bat: { inn: 0, runs: 0, balls: 0, out: 0, hi: -1, hiNo: false, f4: 0, f6: 0, f50: 0, f100: 0 }, bowl: { inn: 0, balls: 0, runs: 0, wk: 0, best: { w: -1, r: 0 } } };
      const runs = n(s.runs);
      e.matches.add(match_id);
      e.bat.inn += 1; e.bat.runs += runs; e.bat.balls += n(s.balls_faced); e.bat.f4 += n(s.fours); e.bat.f6 += n(s.sixes);
      if (s.dismissal) e.bat.out += 1;
      if (runs >= 100) e.bat.f100 += 1; else if (runs >= 50) e.bat.f50 += 1;
      if (runs > e.bat.hi) { e.bat.hi = runs; e.bat.hiNo = !s.dismissal; }
      players.set(b.id, e);
      if (runs >= 30) best.scores.push({ matchId: match_id, name: b.name, runs, balls: n(s.balls_faced), no: !s.dismissal });
    }
    for (const w of bowl?.statistics?.bowling?.players ?? []) {
      const s = w.statistics ?? {};
      const balls = (() => { const [o, b] = String(s.overs_bowled ?? '0').split('.'); return n(o) * 6 + Math.min(5, n(b)); })();
      if (!balls) continue;
      const e = players.get(w.id) ?? { id: w.id, name: w.name, teamId: bowl.id, matches: new Set(), bat: { inn: 0, runs: 0, balls: 0, out: 0, hi: -1, hiNo: false, f4: 0, f6: 0, f50: 0, f100: 0 }, bowl: { inn: 0, balls: 0, runs: 0, wk: 0, best: { w: -1, r: 0 } } };
      e.matches.add(match_id);
      e.bowl.inn += 1; e.bowl.balls += balls; e.bowl.runs += n(s.conceded_runs); e.bowl.wk += n(s.wickets);
      const bw = n(s.wickets), br = n(s.conceded_runs);
      if (bw > e.bowl.best.w || (bw === e.bowl.best.w && br < e.bowl.best.r)) e.bowl.best = { w: bw, r: br };
      players.set(w.id, e);
      best.spells.push({ matchId: match_id, name: w.name, w: bw, r: br });
    }
  }
}

const knownPlayers = new Set((await q(`SELECT id FROM players`)).rows.map((r) => r.id));
const knownTeams = new Set((await q(`SELECT id FROM teams`)).rows.map((r) => r.id));
const list = [...players.values()];

const topBat = list.filter((e) => e.bat.inn >= 4).sort((a, b) => b.bat.runs - a.bat.runs).slice(0, 8);
for (const e of topBat) {
  articles.push(batterSpotlight({ id: e.id, name: e.name, teamId: e.teamId, runs: e.bat.runs, innings: e.bat.inn, matches: e.matches.size, balls: e.bat.balls, dismissals: e.bat.out, highest: Math.max(0, e.bat.hi), highestNotOut: e.bat.hiNo, fours: e.bat.f4, sixes: e.bat.f6, fifties: e.bat.f50, hundreds: e.bat.f100 }));
}
const topBowl = list.filter((e) => e.bowl.inn >= 4).sort((a, b) => b.bowl.wk - a.bowl.wk).slice(0, 5);
for (const e of topBowl) {
  articles.push(bowlerSpotlight({ id: e.id, name: e.name, teamId: e.teamId, wickets: e.bowl.wk, innings: e.bowl.inn, matches: e.matches.size, balls: e.bowl.balls, runs: e.bowl.runs, best: `${e.bowl.best.w}/${e.bowl.best.r}` }));
}

const dedupe = (rows, key) => { const seen = new Set(); return rows.filter((r) => (seen.has(key(r)) ? false : (seen.add(key(r)), true))); };
const totals = dedupe(best.totals.sort((a, b) => b.runs - a.runs), (r) => `${r.matchId}${r.team}`).slice(0, 5);
if (totals.length >= 3) articles.push(recordList({ slug: 'records-highest-team-totals-tracked', title: 'The highest team totals in the matches we track', summary: `${totals[0].team} lead the list with ${totals[0].runs}/${totals[0].wkts}.`, intro: 'The five biggest innings totals across the scorecards stored on CricApp:', label: 'Records', items: totals.map((t) => ({ matchId: t.matchId, text: `${t.team} ${t.runs}/${t.wkts} (${nm(t.matchId)})` })) }));
const scores = dedupe(best.scores.sort((a, b) => b.runs - a.runs), (r) => `${r.matchId}${r.name}`).slice(0, 5);
if (scores.length >= 3) articles.push(recordList({ slug: 'records-highest-individual-scores-tracked', title: 'The highest individual scores in the matches we track', summary: `${scores[0].name} top the list with ${scores[0].runs}${scores[0].no ? '*' : ''}.`, intro: 'The five highest individual innings across the stored scorecards:', label: 'Records', items: scores.map((s) => ({ matchId: s.matchId, text: `${s.name} ${s.runs}${s.no ? '*' : ''} off ${s.balls} balls (${nm(s.matchId)})` })) }));
const spells = dedupe(best.spells.sort((a, b) => b.w - a.w || a.r - b.r), (r) => `${r.matchId}${r.name}`).slice(0, 5);
if (spells.length >= 3) articles.push(recordList({ slug: 'records-best-bowling-figures-tracked', title: 'The best bowling figures in the matches we track', summary: `${spells[0].name} lead with ${spells[0].w}/${spells[0].r}.`, intro: 'The five best bowling spells across the stored scorecards:', label: 'Records', items: spells.map((s) => ({ matchId: s.matchId, text: `${s.name} ${s.w}/${s.r} (${nm(s.matchId)})` })) }));

EXPLAINERS.forEach((e, i) => articles.push({ ...e, label: 'Explainer', scoreline: '', publishedAt: new Date(Date.now() - (i + 3) * 86400e3), matchIds: [], teamIds: [], playerIds: [] }));

/* ---------- write articles ---------- */
let written = 0;
for (const a of articles) {
  const author = authorFor(a.category, a.slug);
  writeAsset(`${PUBLIC}/seed/news/${a.slug}.svg`, heroSvg({ title: a.title, category: a.category, label: a.label, scoreline: a.scoreline }));
  const r = await q(
    `INSERT INTO news_articles (id, title, slug, summary, content, image_url, author, author_id, source, category_id, language,
                               meta_title, meta_description, published_at, is_published, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'CricApp', $8, 'en', $1, $3, $9, true, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, content = EXCLUDED.content,
       image_url = EXCLUDED.image_url, author = EXCLUDED.author, author_id = EXCLUDED.author_id, category_id = EXCLUDED.category_id,
       meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, published_at = EXCLUDED.published_at,
       is_published = true, updated_at = NOW()
     RETURNING id`,
    [a.title, a.slug, a.summary, a.html, `/seed/news/${a.slug}.svg`, author.name, author.id, categoryId.get(a.category) ?? null, a.publishedAt],
  );
  const id = r.rows[0].id;
  await q(`DELETE FROM news_article_teams WHERE article_id = $1`, [id]);
  await q(`DELETE FROM news_article_players WHERE article_id = $1`, [id]);
  await q(`DELETE FROM news_article_matches WHERE article_id = $1`, [id]);
  for (const t of new Set(a.teamIds.filter((x) => knownTeams.has(x)))) await q(`INSERT INTO news_article_teams (article_id, team_id) VALUES ($1,$2)`, [id, t]);
  for (const pl of new Set(a.playerIds.filter((x) => knownPlayers.has(x)))) await q(`INSERT INTO news_article_players (article_id, player_id) VALUES ($1,$2)`, [id, pl]);
  for (const mid of new Set(a.matchIds)) await q(`INSERT INTO news_article_matches (article_id, match_id) VALUES ($1,$2)`, [id, mid]);
  written += 1;
}

/* ---------- gallery: its own posters (the public gallery hides images that articles already use) ---------- */
let gallery = 0;
for (const a of articles.filter((x) => /^(match-report|match-result|match-preview|tournament-watch)-/.test(x.slug)).slice(0, 24)) {
  const file = `/seed/gallery/${a.slug}.svg`;
  writeAsset(`${PUBLIC}${file}`, heroSvg({ title: a.scoreline || a.title, category: 'features', label: a.label, scoreline: a.title }));
  await q(
    `INSERT INTO gallery_media (id, title, caption, type, purpose, url, public_id, resource_type, width, height, format, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'image', 'gallery', $3, $4, 'image', 1200, 630, 'svg', NOW(), NOW())
     ON CONFLICT (public_id) DO UPDATE SET title = EXCLUDED.title, caption = EXCLUDED.caption, url = EXCLUDED.url, updated_at = NOW()`,
    [a.label + ': ' + (a.scoreline || a.title), a.summary, file, `seed-gallery-${a.slug}`],
  );
  gallery += 1;
}

/* ---------- streams ---------- */
let streams = 0;
for (const [title, channel] of STREAMS) {
  const url = `https://www.youtube.com/embed/live_stream?channel=${channel}`;
  const ex = await q(`SELECT id FROM live_streams WHERE title = $1`, [title]);
  if (ex.rowCount) await q(`UPDATE live_streams SET stream_url = $2, provider = 'YouTube', updated_at = NOW() WHERE id = $1`, [ex.rows[0].id, url]);
  else await q(`INSERT INTO live_streams (id, title, stream_url, provider, status, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, 'YouTube', 'upcoming', NOW(), NOW())`, [title, url]);
  streams += 1;
}

/* ---------- editorial pages ---------- */
for (const pg_ of PAGES) {
  await q(
    `INSERT INTO editorial_pages (id, slug, title, content, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW()`,
    [pg_.slug, pg_.title, pg_.content],
  );
}

console.log(JSON.stringify({ authors: AUTHORS.length, articles: written, gallery, streams, pages: PAGES.length }));
await db.end();
