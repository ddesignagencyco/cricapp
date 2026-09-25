-- Tournament structure from Sportradar tournaments/{id}/info.json:
-- the `groups` array (each group carries the tournament's teams) is stored so
-- the API can re-serve the full tournament + teams shape without a live fetch.
ALTER TABLE tournaments ADD COLUMN groups JSONB;