/**
 * Applies schema changes for backend priorities 1–4 (authors, news fields,
 * entity links, share stats, notification logs).
 *
 * Usage: node scripts/migrate-priorities.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cricapp:cricapp_dev_password@localhost:5432/cricapp',
});

async function run(sql) {
  await pool.query(sql);
}

(async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS authors (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        bio TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await run(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS author_id TEXT REFERENCES authors(id)`);
    await run(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en'`);
    await run(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS meta_title TEXT`);
    await run(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS meta_description TEXT`);
    await run(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS canonical_url TEXT`);
    await run(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false`);
    await run(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS is_breaking BOOLEAN DEFAULT false`);

    await run(`CREATE INDEX IF NOT EXISTS idx_news_articles_language ON news_articles(language)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_news_articles_is_featured ON news_articles(is_featured)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_news_articles_is_breaking ON news_articles(is_breaking)`);

    await run(`
      CREATE TABLE IF NOT EXISTS news_article_players (
        article_id TEXT NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        PRIMARY KEY (article_id, player_id)
      )
    `);
    await run(`
      CREATE TABLE IF NOT EXISTS news_article_teams (
        article_id TEXT NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        PRIMARY KEY (article_id, team_id)
      )
    `);
    await run(`
      CREATE TABLE IF NOT EXISTS news_article_matches (
        article_id TEXT NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
        match_id TEXT NOT NULL,
        PRIMARY KEY (article_id, match_id)
      )
    `);
    await run(`
      CREATE TABLE IF NOT EXISTS news_article_series (
        article_id TEXT NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
        tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        PRIMARY KEY (article_id, tournament_id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS share_stats (
        share_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        count INT DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (share_type, target_id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT REFERENCES users(id),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at)`);

    console.log('Priority migration applied successfully');
  } catch (e) {
    console.error('Migration error:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
