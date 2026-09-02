import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MATCH_STATUS, PROVIDERS } from "../src/schemas.js";
import { computeRunRate, normalizeMatch, normalizeLineups } from "../src/normalize.js";

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

  it("maps a real Sportradar summary payload (England vs Ireland ODI)", () => {
    const match = normalizeMatch(PROVIDERS.SPORTRADAR, {
      sport_event: {
        id: "sr:match:66650320",
        scheduled: "2026-09-01T12:00:00+00:00",
        tournament: { name: "ODI Series England vs Ireland, Women" },
        venue: { name: "Grace Road", capacity: 12000 },
        competitors: [
          { id: "sr:competitor:247863", name: "England", abbreviation: "ENG", qualifier: "home" },
          { id: "sr:competitor:247867", name: "Ireland", abbreviation: "IRL", qualifier: "away" },
        ],
      },
      sport_event_status: {
        status: "live",
        match_status: "first_innings_away_team",
        display_score: "126/1",
        current_inning: 1,
        display_overs: 24,
        run_rate: 5.11,
        period_scores: [
          { home_score: 0, away_score: 126, type: "inning", number: 1, away_wickets: 1, display_score: "126/1" },
        ],
      },
      statistics: {
        innings: [
          {
            number: 1,
            batting_team: "sr:competitor:247867",
            bowling_team: "sr:competitor:247863",
            overs_completed: 24,
            teams: [
              {
                id: "sr:competitor:247867",
                statistics: { batting: { runs: 126, wickets_lost: 1, run_rate: 5.11 } },
              },
            ],
          },
        ],
      },
    });

    assert.equal(match.matchId, "sr:match:66650320");
    assert.equal(match.status, MATCH_STATUS.LIVE);
    assert.deepEqual(match.teams, ["ENG", "IRL"]);
    assert.deepEqual(match.teamNames, ["England", "Ireland"]);
    assert.equal(match.tournament, "ODI Series England vs Ireland, Women");
    assert.equal(match.venue, "Grace Road");
    assert.equal(match.currentInnings.battingTeam, "IRL");
    assert.equal(match.currentInnings.runs, 126);
    assert.equal(match.currentInnings.wickets, 1);
    assert.equal(match.currentInnings.overs, 24);
    assert.equal(match.currentInnings.runRate, 5.11);
    assert.equal(match.displayScore, "126/1");
    assert.equal(match.matchStatus, "first_innings_away_team");
  });
});

describe("normalizeLineups", () => {
  it("maps a Sportradar lineups payload into teams + players", () => {
    const raw = {
      sport_event: {
        competitors: [
          { id: "sr:competitor:247863", name: "England", abbreviation: "ENG", country: "England", qualifier: "home" },
          { id: "sr:competitor:247867", name: "Ireland", abbreviation: "IRL", country: "Ireland", qualifier: "away" },
        ],
      },
      lineups: [
        {
          team: "home",
          manager: { id: "sr:player:624184", name: "Lane, Mark", country_code: "ENG" },
          starting_lineup: [
            { id: "sr:player:1246946", name: "Dunkley, Sophia", date_of_birth: "1998-07-16", country_code: "ENG", nationality: "England", type: "batsman", order: 1 },
            { id: "sr:player:2059401", name: "Capsey, Alice", date_of_birth: "2004-08-11", country_code: "ENG", nationality: "England", type: "all_rounder", is_wicketkeeper: true, order: 4 },
            { id: "sr:player:2783135", name: "Coleman, Tilly", date_of_birth: "2007-08-23", nationality: "England", order: 11 },
          ],
        },
        { team: "away", starting_lineup: [] },
      ],
    };

    const { teams, players } = normalizeLineups(raw);

    assert.equal(teams.length, 2);
    assert.equal(teams[0].id, "sr:competitor:247863");
    assert.equal(teams[0].abbr, "ENG");

    const englandPlayers = players.filter((p) => p.teamId === "sr:competitor:247863");
    assert.equal(englandPlayers.length, 4); // manager + 3 players
    const dunkley = englandPlayers.find((p) => p.id === "sr:player:1246946");
    assert.equal(dunkley.fullName, "Sophia Dunkley");
    assert.equal(dunkley.role, "batsman");
    assert.equal(dunkley.birth, "1998-07-16");
    const capsey = englandPlayers.find((p) => p.id === "sr:player:2059401");
    assert.equal(capsey.role, "all_rounder");
    const coleman = englandPlayers.find((p) => p.id === "sr:player:2783135");
    assert.equal(coleman.role, "player");
  });
});
