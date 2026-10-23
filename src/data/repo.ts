import { articles } from './mock/news';
import { banners, shorts, videos } from './mock/media';
import { comments, fallbackThread, reactions } from './mock/comments';
import { commentary, matches, overSummaries, scorecards } from './mock/matches';
import {
  headToHead,
  modelPerformance,
  playerRankings,
  predictions,
  standings,
  teamRankings,
} from './mock/insights';
import { allPlayers, allSeries, allTeams, playerName, team } from './refs';
import { liveState } from './live';
import type { Article, Ball, Comment, Innings, Match, NewsCategory, OverSummary, Prediction } from './types';

/*
 * The app's only data entry point. Every function is async and shaped like
 * the future NestJS endpoint, so replacing the bodies with fetch calls is
 * the whole backend migration.
 */

const posted: Record<string, Comment[]> = {};

const wait = (ms = 280) => new Promise<void>(r => setTimeout(r, ms));

const resolveMatch = (m: Match): Match => liveState.match(m.id) ?? m;
const byStart = (a: Match, b: Match) => +new Date(a.startTime) - +new Date(b.startTime);

export const repo = {
  async home() {
    await wait();
    const all = matches.map(resolveMatch);
    const live = all.filter(m => m.status === 'live');
    return {
      live,
      livePredictions: Object.fromEntries(
        live.map(m => [m.id, liveState.prediction(m.id) ?? predictions[m.id]]).filter(([, p]) => p),
      ) as Record<string, Prediction>,
      upcoming: all.filter(m => m.status === 'upcoming').sort(byStart),
      results: all.filter(m => m.status === 'completed').sort(byStart).reverse(),
      stories: articles.filter(a => a.lang === 'en').slice(0, 6),
      featuredPrediction: liveState.prediction('m5') ?? predictions.m5,
      shorts,
      banners,
    };
  },

  async shorts() {
    await wait(150);
    return shorts;
  },

  async comments(thread: string): Promise<{ list: Comment[]; total: number; reactions?: Record<string, number> }> {
    await wait(220);
    const list = [...(posted[thread] ?? []), ...(comments[thread] ?? fallbackThread(thread))];
    const total = list.reduce((n, c) => n + 1 + c.replies.length, 0);
    return { list, total: thread === 'match:m1' ? total + 124 : total, reactions: reactions[thread] };
  },

  /** Optimistic local post until the comments API is connected. */
  async postComment(thread: string, body: string, replyTo?: string): Promise<Comment> {
    await wait(150);
    const c: Comment = { id: `local-${Date.now()}`, author: 'You', body, at: new Date().toISOString(), likes: 0, replies: [] };
    if (replyTo) {
      const all = [...(posted[thread] ?? []), ...(comments[thread] ?? fallbackThread(thread))];
      all.find(x => x.id === replyTo)?.replies.push(c);
    } else {
      posted[thread] = [c, ...(posted[thread] ?? [])];
    }
    return c;
  },

  async media() {
    await wait(200);
    return { shorts: shorts.filter(s => s.kind === 'short'), galleries: shorts.filter(s => s.kind === 'gallery'), videos };
  },

  async matches() {
    await wait();
    return matches.map(resolveMatch);
  },

  async match(id: string) {
    await wait(200);
    const m = matches.find(x => x.id === id);
    if (!m) throw new Error('Match not found');
    return resolveMatch(m);
  },

  async scorecard(id: string): Promise<Innings[]> {
    await wait(200);
    const live = liveState.scorecard(id);
    if (live) return live;
    if (scorecards[id]) return scorecards[id];
    const m = matches.find(x => x.id === id);
    return m ? m.innings.map(inn => synthInnings(inn.teamId, inn.runs, inn.wickets, inn.balls, opponent(m, inn.teamId))) : [];
  },

  async commentary(id: string): Promise<{ balls: Ball[]; overs: OverSummary[] }> {
    await wait(200);
    return {
      balls: liveState.commentary(id) ?? commentary[id] ?? [],
      overs: overSummaries[id] ?? [],
    };
  },

  async prediction(id: string): Promise<Prediction | undefined> {
    await wait(220);
    return liveState.prediction(id) ?? predictions[id];
  },

  async predictions() {
    await wait();
    const all = matches.map(resolveMatch);
    const withP = all
      .map(m => ({ match: m, prediction: liveState.prediction(m.id) ?? predictions[m.id] }))
      .filter((x): x is { match: Match; prediction: Prediction } => !!x.prediction);
    return {
      live: withP.filter(x => x.match.status === 'live'),
      upcoming: withP.filter(x => x.match.status === 'upcoming'),
      settled: withP.filter(x => x.match.status === 'completed'),
      performance: modelPerformance,
    };
  },

  async modelPerformance() {
    await wait();
    return modelPerformance;
  },

  async standings(seriesId: string) {
    await wait(200);
    return standings[seriesId] ?? [];
  },

  async news(opts: { category?: NewsCategory | 'All'; lang?: 'en' | 'ur' } = {}) {
    await wait();
    return articles.filter(
      a =>
        (opts.lang ? a.lang === opts.lang : true) &&
        (!opts.category || opts.category === 'All' || a.category === opts.category || (opts.category === 'Breaking' && a.breaking)),
    );
  },

  async article(id: string): Promise<{ article: Article; related: Article[] }> {
    await wait(200);
    const article = articles.find(a => a.id === id);
    if (!article) throw new Error('Article not found');
    const related = articles
      .filter(a => a.id !== id && a.lang === article.lang && a.teamIds.some(t => article.teamIds.includes(t)))
      .slice(0, 3);
    return { article, related };
  },

  async newsFor(entity: { teamId?: string; playerId?: string; matchId?: string; seriesId?: string }) {
    await wait(200);
    return articles.filter(
      a =>
        a.lang === 'en' &&
        ((entity.teamId && a.teamIds.includes(entity.teamId)) ||
          (entity.playerId && a.playerIds.includes(entity.playerId)) ||
          (entity.matchId && a.matchId === entity.matchId) ||
          (entity.seriesId && a.seriesId === entity.seriesId)),
    );
  },

  async team(id: string) {
    await wait();
    const t = team(id);
    const all = matches.map(resolveMatch).filter(m => m.teamA === id || m.teamB === id);
    return {
      team: t,
      squad: allPlayers.filter(p => p.teamId === id),
      fixtures: all.filter(m => m.status !== 'completed').sort(byStart),
      results: all.filter(m => m.status === 'completed').sort(byStart).reverse(),
      news: articles.filter(a => a.lang === 'en' && a.teamIds.includes(id)),
    };
  },

  async player(id: string) {
    await wait();
    const p = allPlayers.find(x => x.id === id);
    if (!p) throw new Error('Player not found');
    return { player: p, news: articles.filter(a => a.lang === 'en' && a.playerIds.includes(id)) };
  },

  async series(id: string) {
    await wait();
    const s = allSeries.find(x => x.id === id);
    if (!s) throw new Error('Series not found');
    const list = matches.map(resolveMatch).filter(m => m.seriesId === id).sort(byStart);
    return {
      series: s,
      matches: list,
      standings: standings[id] ?? [],
      news: articles.filter(a => a.lang === 'en' && a.seriesId === id),
    };
  },

  async rankings() {
    await wait();
    return { teams: teamRankings, players: playerRankings };
  },

  async headToHead(a: string, b: string) {
    await wait(200);
    return headToHead[`${a}-${b}`] ?? headToHead[`${b}-${a}`];
  },

  async search(q: string) {
    await wait(150);
    const needle = q.trim().toLowerCase();
    if (!needle) return { teams: [], players: [], series: [], articles: [] };
    const has = (s: string) => s.toLowerCase().includes(needle);
    return {
      teams: allTeams.filter(t => has(t.name) || has(t.short)).slice(0, 5),
      players: allPlayers.filter(p => has(p.name)).slice(0, 6),
      series: allSeries.filter(s => has(s.name) || has(s.short)).slice(0, 4),
      articles: articles.filter(a => has(a.title)).slice(0, 5),
    };
  },
};

