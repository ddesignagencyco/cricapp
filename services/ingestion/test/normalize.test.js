import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MATCH_STATUS, PROVIDERS } from "../src/schemas.js";
import { computeRunRate, normalizeMatch } from "../src/normalize.js";

describe("computeRunRate", () => {
  it("converts cricket overs (15.3 = 93 balls) into runs per over", () => {
    assert.equal(computeRunRate(93, 15.3), 6);
  });

  it("returns 0 when overs is 0", () => {
    assert.equal(computeRunRate(10, 0), 0);
  });
});

describe("normalizeMatch", () => {
  it("throws for an unknown provider", () => {
    assert.throws(() => normalizeMatch("unknown", {}), /No normalizer defined/);
  });

  it("maps a mock payload onto CanonicalMatch", () => {
    const match = normalizeMatch(PROVIDERS.MOCK, {
      id: "mock-1",
      status: "In Progress",
      teams: ["IND", "AUS"],
      teamNames: ["India", "Australia"],
      tournament: "ODI",
      venue: "MCG",
      scheduled: "2026-09-01T10:00:00+00:00",
      score: [{ inning: "India 1st Innings", r: 120, w: 2, o: 15.3 }],
      lastEvent: { type: "runs", runs: 4, over: 15.3 },
    });

    assert.equal(match.matchId, "mock-1");
    assert.equal(match.status, MATCH_STATUS.LIVE);
    assert.deepEqual(match.teams, ["IND", "AUS"]);
    assert.equal(match.currentInnings.battingTeam, "India");
    assert.equal(match.currentInnings.runs, 120);
    assert.equal(match.currentInnings.wickets, 2);
    assert.equal(match.currentInnings.runRate, computeRunRate(120, 15.3));
    assert.equal(match.displayScore, "120/2");
    assert.equal(match.lastEvent.type, "runs");
  });

  it("maps a Sportradar statistics payload onto CanonicalMatch", () => {
    const match = normalizeMatch(PROVIDERS.SPORTRADAR, {
      sport_event: {
        id: "sr:match:1",
        scheduled: "2026-09-01T10:00:00+00:00",
        tournament: { name: "ODI" },
        venue: { name: "MCG" },
        competitors: [
          { id: "sr:team:a", name: "India", abbreviation: "IND", qualifier: "home" },
          { id: "sr:team:b", name: "Australia", abbreviation: "AUS", qualifier: "away" },
        ],
      },
      sport_event_status: {
        status: "live",
        match_status: "1st innings",
        current_inning: 1,
        display_score: "IND 120/2",
        display_overs: 15.3,
      },
      statistics: {
        innings: [
          {
            number: 1,
            batting_team: "sr:team:a",
            overs_completed: 15.3,
            teams: [
              {
                id: "sr:team:a",
                statistics: { batting: { runs: 120, wickets_lost: 2, run_rate: 7.74 } },
              },
            ],
          },
        ],
      },
    });

    assert.equal(match.matchId, "sr:match:1");
    assert.equal(match.status, MATCH_STATUS.LIVE);
    assert.deepEqual(match.teams, ["IND", "AUS"]);
    assert.deepEqual(match.teamNames, ["India", "Australia"]);
    assert.equal(match.tournament, "ODI");
    assert.equal(match.venue, "MCG");
    assert.equal(match.currentInnings.battingTeam, "IND");
    assert.equal(match.currentInnings.runs, 120);
    assert.equal(match.currentInnings.wickets, 2);
    assert.equal(match.displayScore, "IND 120/2");
    assert.equal(match.matchStatus, "1st innings");
  });

  it("falls back to period_scores when statistics innings are missing", () => {
    const match = normalizeMatch(PROVIDERS.SPORTRADAR, {
      sport_event: {
        id: "sr:match:2",
        competitors: [
          { id: "sr:team:a", name: "India", abbreviation: "IND", qualifier: "home" },
          { id: "sr:team:b", name: "Australia", abbreviation: "AUS", qualifier: "away" },
        ],
      },
      sport_event_status: {
        status: "inprogress",
        current_inning: 2,
        period_scores: [{ away_score: 45, away_wickets: 1, display_overs: 8.2 }],
        run_rate: 5.4,
      },
    });

    assert.equal(match.status, MATCH_STATUS.LIVE);
    assert.equal(match.currentInnings.battingTeam, "AUS");
    assert.equal(match.currentInnings.runs, 45);
    assert.equal(match.currentInnings.wickets, 1);
    assert.equal(match.currentInnings.runRate, 5.4);
  });

  it("maps Sportradar closed/result statuses to completed and empty payloads to upcoming", () => {
    assert.equal(
      normalizeMatch(PROVIDERS.SPORTRADAR, {
        sport_event_status: { status: "closed", match_status: "ended" },
      }).status,
      MATCH_STATUS.COMPLETED,
    );
    const empty = normalizeMatch(PROVIDERS.SPORTRADAR, {});
    assert.equal(empty.status, MATCH_STATUS.UPCOMING);
    assert.equal(empty.currentInnings, null);
    assert.deepEqual(empty.lastEvent, { type: "none", runs: 0, over: 0 });
  });
});
