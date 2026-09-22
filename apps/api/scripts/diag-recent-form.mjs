import pg from 'pg';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const babar = await c.query(
  `SELECT id, full_name, team_id FROM players WHERE full_name ILIKE '%babar%' LIMIT 3`,
);
console.log('players', babar.rows);
const teamId = babar.rows[0]?.team_id;
const team = await c.query(`SELECT id, name, abbr FROM teams WHERE id = $1`, [teamId]);
console.log('team', team.rows);
const abbr = team.rows[0]?.abbr;
const name = team.rows[0]?.name;
const counts = await c.query(
  `
  SELECT
    (SELECT COUNT(*)::int FROM matches WHERE status = 'completed' AND teams @> $1::jsonb) AS by_abbr,
    (SELECT COUNT(*)::int FROM matches WHERE status = 'completed' AND teams @> $2::jsonb) AS by_team_id,
    (SELECT COUNT(*)::int FROM matches WHERE status = 'completed' AND team_names::text ILIKE $3) AS by_name,
    (SELECT COUNT(*)::int FROM psl_fixtures WHERE home_team_id = $4 OR away_team_id = $4) AS psl_fixtures
  `,
  [JSON.stringify([abbr]), JSON.stringify([teamId]), `%${name?.split(' ').pop()}%`, teamId],
);
console.log('counts', counts.rows[0]);
const sampleTeams = await c.query(
  `SELECT DISTINCT jsonb_array_elements_text(teams) AS t FROM matches WHERE status='completed' LIMIT 15`,
);
console.log('sample match team tokens', sampleTeams.rows.map((r) => r.t));
await c.end();
