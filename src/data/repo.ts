import { ApiError, api, seg, type Query } from '../api/client';
import {
  categoryIndex,
  matchExtras,
  toArticle,
  toCommentary,
  toMatch,
  toPlayer,
  toScorecard,
  toShorts,
  toStanding,
  toVideo,
  type RawGallery,
  type RawMatch,
  type RawNews,
  type RawPlayer,
  type RawStanding,
  type RawTimeline,
} from './adapt';
import { allSeries, playerName, rememberSeries, rememberTeam, seriesOf, team } from './refs';
import type {
  Article,
  Ball,
  Banner,
  Comment,
  Format,
  Innings,
  Match,
  NewsCategory,
  OverSummary,
  Prediction,
  Ranking,
  Short,
  Standing,
  Video,
} from './types';

/*
 * The app's only data entry point, backed by the CricApp NestJS API
 * (cric_info/apps/api). Responses are mapped to the app's domain types in
 * data/adapt.ts. Where the API has nothing for a feature yet, functions
 * return empty results and screens show their empty states — never
 * made-up data.
 */

/** Pakistan men's team and the PSL, the two hubs the app is built around. */
export const PAKISTAN_ID = 'sr:competitor:142704';
export const PSL_ID = 'psl';

type Page<T> = { data: T[]; meta?: { totalRecords?: number; hasNextPage?: boolean } };

/** One page plus whether another follows (the API's pagination meta). */
const page = async <T>(path: string, query: Query): Promise<{ data: T[]; hasMore: boolean }> => {
  const res = await api.get<Page<T>>(path, query);
  return { data: res.data ?? [], hasMore: !!res.meta?.hasNextPage };
};

export const PAGE_SIZE = 15;

const list = async <T>(path: string, query?: Query): Promise<T[]> => (await api.get<Page<T>>(path, query)).data ?? [];

/** A 404 is "nothing here yet", not an error. */
async function maybe<T>(p: Promise<T>): Promise<T | undefined> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return undefined;
    throw e;
  }
}

const byStart = (a: Match, b: Match) => +new Date(a.startTime) - +new Date(b.startTime);

/* ---------------------------------------------------------------- matches */

async function matchList(status: 'live' | 'upcoming' | 'completed', limit = 60, extra?: Query) {
  const rows = status === 'live' ? await list<RawMatch>('/matches/live') : await list<RawMatch>('/matches', { status, limit, ...extra });
  return rows.map(toMatch);
}

/** The timeline payload is large and the match centre needs it three times (header, scorecard, commentary); share one fetch for a few seconds. */
const timelines = new Map<string, { at: number; p: Promise<RawTimeline | undefined> }>();
function timeline(id: string) {
  const hit = timelines.get(id);
  if (hit && Date.now() - hit.at < 8000) return hit.p;
  const p = maybe(api.get<RawTimeline>(`/matches/${seg(id)}/timeline`));
  timelines.set(id, { at: Date.now(), p });
  p.catch(() => timelines.delete(id));
  return p;
}

/** Sportradar schedule rows (daily schedule / results) → the list shape toMatch reads. */
interface RawScheduleRow {
  eventId: string;
  status: string;
  scheduled: string;
  payload: {
    id?: string;
    sport_event?: RawScheduleEvent;
    sport_event_status?: { status?: string; match_status?: string; period_scores?: RawMatch['periodScores']; match_result_text?: string; winner_id?: string };
  } & RawScheduleEvent;
}
interface RawScheduleEvent {
  tournament?: { id: string; name: string };
  venue?: { name?: string };
  competitors?: { id: string; name: string; abbreviation?: string; qualifier?: string }[];
}

