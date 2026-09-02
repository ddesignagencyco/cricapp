CREATE TABLE IF NOT EXISTS matches (
  match_id        TEXT PRIMARY KEY,
  status          TEXT NOT NULL,
  teams           JSONB NOT NULL,
  team_names      JSONB NOT NULL,
  tournament      TEXT,
  venue           TEXT,
  scheduled       TEXT,
  current_innings JSONB,
  last_event      JSONB,
  display_score   TEXT,
  match_status    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
