import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EVENT_TYPES, MATCH_STATUS } from "@cricapp/shared-types";
import { diffMatch } from "../src/diff.js";

const base = {
  matchId: "sr:match:1",
  status: MATCH_STATUS.LIVE,
  teams: ["a", "b"],
  teamNames: ["India", "Australia"],
  tournament: "ODI",
  venue: "MCG",
  scheduled: "2026-09-01T10:00:00+00:00",
  currentInnings: {
    battingTeam: "India",
    runs: 100,
    wickets: 1,
    overs: 12,
    runRate: 8.33,
  },
  lastEvent: { type: "none", runs: 0, over: 0 },
  displayScore: "India 100/1",
  matchStatus: "1st innings",
};

describe("diffMatch", () => {
  it("emits match_started when first seeing a live match", () => {
    const events = diffMatch(null, base);
    assert.deepEqual(events, [
      { type: EVENT_TYPES.MATCH_STARTED, matchId: "sr:match:1" },
    ]);
  });

  it("returns no events when nothing changed", () => {
    const events = diffMatch(base, { ...base, currentInnings: { ...base.currentInnings } });
    assert.deepEqual(events, []);
  });

  it("emits status_change and match_started on upcoming → live", () => {
    const previous = { ...base, status: MATCH_STATUS.UPCOMING, currentInnings: null };
    const events = diffMatch(previous, base);
    assert.ok(events.some((e) => e.type === EVENT_TYPES.MATCH_STARTED));
    assert.ok(events.some((e) => e.type === EVENT_TYPES.STATUS_CHANGE));
  });

  it("emits runs and milestone when the innings total crosses 150", () => {
    const next = {
      ...base,
      currentInnings: { ...base.currentInnings, runs: 152, overs: 18.2 },
      lastEvent: { type: "runs", runs: 4, over: 18.2 },
    };
    const events = diffMatch(base, next);
    assert.ok(events.some((e) => e.type === EVENT_TYPES.RUNS));
    assert.ok(events.some((e) => e.type === EVENT_TYPES.MILESTONE));
  });

  it("emits wicket when wickets increase", () => {
    const next = {
      ...base,
      currentInnings: { ...base.currentInnings, wickets: 2, runs: 100 },
      lastEvent: { type: "wicket", runs: 0, over: 12.1 },
    };
    const events = diffMatch(base, next);
    assert.deepEqual(
      events.map((e) => e.type),
      [EVENT_TYPES.WICKET],
    );
  });
});
