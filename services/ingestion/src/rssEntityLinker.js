import { query } from './db.js';

let cachedEntities = null;
let cacheExpiresAt = 0;

async function loadEntities() {
  if (cachedEntities && Date.now() < cacheExpiresAt) return cachedEntities;
  const [teams, tournaments] = await Promise.all([
    query(`SELECT id, name FROM teams WHERE char_length(name) >= 4 LIMIT 300`).catch(() => ({ rows: [] })),
    query(`SELECT id, name FROM tournaments WHERE char_length(name) >= 5 LIMIT 150`).catch(() => ({ rows: [] })),
  ]);
  cachedEntities = {
    teams: teams.rows || [],
    tournaments: tournaments.rows || [],
  };
  cacheExpiresAt = Date.now() + 15 * 60 * 1000;
  return cachedEntities;
}

/**
 * Automatically links a newly imported RSS article to mentioned teams and tournaments
 * so it surfaces on team and tournament hub pages.
 */
export async function linkRssArticleEntities(articleId, text) {
  if (!articleId || !text) return;
  const haystack = String(text).toLowerCase();
  const { teams, tournaments } = await loadEntities();

  const teamIds = teams
    .filter((t) => haystack.includes(String(t.name).toLowerCase()))
    .slice(0, 4)
    .map((t) => t.id);

  for (const teamId of teamIds) {
    await query(
      `INSERT INTO news_article_teams (article_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [articleId, teamId],
    ).catch(() => {});
  }

  const seriesIds = tournaments
    .filter((t) => haystack.includes(String(t.name).toLowerCase()))
    .slice(0, 2)
    .map((t) => t.id);

  for (const tournamentId of seriesIds) {
    await query(
      `INSERT INTO news_article_series (article_id, tournament_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [articleId, tournamentId],
    ).catch(() => {});
  }
}
