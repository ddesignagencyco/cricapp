/**
 * PSL 11 match highlights as ended streams, from the public YouTube playlist
 *   https://www.youtube.com/playlist?list=PLLMz9514wR_gjtMbMidEnLcbX0-PoK6P_  (16 videos).
 * The videos are embedded from YouTube, not copied; each plays in the streams page's Ended tab.
 * Idempotent (keyed by embed URL). Listed newest first, as in the playlist.
 *
 *   node --env-file-if-exists=.env scripts/seed-content/highlights.mjs
 */
import pg from 'pg';

export const HIGHLIGHTS = [
  [
    "J0uIKeS08sI",
    "Full Match Highlights | Quetta Gladiators vs Karachi Kings | Match 37 | HBL PSL 11"
  ],
  [
    "BBjiOFN8oFw",
    "80 Minutes of Pure HBL PSL Action | EVERY Boundary & Wicket | HBL PSL 11 Week 3 Recap"
  ],
  [
    "B1fVp1wQWkI",
    "Short Match Highlights | Hyderabad Kingsmen vs Islamabad United | M21 | HBL PSL 11"
  ],
  [
    "oQuTLNSd4UU",
    "Full Match Highlights | Hyderabad Kingsmen vs Islamabad United | M 21 | HBL PSL 11"
  ],
  [
    "oCsv-7mm5hY",
    "Short Highlights | Lahore Qalandar vs Islamabad United | Match 16 | HBL PSL 11"
  ],
  [
    "_TdooiXP7YE",
    "Full Highlights | Lahore Qalandar vs Islamabad United | Match 16 | HBL PSL 11"
  ],
  [
    "wBWu5UGzl2k",
    "Closer | Quetta Gladiators vs Multan Sultans | Match 13 | HBL PSL 11"
  ],
  [
    "8IY5x04xbBs",
    "Short Highlights | Quetta Gladiators vs Multan Sultans | Match 13 | HBL PSL 11"
  ],
  [
    "h54ognaefgg",
    "Post Match Ceremony | Quetta Gladiators vs Multan Sultans | Match 13 | HBL PSL 11"
  ],
  [
    "ZLNUhf2dkNU",
    "Full Highlights | Quetta Gladiators vs Multan Sultans | Match 13 | HBL PSL 11"
  ],
  [
    "m_RvXe3wWPQ",
    "Full Highlights | Lahore Qalandars vs Karachi Kings | Match 06 | HBL PSL 11"
  ],
  [
    "JBIOS8TJsBk",
    "Full Highlights | Quetta Gladiators vs Hyderabad Kingsmen | Match 5 | HBL PSL 11"
  ],
  [
    "rrdf5edijk4",
    "Full Highlights | Multan Sultans vs Islamabad United | HBL PSL 11"
  ],
  [
    "PwpwWWT1piM",
    "Full Highlights | Peshawar Zalmi vs Rawalpindiz | Match 3 | HBL PSL 11"
  ],
  [
    "Mzzxk7jtJBA",
    "Full Highlights | Quetta Gladiators vs Karachi Kings | Match 2 | HBL PSL 11"
  ],
  [
    "TX0gj5gp_8Y",
    "Full Highlights | Lahore Qalandars VS Hyderabad Kingsmen | Match 01 | HBL PSL 11"
  ]
];

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let added = 0, updated = 0;
// Oldest first so the newest highlight gets the latest created_at (the board lists newest first).
for (const [id, title] of [...HIGHLIGHTS].reverse()) {
  const url = `https://www.youtube.com/embed/${id}`;
  const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const ex = await db.query('SELECT id FROM live_streams WHERE stream_url = $1', [url]);
  if (ex.rowCount) {
    await db.query("UPDATE live_streams SET title = $2, thumbnail_url = $3, status = 'ended', updated_at = NOW() WHERE id = $1", [ex.rows[0].id, title, thumb]);
    updated += 1;
  } else {
    await db.query(
      "INSERT INTO live_streams (id, title, stream_url, provider, thumbnail_url, status, ended_at, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, 'YouTube', $3, 'ended', NOW(), clock_timestamp(), NOW())",
      [title, url, thumb],
    );
    added += 1;
  }
}
console.log(JSON.stringify({ highlights: HIGHLIGHTS.length, added, updated }));
await db.end();