/** Event details come from the fixture row; scores from the results row when the match has one. */
function fromSchedule(row: RawScheduleRow, result?: RawScheduleRow): RawMatch {
  const ev = row.payload.sport_event ?? row.payload;
  const st = result?.payload.sport_event_status ?? row.payload.sport_event_status;
  const side = (q: string) => {
    const c = ev.competitors?.find(x => x.qualifier === q);
    return { id: c?.id, name: c?.name, code: c?.abbreviation };
  };
  return {
    matchId: row.eventId,
    status: st?.status ?? row.status,
    matchStatus: st?.match_status,
    teams: { home: side('home'), away: side('away') },
    tournament: ev.tournament?.name,
    tournamentId: ev.tournament?.id,
    venue: ev.venue?.name,
    scheduled: row.scheduled,
    periodScores: st?.period_scores,
    result: st?.match_result_text,
    winnerId: st?.winner_id,
  };
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ---------------------------------------------------------------- news */

let categoriesLoaded: Promise<void> | null = null;
const loadCategories = () =>
  (categoriesLoaded ??= api
    .get<{ id: string; slug: string }[]>('/news/categories')
    .then(cats => cats.forEach(c => categoryIndex.set(c.id, c.slug)))
    .catch(() => {
      categoriesLoaded = null;
    }));

const CATEGORY_SLUG: Partial<Record<NewsCategory, string>> = {
  Breaking: 'breaking',
  Pakistan: 'pakistan-cricket',
  PSL: 'psl',
  International: 'international',
  'Match News': 'match-news',
  Analysis: 'analysis',
  Features: 'features',
  Records: 'records',
  Interviews: 'interviews',
  Explainers: 'explainers',
};

async function newsList(query: Query = {}): Promise<Article[]> {
  await loadCategories();
  return (await list<RawNews>('/news', { limit: 30, ...query })).map(toArticle);
}

/* ---------------------------------------------------------------- predictions */

interface RawPredictionRun {
  modelVersion?: string;
  createdAt?: string;
  homeWinProb?: number;
  /** 0..1 model confidence; the label comes from calibrationBand. */
  confidence?: number | null;
  calibrationBand?: string | null;
  scoreRange?: { low?: number; high?: number; expected?: number } | null;
  topBatters?: { playerId?: string; probability?: number }[] | null;
  topBowlers?: { playerId?: string; probability?: number }[] | null;
  momentum?: number | null;
  pressureIndex?: number | null;
  explanation?: { weights?: Record<string, number> } & Record<string, unknown>;
  narrative?: string | null;
}

function toPrediction(match: Match, run: RawPredictionRun, history?: { over?: number; homeWinProb?: number }[]): Prediction {
  const conf = String(run.calibrationBand ?? '').toLowerCase();
  return {
    matchId: match.id,
    modelVersion: run.modelVersion ?? '',
    generatedAt: run.createdAt ?? new Date().toISOString(),
    winA: run.homeWinProb ?? 0.5,
    confidence: conf.startsWith('high') ? 'High' : conf.startsWith('low') ? 'Low' : 'Medium',
    projected: {
      // A first-innings band: the side batting first isn't known before the toss.
      teamId: match.innings[0]?.teamId ?? match.teamA,
      low: run.scoreRange?.low ?? 0,
      high: run.scoreRange?.high ?? 0,
      mid: run.scoreRange?.expected ?? Math.round(((run.scoreRange?.low ?? 0) + (run.scoreRange?.high ?? 0)) / 2),
    },
    history: history?.filter(h => h.homeWinProb !== undefined).map(h => ({ over: h.over ?? 0, p: h.homeWinProb! })),
    topBatters: (run.topBatters ?? []).filter(b => b.playerId).map(b => ({ playerId: b.playerId!, p: b.probability ?? 0 })),
    topBowlers: (run.topBowlers ?? []).filter(b => b.playerId).map(b => ({ playerId: b.playerId!, p: b.probability ?? 0 })),
    venue: [],
    weather: { temp: 0, humidity: 0, wind: 0, rain: 0, summary: '' },
    why: [],
    narrative: plainNarrative(run.narrative, team(match.teamA).name, team(match.teamB).name),
    momentum: run.momentum ?? undefined,
    pressure: run.pressureIndex ?? undefined,
    // What the model weighs, from the stored run.
    inputs: Object.keys(run.explanation?.weights ?? {}).map(k => INPUT_LABEL[k] ?? k),
  };
}

/**
 * The API's narrative is written for auditors ("Pre-match stored run: …",
 * "This text explains the stored statistical run…"). Keep the facts, drop
 * the model talk, so readers get a plain summary.
 */
function plainNarrative(text: string | null | undefined, home: string, away: string): string | undefined {
  if (!text) return undefined;
  const out = text
    .replace(/^(pre-match|live)\s+stored run:\s*/i, '')
    .split(/(?<=\.)\s+/)
    .filter(sentence => !/stored statistical run|not a new forecast|model version|calibrat/i.test(sentence))
    .map(sentence =>
      sentence
        .replace(/model confidence/gi, 'Confidence')
        .replace(/stored first innings band/gi, 'Likely first-innings score')
        .replace(/main stored factors?:/gi, 'Key factors:')
        .replace(/favours home/gi, `favours ${home}`)
        .replace(/favours away/gi, `favours ${away}`)
        .replace(/\s*\((low|medium|high) band\)/gi, (_, b: string) => ` (${b.toLowerCase()})`),
    )
    .join(' ')
    .trim();
  return out || undefined;
}

const INPUT_LABEL: Record<string, string> = {
  xi: 'Expected playing XI',
  h2h: 'Head-to-head record',
  form: 'Recent form',
  toss: 'Toss',
  table: 'League table position',
  venue: 'Venue',
  conditions: 'Conditions',
};

type RawLatest = { preMatch?: RawPredictionRun | null; live?: RawPredictionRun | null };
type RawChart = { points?: { over?: number; homeWinProb?: number }[] };

const latestRun = (id: string) => maybe(api.get<RawLatest>(`/predictions/${seg(id)}`)).catch(() => undefined);
const chartOf = (id: string) => maybe(api.get<RawChart>(`/predictions/${seg(id)}/chart`)).catch(() => undefined);

/** Bulk lookup so list screens don't fire one request per match. */
async function predictionsFor(matches: Match[]): Promise<Record<string, Prediction>> {
  if (!matches.length) return {};
  // The API accepts at most 50 ids per call.
  const ids = [...new Set(matches.map(m => m.id))];
  const chunks = Array.from({ length: Math.ceil(ids.length / 50) }, (_, i) => ids.slice(i * 50, i * 50 + 50));
  const pages = await Promise.all(
    chunks.map(matchIds =>
      api
        .post<{ data?: Record<string, { preMatch?: RawPredictionRun | null; live?: RawPredictionRun | null }> }>('/predictions/bulk', { matchIds })
        .catch(() => undefined),
    ),
  );
  const data = Object.assign({}, ...pages.map(p => p?.data ?? {}));
  const out: Record<string, Prediction> = {};
  for (const m of matches) {
    const r = data[m.id];
    const run = r?.live ?? r?.preMatch;
    if (run) out[m.id] = toPrediction(m, run);
  }
  return out;
}

/* ---------------------------------------------------------------- comments */

/** App thread keys ("match:<id>", "article:<id>", "stream:<id>") → API targets. */
const target = (thread: string) => {
  const i = thread.indexOf(':');
  const kind = thread.slice(0, i);
  return { targetType: kind === 'article' ? 'news' : kind, targetId: thread.slice(i + 1) };
};

interface RawComment {
  id: string;
  body: string;
  createdAt: string;
  user?: { username?: string; displayName?: string | null };
}

const toComment = (c: RawComment): Comment => ({
  id: c.id,
  author: c.user?.displayName || c.user?.username || 'Fan',
  body: c.body,
  at: c.createdAt,
  likes: 0,
  replies: [],
});

/* ---------------------------------------------------------------- repo */

export const repo = {
  async home() {
    const [live, upcoming, results, stories, gallery, urdu, pslTable, streams] = await Promise.all([
      matchList('live'),
      matchList('upcoming', 10),
      matchList('completed', 10),
      newsList({ language: 'en', limit: 8 }),
      list<RawGallery>('/gallery', { limit: 20 }).catch(() => [] as RawGallery[]),
      newsList({ language: 'ur', limit: 6 }).catch(() => [] as Article[]),
      list<RawStanding>('/psl/standings').then(r => r.map(toStanding)).catch(() => [] as Standing[]),
      list<Stream>('/streams', { limit: 6 }).catch(() => [] as Stream[]),
    ]);
    // One bulk call for both lists.
    const preds = await predictionsFor([...live, ...upcoming.slice(0, 6)]);
    const livePredictions = Object.fromEntries(live.filter(m => preds[m.id]).map(m => [m.id, preds[m.id]]));
    const upcomingPredictions = Object.fromEntries(upcoming.filter(m => preds[m.id]).map(m => [m.id, preds[m.id]]));
    const featuredId = Object.keys(upcomingPredictions)[0];
    // Hero banners: the latest stories that have a cover image.
    const banners: Banner[] = stories
      .filter(a => a.image)
      .slice(0, 3)
      .map(a => ({
        id: `b-${a.id}`,
        overline: a.category.toUpperCase(),
        title: a.title,
        cta: 'Read story',
        photo: a.image,
        teamIds: a.teamIds,
        route: { name: 'Article', id: a.id },
      }));
    return {
      live,
      livePredictions,
      upcoming: upcoming.sort(byStart),
      results,
      stories,
      featuredPrediction: featuredId ? upcomingPredictions[featuredId] : undefined,
      shorts: toShorts(gallery),
      banners,
      urdu,
      pslTable: pslTable.slice(0, 4),
      streams,
    };
  },

  async shorts(): Promise<Short[]> {
    return toShorts(await list<RawGallery>('/gallery', { limit: 30 }));
  },

  async media(): Promise<{ shorts: Short[]; galleries: Short[]; videos: Video[] }> {
    const items = await list<RawGallery>('/gallery', { limit: 30 });
    const all = toShorts(items);
    return {
      shorts: all.filter(s => s.kind === 'short'),
      galleries: all.filter(s => s.kind === 'gallery'),
      videos: items.filter(i => i.type === 'video').map(toVideo),
    };
  },

  async comments(thread: string): Promise<{ list: Comment[]; total: number; reactions?: Record<string, number> }> {
    const t = target(thread);
    const [page, reactions] = await Promise.all([
      api.get<Page<RawComment>>('/comments', { ...t, limit: 50 }),
      api.get<{ counts?: Record<string, number> }>('/reactions', t).catch(() => undefined),
    ]);
    const all = (page.data ?? []).map(toComment);
    return { list: all, total: page.meta?.totalRecords ?? all.length, reactions: reactions?.counts };
  },

  /** Needs a signed-in user (the API checks the session cookie). Replies post as top-level comments. */
  async postComment(thread: string, body: string, _replyTo?: string): Promise<Comment> {
    return toComment(await api.post<RawComment>('/comments', { ...target(thread), body }));
  },

  /** Toggle the signed-in user's reaction on a thread. */
  async react(thread: string, emoji: string): Promise<'added' | 'removed'> {
    return (await api.post<{ toggled: 'added' | 'removed' }>('/reactions', { ...target(thread), emoji })).toggled;
  },

  /** Matches in play right now (small list, refreshed on every live tick). */
  async liveMatches(): Promise<Match[]> {
    return matchList('live');
  },

  /**
   * One page of a day's fixtures. Results for the same page carry the scores,
   * so finished games show them without a request per match.
   */
  async matchesOn(day: Date, pageNo: number): Promise<{ items: Match[]; hasMore: boolean }> {
    const date = ymd(day);
    const [fixtures, results] = await Promise.all([
      page<RawScheduleRow>(`/schedules/${date}`, { page: pageNo, limit: 20 }),
      pageNo === 1 ? page<RawScheduleRow>(`/schedules/${date}/results`, { limit: 100 }).catch(() => ({ data: [], hasMore: false })) : Promise.resolve({ data: [] as RawScheduleRow[], hasMore: false }),
    ]);
    const scored = new Map(results.data.map(r => [r.eventId, r]));
    const items = fixtures.data.map(r => toMatch(fromSchedule(r, scored.get(r.eventId))));
    return { items: items.sort(byStart), hasMore: fixtures.hasMore };
  },

  /** One page of matches with a status, like the website's match board tabs. */
  async statusPage(status: 'upcoming' | 'completed' | 'cancelled', pageNo: number): Promise<{ items: Match[]; hasMore: boolean }> {
    const res = await page<RawMatch>('/matches', { status, page: pageNo, limit: PAGE_SIZE });
    return { items: res.data.map(toMatch), hasMore: res.hasMore };
  },

  /** Upcoming fixtures, soonest first, a page at a time. */
  async upcomingPage(pageNo: number): Promise<{ items: Match[]; hasMore: boolean }> {
    const res = await page<RawMatch>('/matches', { status: 'upcoming', page: pageNo, limit: PAGE_SIZE });
    return { items: res.data.map(toMatch), hasMore: res.hasMore };
  },

  async match(id: string): Promise<Match> {
    const [m, t] = await Promise.all([api.get<RawMatch>(`/matches/${seg(id)}`), timeline(id).catch(() => undefined)]);
    const match = toMatch(m);
    if (!t) return match;
    const extras = matchExtras(t);
    const balls = toCommentary(t).balls;
    if (match.live) {
      match.live.recent = balls.slice(0, 6).map(b => b.outcome).reverse();
      // Current stand: runs and legal balls since the last wicket (balls are newest first).
      let runs = 0;
      let faced = 0;
      for (const b of balls) {
        if (b.outcome.kind === 'wicket') break;
        const o = b.outcome;
        runs += o.kind === 'four' ? 4 : o.kind === 'six' ? 6 : o.kind === 'runs' || o.kind === 'extra' ? o.runs : 0;
        if (!(o.kind === 'extra' && (o.label === 'wd' || o.label === 'nb'))) faced++;
      }
      match.live.partnership = { runs, balls: faced };
      // Required rate in a limited-overs chase.
      const cur = match.innings[match.innings.length - 1];
      const quota = match.format === 'ODI' ? 300 : match.format === 'T10' ? 60 : match.format === 'T20' ? 120 : 0;
      if (match.target && cur && quota && match.innings.length >= 2) {
        const need = match.target - cur.runs;
        const left = quota - cur.balls;
        if (need > 0 && left > 0) match.live.rrr = (need / left) * 6;
      }
    }
    return { ...match, ...Object.fromEntries(Object.entries(extras).filter(([, v]) => v !== undefined && v !== '')) };
  },

  async scorecard(id: string): Promise<Innings[]> {
    const t = await timeline(id).catch(() => undefined);
    return t ? toScorecard(t) : [];
  },

  async commentary(id: string): Promise<{ balls: Ball[]; overs: OverSummary[] }> {
    const t = await timeline(id).catch(() => undefined);
    return t ? toCommentary(t) : { balls: [], overs: [] };
  },

  async prediction(id: string): Promise<Prediction | undefined> {
    const [raw, latest, chart] = await Promise.all([api.get<RawMatch>(`/matches/${seg(id)}`), latestRun(id), chartOf(id)]);
    const run = latest?.live ?? latest?.preMatch;
    return run ? toPrediction(toMatch(raw), run, chart?.points) : undefined;
  },

  async predictions() {
    const [live, upcoming] = await Promise.all([matchList('live'), matchList('upcoming', 12)]);
    const preds = await predictionsFor([...live, ...upcoming]);
    const pair = (ms: Match[]) => ms.filter(m => preds[m.id]).map(m => ({ match: m, prediction: preds[m.id] }));
    return {
      live: pair(live),
      upcoming: pair(upcoming),
      settled: [] as { match: Match; prediction: Prediction }[],
    };
  },

  async standings(seriesId: string): Promise<Standing[]> {
    if (seriesId === PSL_ID || /psl|pakistan super/i.test(seriesOf(seriesId)?.name ?? '')) {
      return (await list<RawStanding>('/psl/standings')).map(toStanding);
    }
    return [];
  },

  /** A short list (hubs, previews). Full feeds use newsPage. */
  async news(opts: { category?: NewsCategory | 'All'; lang?: 'en' | 'ur' } = {}): Promise<Article[]> {
    const category = opts.category && opts.category !== 'All' ? CATEGORY_SLUG[opts.category] : undefined;
    return newsList({ language: opts.lang, category, limit: PAGE_SIZE });
  },

  async newsPage(opts: { categories?: NewsCategory[]; lang?: 'en' | 'ur' }, pageNo: number): Promise<{ items: Article[]; hasMore: boolean }> {
    await loadCategories();
    // The API filters by one category; a multi-category section uses the first.
    const c = opts.categories?.[0];
    const category = c ? CATEGORY_SLUG[c] : undefined;
    const res = await page<RawNews>('/news', { language: opts.lang, category, page: pageNo, limit: PAGE_SIZE });
    return { items: res.data.map(toArticle), hasMore: res.hasMore };
  },

  async article(id: string): Promise<{ article: Article; related: Article[] }> {
    await loadCategories();
    const article = toArticle(await api.get<RawNews>(`/news/${seg(id)}`));
    const teamId = article.teamIds[0];
    const related = (await newsList({ language: article.lang, teamId, limit: 4 }).catch(() => [])).filter(a => a.id !== id).slice(0, 3);
    return { article, related };
  },

  async newsFor(entity: { teamId?: string; playerId?: string; matchId?: string; seriesId?: string }): Promise<Article[]> {
    return newsList({ language: 'en', limit: 10, ...entity });
  },

  async team(id: string) {
    const apiId = id.startsWith('code:') ? id.slice(5) : id;
    const [t, squad, news] = await Promise.all([
      api.get<{ id: string; name: string; abbr?: string; logoUrl?: string | null }>(`/teams/${seg(apiId)}`),
      list<RawPlayer>(`/teams/${seg(apiId)}/players`).catch(() => [] as RawPlayer[]),
      newsList({ language: 'en', teamId: id, limit: 10 }).catch(() => [] as Article[]),
    ]);
    // Only this team's matches: search by name, then keep rows the team actually plays in.
    const [live, upcoming, results] = await Promise.all([
      matchList('live'),
      matchList('upcoming', 30, { q: t.name }),
      matchList('completed', 30, { q: t.name }),
    ]);
    const tm = rememberTeam({ id: t.id, name: t.name, short: t.abbr, logoUrl: t.logoUrl });
    const mine = (m: Match) => [m.teamA, m.teamB].some(x => x === t.id || team(x).name === t.name);
    return {
      team: tm,
      squad: squad.map(p => toPlayer(p, t.id)),
      fixtures: [...live, ...upcoming].filter(mine).sort(byStart),
      results: results.filter(mine),
      news,
    };
  },

  async player(id: string) {
    const p = await api.get<RawPlayer & { recentMatches?: RawMatch[] }>(`/players/${seg(id)}`);
    const player = toPlayer(p);
    const news = await newsList({ language: 'en', playerId: id, limit: 10 }).catch(() => [] as Article[]);
    return { player, news, recentMatches: (p.recentMatches ?? []).map(toMatch) };
  },

  async series(id: string) {
    if (id === PSL_ID) return pslSeries();
    const [t, matches, news] = await Promise.all([
      maybe(
        api.get<{ id: string; name: string; type?: string; gender?: string; category?: { name?: string }; currentSeason?: { name?: string; start_date?: string; end_date?: string } }>(
          `/tournaments/${seg(id)}`,
        ),
      ),
      id.startsWith('name:')
        ? list<RawMatch>('/matches', { tournament: seriesOf(id)?.name, limit: 100 })
        : list<RawMatch>('/matches', { tournamentId: id, limit: 100 }),
      newsList({ language: 'en', seriesId: id, limit: 10 }).catch(() => [] as Article[]),
    ]);
    const ms = matches.map(toMatch).sort(byStart);
    const known = seriesOf(id);
    const series = rememberSeries({
      id,
      name: t?.name ?? known?.name ?? 'Series',
      short: t?.name ?? known?.short ?? 'Series',
      slug: known?.slug ?? id,
      format: known?.format ?? ms[0]?.format ?? 'T20',
      kind: known?.kind ?? 'tournament',
      start: t?.currentSeason?.start_date ?? ms[0]?.startTime ?? '',
      end: t?.currentSeason?.end_date ?? ms[ms.length - 1]?.startTime ?? '',
      teamIds: [...new Set(ms.flatMap(m => [m.teamA, m.teamB]))],
      color: known?.color ?? '#3B68FC',
    });
    const info: SeriesInfo = {
      season: t?.currentSeason?.name,
      start: t?.currentSeason?.start_date,
      end: t?.currentSeason?.end_date,
      format: t?.type,
      gender: t?.gender,
      category: t?.category?.name,
    };
    return { series, matches: ms, standings: await repo.standings(id), news, info };
  },

  /** Subscribe an email to the newsletter. The API sends a welcome email with the preference link. */
  async subscribeNewsletter(email: string): Promise<string> {
    return (await api.post<{ message: string }>('/newsletter/subscribe', { email })).message;
  },

  /** A CMS policy page; undefined when the CMS has nothing published for it. */
  async editorialPage(slug: string): Promise<{ title: string; content: string; updatedAt?: string } | undefined> {
    const page = await maybe(api.get<{ title: string; content?: string | null; updatedAt?: string }>(`/editorial-pages/${seg(slug)}`));
    return page?.content?.trim() ? { title: page.title, content: page.content, updatedAt: page.updatedAt } : undefined;
  },

  /** Public contact details and social links set by admins on the website. */
  async siteSettings(): Promise<SiteSettings> {
    return api.get<SiteSettings>('/site-settings');
  },

  /** Sends a message to the team (the website's contact form). */
  async contact(message: { name: string; email: string; message: string }): Promise<void> {
    await api.post('/contact', message);
  },

  /** Streams and watch links, newest first. */
  async streamsPage(pageNo: number): Promise<{ items: Stream[]; hasMore: boolean }> {
    const res = await page<Stream>('/streams', { page: pageNo, limit: PAGE_SIZE });
    return { items: res.data, hasMore: res.hasMore };
  },

  /** Every tournament the data feed covers, alphabetically. */
  async tournamentsPage(pageNo: number): Promise<{ items: Tournament[]; hasMore: boolean }> {
    const res = await page<Tournament>('/tournaments', { page: pageNo, limit: 30 });
    return { items: res.data, hasMore: res.hasMore };
  },

  /** A team's registered squad only (the match centre doesn't need its fixtures or news). */
  async squad(id: string) {
    const apiId = id.startsWith('code:') ? id.slice(5) : id;
    return (await list<RawPlayer>(`/teams/${seg(apiId)}/players`)).map(p => toPlayer(p, id));
  },

  /** Just the team record (name, code, logo), registered for lookups. */
  async teamInfo(id: string) {
    const t = await api.get<{ id: string; name: string; abbr?: string; logoUrl?: string | null }>(`/teams/${seg(id.startsWith('code:') ? id.slice(5) : id)}`);
    return rememberTeam({ id, name: t.name, short: t.abbr, logoUrl: t.logoUrl });
  },

  /** PSL leaderboards as the API reports them (current season). */
  async pslLeaders(): Promise<{ key: string; title: string; unit: string; rows: { playerId: string; value: number }[] }[]> {
    const cats = await list<{ category: string; stat: string; entries: { playerId: string; playerName: string; teamAbbr?: string; teamName?: string; value: number }[] }>(
      '/psl/leaders',
    );
    const SHOW: Record<string, { title: string; unit: string }> = {
      top_runs: { title: 'Most runs', unit: 'RUNS' },
      top_wickets: { title: 'Most wickets', unit: 'WKTS' },
      top_sixes: { title: 'Most sixes', unit: '6s' },
      top_fours: { title: 'Most fours', unit: '4s' },
      top_catches: { title: 'Most catches', unit: 'CT' },
    };
    return cats
      .filter(c => SHOW[c.stat] && c.entries.length)
      .map(c => ({
        key: c.stat,
        ...SHOW[c.stat],
        rows: c.entries.slice(0, 5).map(e => {
          toPlayer({ id: e.playerId, fullName: e.playerName, team: e.teamName ? { id: `code:${e.teamAbbr}`, name: e.teamName, abbr: e.teamAbbr } : null });
          return { playerId: e.playerId, value: e.value };
        }),
      }));
  },

  /** The API has no rankings feed yet. */
  async rankings(): Promise<{ teams: Record<Format, Ranking[]>; players: Record<'batters' | 'bowlers' | 'allrounders', Ranking[]> }> {
    return { teams: { T20: [], ODI: [], Test: [], T10: [] }, players: { batters: [], bowlers: [], allrounders: [] } };
  },

  /** Last meetings between two teams (Sportradar team-vs-team), newest first. */
  async headToHead(a: string, b: string): Promise<{ played: number; aWins: number; bWins: number; noResult: number; last5: string[] } | undefined> {
    const strip = (x: string) => (x.startsWith('code:') ? x.slice(5) : x);
    const res = await maybe(
      api.get<{ payload?: { last_meetings?: { sport_event_status?: { winner_id?: string } }[] } }>(`/head-to-head/${seg(strip(a))}/${seg(strip(b))}`),
    ).catch(() => undefined);
    const meetings = res?.payload?.last_meetings ?? [];
    if (!meetings.length) return undefined;
    const winners = meetings.map(m => m.sport_event_status?.winner_id ?? '');
    const aWins = winners.filter(w => w === strip(a)).length;
    const bWins = winners.filter(w => w === strip(b)).length;
    return {
      played: meetings.length,
      aWins,
      bWins,
      noResult: meetings.length - aWins - bWins,
      last5: winners.slice(0, 5).map(w => (w === strip(a) ? a : w === strip(b) ? b : '')),
    };
  },

  async search(q: string) {
    const needle = q.trim();
    if (!needle) return { teams: [], players: [], series: [], articles: [] };
    const [res, articles] = await Promise.all([
      api.get<{
        players?: RawPlayer[];
        teams?: { id: string; name: string; abbr?: string; logoUrl?: string | null }[];
        tournaments?: { id: string; name: string; type?: string }[];
      }>('/search', { q: needle }),
      newsList({ q: needle, limit: 5 }).catch(() => [] as Article[]),
    ]);
    return {
      teams: (res.teams ?? []).slice(0, 5).map(t => rememberTeam({ id: t.id, name: t.name, short: t.abbr, logoUrl: t.logoUrl })),
      players: (res.players ?? []).slice(0, 6).map(p => toPlayer(p)),
      series: (res.tournaments ?? []).slice(0, 4).map(t =>
        rememberSeries({
          id: t.id,
          name: t.name,
          short: t.name,
          slug: t.id,
          format: t.type?.toLowerCase().includes('odi') ? 'ODI' : t.type?.toLowerCase().includes('test') ? 'Test' : 'T20',
          kind: 'tournament',
          start: '',
          end: '',
          teamIds: [],
          color: '#3B68FC',
        }),
      ),
      articles,
    };
  },
};

/** Tournament facts from the feed (season, dates, format, category). */
export interface SeriesInfo {
  season?: string;
  start?: string;
  end?: string;
  format?: string;
  gender?: string;
  category?: string;
}

export interface SiteSettings {
  email: string | null;
  supportEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  workingHours: string | null;
  socials: { platform: string; value: string }[];
}

export interface Stream {
  id: string;
  title: string;
  matchId: string | null;
  streamUrl: string;
  provider: string | null;
  thumbnailUrl: string | null;
  status: 'upcoming' | 'live' | 'ended' | string;
  scheduledAt: string | null;
  createdAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  type?: string | null;
  gender?: string | null;
  category?: { name?: string } | null;
  currentSeason?: { name?: string; start_date?: string; end_date?: string } | null;
}

interface RawPslMatch {
  matchId: string;
  status: string;
  scheduled: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamAbbr?: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamAbbr?: string;
  venue?: string | null;
  resultText?: string | null;
}

async function pslSeries() {
  const [standings, schedule, news] = await Promise.all([
    list<RawStanding>('/psl/standings'),
    list<RawPslMatch>('/psl/schedule'),
    newsList({ language: 'en', category: 'psl', limit: 10 }).catch(() => [] as Article[]),
  ]);
  const matches = schedule.map(s =>
    toMatch({
      matchId: s.matchId,
      status: s.status,
      teams: { home: { id: s.homeTeamId, name: s.homeTeamName, code: s.homeTeamAbbr }, away: { id: s.awayTeamId, name: s.awayTeamName, code: s.awayTeamAbbr } },
      tournament: 'Pakistan Super League',
      tournamentId: PSL_ID,
      venue: s.venue,
      scheduled: s.scheduled,
      result: s.resultText,
    }),
  );
  const table = standings.map(toStanding);
  const series = rememberSeries({
    id: PSL_ID,
    name: 'Pakistan Super League',
    short: 'PSL',
    slug: 'psl',
    format: 'T20',
    kind: 'league',
    start: matches[0]?.startTime ?? '',
    end: matches[matches.length - 1]?.startTime ?? '',
    teamIds: table.map(t => t.teamId),
    color: '#22B573',
  });
  const info: SeriesInfo = { season: 'Pakistan Super League', start: matches[0]?.startTime, end: matches[matches.length - 1]?.startTime, format: 't20', gender: 'men', category: 'Pakistan' };
  return { series, matches: matches.sort(byStart), standings: table, news, info };
}

export { playerName, allSeries };
