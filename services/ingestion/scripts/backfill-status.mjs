import { query, shutdown as shutdownDb } from '../src/db.js';
import { countEventIdsWithoutTimeline } from '../src/store.js';

const counts = async (sql) => (await query(sql)).rows[0]?.c ?? 0;

const sportEventRecords = await counts('SELECT COUNT(*)::int AS c FROM sport_event_records');
const distinctEvents = await counts(
  'SELECT COUNT(DISTINCT event_id)::int AS c FROM sport_event_records WHERE event_id IS NOT NULL',
);
const timelines = await counts('SELECT COUNT(*)::int AS c FROM match_timelines');
const h2h = await counts('SELECT COUNT(*)::int AS c FROM head_to_head');
const matches = await counts('SELECT COUNT(*)::int AS c FROM matches');
const pslFixtures = await counts('SELECT COUNT(*)::int AS c FROM psl_fixtures');
const pendingTimelines = await countEventIdsWithoutTimeline();

console.log(
  JSON.stringify(
    {
      sport_event_records: sportEventRecords,
      distinct_match_ids_in_records: distinctEvents,
      match_timelines: timelines,
      timelines_still_queued: pendingTimelines,
      head_to_head_pairs: h2h,
      live_match_snapshots: matches,
      psl_fixtures: pslFixtures,
    },
    null,
    2,
  ),
);

await shutdownDb();
