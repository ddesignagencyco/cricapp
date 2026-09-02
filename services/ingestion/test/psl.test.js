import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PSL_LEADER_CATEGORIES } from "../src/schemas.js";
import {
  normalizeStandings,
  normalizeSchedule,
  normalizeLeaders,
  normalizeSquad,
} from "../src/psl.js";

describe("normalizeStandings", () => {
  it("maps a Sportradar standings payload into canonical rows sorted by rank", () => {
    const raw = [
      {
        type: "league",
        groups: [
          {
            name: "Group A",
            team_standings: [
              {
                rank: 2,
                team: { id: "sr:competitor:243430", name: "Islamabad United", abbreviation: "ISL" },
                played: 10, win: 6, loss: 3, draw: 0, no_result: 0,
                points: 13, net_run_rate: 1.667,
                runs_for: 1200, runs_against: 1100, overs_for: 200, overs_against: 210, change: 0,
              },
              {
                rank: 1,
                team: { id: "sr:competitor:243432", name: "Peshawar Zalmi", abbreviation: "PZA" },
                played: 10, win: 8, loss: 1, draw: 0, no_result: 0,
                points: 17, net_run_rate: 2.324,
                runs_for: 1300, runs_against: 1000, overs_for: 200, overs_against: 210, change: 0,
              },
            ],
          },
        ],
      },
    ];

    const rows = normalizeStandings(raw);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].rank, 1);
    assert.equal(rows[0].teamAbbr, "PZA");
    assert.equal(rows[0].teamName, "Peshawar Zalmi");
    assert.equal(rows[0].points, 17);
    assert.equal(rows[1].teamId, "sr:competitor:243430");
    assert.equal(rows[1].points, 13);
    assert.equal(rows[0].netRunRate, 2.324);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(normalizeStandings([]), []);
  });
});

describe("normalizeSchedule", () => {
  it("maps sport_events into fixture rows with home/away", () => {
    const raw = [
      {
        id: "sr:match:69985216",
        status: "closed",
        scheduled: "2026-03-26T14:00:00+00:00",
        match_status: "Peshawar Zalmi win by 5 wickets",
        tournament: { name: "Pakistan Super League" },
        season: { id: "sr:season:140552" },
        venue: { name: "Gaddafi Stadium" },
        tournament_round: { name: "Group Stage" },
        competitors: [
          { id: "sr:competitor:243436", name: "Lahore Qalandars", abbreviation: "LQA", qualifier: "home" },
          { id: "sr:competitor:1335806", name: "Hyderabad Kingsmen", abbreviation: "HYD", qualifier: "away" },
        ],
      },
    ];

    const rows = normalizeSchedule(raw);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].matchId, "sr:match:69985216");
    assert.equal(rows[0].homeTeamAbbr, "LQA");
    assert.equal(rows[0].awayTeamAbbr, "HYD");
    assert.equal(rows[0].resultText, "Peshawar Zalmi win by 5 wickets");
    assert.equal(rows[0].round, "Group Stage");
    assert.equal(rows[0].seasonId, "sr:season:140552");
    assert.equal(rows[0].status, "closed");
  });

  it("leaves result null for upcoming matches", () => {
    const rows = normalizeSchedule([
      {
        id: "sr:match:x",
        status: "scheduled",
        scheduled: "2026-05-01T14:00:00+00:00",
        competitors: [
          { id: "a", name: "Home", abbreviation: "HOM", qualifier: "home" },
          { id: "b", name: "Away", abbreviation: "AWY", qualifier: "away" },
        ],
      },
    ]);
    assert.equal(rows[0].resultText, null);
    assert.equal(rows[0].scheduled, "2026-05-01T14:00:00+00:00");
  });
});

describe("normalizeLeaders", () => {
  it("maps batting.top_runs and bowling.top_wickets into categorized groups", () => {
    const raw = {
      batting: {
        top_runs: [
          { rank: 1, player: { id: "sr:player:1", name: "Khan, Yasir", full_name: "Yasir Khan" }, team: { abbreviation: "RAW", name: "Rawalpindi Pindiz" }, total: 83 },
          { rank: 2, player: { id: "sr:player:2", full_name: "Haseebullah Khan" }, team: { abbreviation: "LQA" }, total: 68 },
        ],
      },
      bowling: {
        top_wickets: [
          { rank: 1, player: { id: "sr:player:3", full_name: "Shaheen Afridi" }, team: { abbreviation: "LQA" }, total: 5 },
        ],
      },
      fielding: {
        top_catches: [],
      },
    };

    const groups = normalizeLeaders(raw);
    const runs = groups.find((g) => g.category === "batting");
    const wickets = groups.find((g) => g.category === PSL_LEADER_CATEGORIES.BOWLING);

    assert.equal(runs.entries[0].rank, 1);
    assert.equal(runs.entries[0].playerName, "Yasir Khan");
    assert.equal(runs.entries[0].value, 83);
    assert.equal(runs.entries[1].teamAbbr, "LQA");
    assert.equal(wickets.entries[0].value, 5);
  });

  it("returns empty entries when section is missing", () => {
    const groups = normalizeLeaders({});
    const batting = groups.find((g) => g.category === "batting");
    assert.equal(batting.entries.length, 0);
  });
});

describe("normalizeSquad", () => {
  it("maps a squads payload into team + players", () => {
    const raw = {
      team: { id: "sr:competitor:243430", name: "Islamabad United", abbreviation: "ISL" },
      manager: { name: "Dean Mervyn Jones" },
      players: [
        { id: "sr:player:1", full_name: "Imad Wasim", name: "Wasim, Imad", type: "all_rounder", date_of_birth: "1988-12-18", nationality: "Pakistan", jersey_number: 9 },
        { id: "sr:player:2", full_name: "Devon Conway", name: "Conway, Devon", type: "wicket_keeper", date_of_birth: "1991-07-08" },
      ],
    };

    const squad = normalizeSquad(raw);
    assert.equal(squad.teamAbbr, "ISL");
    assert.equal(squad.teamId, "sr:competitor:243430");
    assert.equal(squad.manager, "Dean Mervyn Jones");
    assert.equal(squad.players.length, 2);
    assert.equal(squad.players[0].role, "all_rounder");
    assert.equal(squad.players[0].jerseyNumber, 9);
    assert.equal(squad.players[1].dateOfBirth, "1991-07-08");
  });
});
