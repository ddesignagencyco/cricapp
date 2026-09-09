import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://cricapp:cricapp_dev_password@localhost:5432/cricapp',
});

async function main() {
  const tables = [
    'matches',
    'teams',
    'players',
    'tournaments',
    'tours',
    'sport_event_records',
    'psl_standings',
    'psl_fixtures',
    'psl_leaders',
    'news_articles',
    'live_streams',
    'head_to_head',
    'team_profiles',
    'player_profiles',
    'match_timelines',
    'tournament_seasons',
  ];
  for (const t of tables) {
    const r = await pool.query(`SELECT COUNT(*) FROM "${t}"`);
    console.log(`${t.padEnd(25)}: ${r.rows[0].count}`);
  }
  await pool.end();
}

main().catch(console.error);
