import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const t = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
     ) AS exists`,
  );
  console.log('_prisma_migrations table:', t.rows[0].exists);
  if (t.rows[0].exists) {
    const m = await client.query(
      'SELECT migration_name FROM _prisma_migrations ORDER BY started_at',
    );
    console.log('applied count:', m.rowCount);
    for (const r of m.rows) console.log(' ', r.migration_name);
  }
  const p = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'players'
       AND column_name IN ('avatar_url', 'profile_url')
     ORDER BY 1`,
  );
  console.log('players columns:', p.rows.map((r) => r.column_name).join(', ') || '(none)');
  for (const name of ['site_settings', 'prediction_narratives']) {
    const x = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1
       ) AS exists`,
      [name],
    );
    console.log(`table ${name}:`, x.rows[0].exists);
  }
  const ts = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'matches' AND column_name = 'team_scores'
     ) AS exists`,
  );
  console.log('matches.team_scores:', ts.rows[0].exists);
} finally {
  await client.end();
}
