const pg = require('pg');
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const t = await p.query("select id, name, abbr from teams where abbr ilike 'AFG' or name ilike '%Afghanistan%'");
  console.log('AFG teams:', JSON.stringify(t.rows));
  if (t.rows.length === 0) { await p.end(); return; }
  const id = t.rows[0].id;
  const tp = await p.query('select count(*) c from team_profiles where team_id=$1', [id]);
  console.log('team_profiles for AFG:', tp.rows[0].c);
  const ev = await p.query("select kind, count(*) c from sport_event_records where kind like 'team%' and scope_key=$1 group by kind", [id]);
  console.log('team events for AFG (kind=c):', JSON.stringify(ev.rows));
  const pl = await p.query('select count(*) c from players where team_id=$1', [id]);
  console.log('players for AFG:', pl.rows[0].c);
  const m = await p.query("select event_id, kind, scheduled from sport_event_records where payload->'sport_event'->'competitors' @> $1::jsonb or payload->'competitors' @> $1::jsonb order by scheduled desc limit 8", [JSON.stringify([{ id }])]);
  console.log('AFG matches in records:');
  for (const r of m.rows) console.log(' -', r.event_id, r.kind, r.scheduled);
  const totalTeams = await p.query('select count(*) c from teams');
  const profiled = await p.query('select count(*) c from team_profiles');
  console.log('teams total/profiled:', totalTeams.rows[0].c, profiled.rows[0].c);
  await p.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });