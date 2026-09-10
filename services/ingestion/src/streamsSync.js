/**
 * Optional live-stream metadata sync from a configured JSON source list.
 *
 * Set STREAM_SOURCES to a JSON array, e.g.:
 * [{"title":"PSL Final","matchId":"sr:match:1","streamUrl":"https://youtube.com/embed/x","provider":"YouTube","status":"upcoming","scheduledAt":"2026-09-15T14:00:00Z"}]
 */
import { query } from './db.js';
import { createLogger } from './logger.js';

const log = createLogger('streams');
const STREAM_SOURCES_JSON = process.env.STREAM_SOURCES || '[]';
const STREAM_SYNC_INTERVAL_MS = Number(process.env.STREAM_SYNC_INTERVAL_MS || 3600000);

function parseSources() {
  try {
    const parsed = JSON.parse(STREAM_SOURCES_JSON);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    log.warn('invalid STREAM_SOURCES JSON — expected array');
    return [];
  }
}

async function upsertStream(entry) {
  if (!entry?.title || !entry?.streamUrl) return;

  const existing = await query(
    `SELECT id FROM live_streams WHERE stream_url = $1 LIMIT 1`,
    [entry.streamUrl],
  );

  if (existing.rows.length) {
    await query(
      `UPDATE live_streams SET
         title = $2,
         match_id = $3,
         provider = $4,
         thumbnail_url = $5,
         status = COALESCE($6, status),
         scheduled_at = COALESCE($7::timestamptz, scheduled_at),
         updated_at = NOW()
       WHERE id = $1`,
      [
        existing.rows[0].id,
        entry.title,
        entry.matchId ?? null,
        entry.provider ?? null,
        entry.thumbnailUrl ?? null,
        entry.status ?? null,
        entry.scheduledAt ?? null,
      ],
    );
    return;
  }

  await query(
    `INSERT INTO live_streams (title, match_id, stream_url, provider, thumbnail_url, status, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'upcoming'), $7::timestamptz)`,
    [
      entry.title,
      entry.matchId ?? null,
      entry.streamUrl,
      entry.provider ?? null,
      entry.thumbnailUrl ?? null,
      entry.status ?? 'upcoming',
      entry.scheduledAt ?? null,
    ],
  );
}

export async function syncStreamsOnce() {
  const sources = parseSources();
  if (!sources.length) {
    log.info('no STREAM_SOURCES configured — skipping stream sync');
    return 0;
  }

  let count = 0;
  for (const entry of sources) {
    try {
      await upsertStream(entry);
      count += 1;
    } catch (err) {
      log.error('stream upsert failed', { title: entry?.title, error: err.message });
    }
  }

  log.info('stream sync complete', { upserted: count });
  return count;
}

export function startStreamsSync() {
  const run = () => {
    syncStreamsOnce().catch((err) => log.error('stream sync failed', { error: err.message }));
  };
  run();
  if (STREAM_SYNC_INTERVAL_MS > 0) {
    setInterval(run, STREAM_SYNC_INTERVAL_MS);
  }
}
