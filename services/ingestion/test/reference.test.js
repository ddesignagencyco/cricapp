import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTours,
  normalizeTournaments,
  normalizeDailySchedule,
  normalizeDailyResults,
  normalizeTeamSchedule,
  normalizeTeamResults,
  normalizeTournamentResults,
  normalizeMatchTimeline,
  normalizeHeadToHead,
  normalizeTeamProfile,
  normalizePlayerProfile,
  normalizeTournamentSeasons,
} from "../src/reference.js";

describe("normalizeTours", () => {
  it("maps tours payload into minimal rows", () => {
    const rows = normalizeTours({
      tours: [
        {
          id: "sr:tour:1",
          name: "ICC World Tour",
          category: { id: "sr:category:1", name: "International" },
          sport: { id: "sr:sport:1", name: "Cricket" },
        },
      ],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "sr:tour:1");
    assert.deepEqual(rows[0].category, { id: "sr:category:1", name: "International" });
  });

  it("returns [] for empty payload", () => {
    assert.deepEqual(normalizeTours({}), []);
  });
});

describe("normalizeTournaments", () => {
  it("maps tournaments payload including current_season", () => {
    const rows = normalizeTournaments({
      tournaments: [
        {
          id: "sr:tournament:14931",
          name: "Pakistan Super League",
          type: "t20",
          gender: "men",
          category: { id: "sr:category:52", name: "Pakistan" },
          current_season: { id: "sr:season:140552", name: "PSL 2026", year: "2026" },
          tour_id: "sr:tour:1",
        },
      ],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tourId, "sr:tour:1");
    assert.equal(rows[0].currentSeason.id, "sr:season:140552");
  });
});

describe("normalizeDailySchedule", () => {
  it("maps sport_events into indexed rows with kind/scope", () => {
    const rows = normalizeDailySchedule("2026-09-05", {
      sport_events: [
        {
          id: "sr:match:1",
          scheduled: "2026-09-05T10:00:00Z",
          status: "live",
          competitors: [
            { id: "sr:competitor:1", name: "Pakistan", abbreviation: "PAK", qualifier: "home" },
            { id: "sr:competitor:2", name: "India", abbreviation: "IND", qualifier: "away" },
          ],
        },
      ],
    });
    assert.equal(rows[0].kind, "daily_schedule");
    assert.equal(rows[0].scopeKey, "2026-09-05");
    assert.equal(rows[0].eventId, "sr:match:1");
  });
});

describe("normalizeDailyResults", () => {
  it("maps { results: [{ sport_event, sport_event_status }] }", () => {
    const rows = normalizeDailyResults("2026-09-04", {
      results: [
        {
          sport_event: { id: "sr:match:9", scheduled: "2026-09-04T08:00:00Z" },
          sport_event_status: { status: "closed", display_score: "150/3 vs 149/8" },
        },
      ],
    });
    assert.equal(rows[0].kind, "daily_results");
    assert.equal(rows[0].scopeKey, "2026-09-04");
    assert.equal(rows[0].status, "closed");
  });
});

describe("normalizeTeamSchedule / normalizeTeamResults", () => {
  it("scope to the team id", () => {
    const sched = normalizeTeamSchedule("sr:competitor:1", {
      sport_events: [{ id: "sr:match:2" }],
    });
    assert.equal(sched[0].kind, "team_schedule");
    assert.equal(sched[0].scopeKey, "sr:competitor:1");

    const res = normalizeTeamResults("sr:competitor:1", {
      results: [{ sport_event: { id: "sr:match:3" } }],
    });
    assert.equal(res[0].kind, "team_results");
    assert.equal(res[0].scopeKey, "sr:competitor:1");
  });
});

describe("normalizeTournamentResults", () => {
  it("returns rows plus tournament metadata", () => {
    const { tournament, rows } = normalizeTournamentResults("sr:season:140552", {
      tournament: { id: "sr:tournament:14931" },
      results: [{ sport_event: { id: "sr:match:5" } }],
    });
    assert.equal(tournament.id, "sr:tournament:14931");
    assert.equal(rows[0].eventId, "sr:match:5");
    assert.equal(rows[0].kind, "tournament_results");
  });
});

describe("normalizeMatchTimeline", () => {
  it("stores the raw payload keyed by match id", () => {
    const out = normalizeMatchTimeline("sr:match:1", { timeline: [] });
    assert.equal(out.matchId, "sr:match:1");
    assert.deepEqual(out.payload, { timeline: [] });
  });
});

describe("normalizeHeadToHead", () => {
  it("sorts the team pair to form a deterministic key", () => {
    const out = normalizeHeadToHead("sr:competitor:2", "sr:competitor:1", {
      last_meetings: [],
    });
    assert.equal(out.teamAId, "sr:competitor:1");
    assert.equal(out.teamBId, "sr:competitor:2");
  });
});

describe("normalizeTeamProfile", () => {
  it("splits manager and team info", () => {
    const out = normalizeTeamProfile("sr:competitor:1", {
      manager: { id: "sr:player:99", name: "Gary Kirsten" },
      team: { id: "sr:competitor:1", name: "Pakistan", abbreviation: "PAK" },
    });
    assert.equal(out.teamId, "sr:competitor:1");
    assert.equal(out.manager.name, "Gary Kirsten");
    assert.equal(out.teamInfo.abbreviation, "PAK");
  });
});

describe("normalizePlayerProfile", () => {
  it("stores payload under player id", () => {
    const out = normalizePlayerProfile("sr:player:646278", {
      player: { full_name: "Babar Azam" },
    });
    assert.equal(out.playerId, "sr:player:646278");
    assert.equal(out.payload.player.full_name, "Babar Azam");
  });
});

describe("normalizeTournamentSeasons", () => {
  it("maps seasons into rows", () => {
    const rows = normalizeTournamentSeasons("sr:tournament:14931", {
      seasons: [
        {
          id: "sr:season:140552",
          name: "PSL 2026",
          year: "2026",
          start_date: "2026-01-01",
          end_date: "2026-03-01",
        },
      ],
    });
    assert.equal(rows[0].tournamentId, "sr:tournament:14931");
    assert.equal(rows[0].year, "2026");
  });
});