const opponent = (m: Match, teamId: string) => (m.teamA === teamId ? m.teamB : m.teamA);

/** Plausible scorecard for matches without one in the sample data. */
function synthInnings(teamId: string, runs: number, wickets: number, balls: number, bowlingTeamId: string): Innings {
  const bat = allPlayers.filter(p => p.teamId === teamId);
  const bowl = allPlayers.filter(p => p.teamId === bowlingTeamId && p.role !== 'Batter' && p.role !== 'Wicketkeeper');
  const extras = Math.round(runs * 0.05);
  const shares = [0.24, 0.2, 0.16, 0.13, 0.1, 0.07, 0.05, 0.03, 0.02];
  const count = Math.min(bat.length, Math.max(wickets + 2, 2));
  const batting = bat.slice(0, count).map((p, i) => {
    const r = Math.round((runs - extras) * (shares[i] ?? 0.01));
    const bf = Math.max(1, Math.round((balls * (shares[i] ?? 0.01)) * 0.98));
    return {
      playerId: p.id,
      runs: r,
      balls: bf,
      fours: Math.floor(r / 9),
      sixes: Math.floor(r / 22),
      dismissal: i < wickets ? `c & b ${bowl[i % Math.max(1, bowl.length)]?.short ?? 'Bowler'}` : undefined,
    };
  });
  const overs = Math.ceil(balls / 6);
  const per = Math.max(1, bowl.length);
  return {
    teamId,
    batting,
    bowling: bowl.map((p, i) => ({
      playerId: p.id,
      balls: Math.round(balls / per),
      maidens: 0,
      runs: Math.round((runs - extras) / per),
      wickets: Math.floor(wickets / per) + (i < wickets % per ? 1 : 0),
    })),
    extras: { byes: 0, legByes: Math.floor(extras / 2), wides: Math.ceil(extras / 2), noBalls: 0 },
    fow: [],
    overRuns: Array.from({ length: overs }, (_, i) => Math.round((runs / overs) * (0.7 + ((i * 37) % 7) / 10))),
    overWickets: Array.from({ length: overs }, () => 0),
    yetToBat: bat.slice(count).map(p => p.id),
  };
}

export { playerName };
