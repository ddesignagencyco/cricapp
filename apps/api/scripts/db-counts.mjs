import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}
const c = new pg.Client({ connectionString: url });
await c.connect();
const tables = [
  'matches',
  'players',
  'teams',
  'tours',
  'tournaments',
  'tournament_seasons',
  'psl_standings',
  'psl_leaders',
  'psl_fixtures',
  'head_to_head',
  'sport_event_records',
];
for (const t of tables) {
  const r = await c.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
  console.log(String(t).padEnd(22), r.rows[0].n);
}
const babar = await c.query(
  `SELECT id, full_name FROM players WHERE full_name ILIKE $1 LIMIT 5`,
  ['%babar%'],
);
console.log('babar sample:', babar.rows);
const psl = await c.query(
  `SELECT season_id, COUNT(*)::int AS n FROM psl_standings GROUP BY season_id ORDER BY season_id`,
);
console.log('psl_standings by season:', psl.rows);
await c.end();
