import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EVENT_TYPES, MATCH_STATUS } from "@cricapp/shared-types";
import { diffMatch, hasMatchChanged, isLiveSnapshotBehind } from "../src/diff.js";

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

  it("does not emit a thin event when only overs change", () => {
    const next = {
      ...base,
      currentInnings: { ...base.currentInnings, overs: 12.1 },
    };
    assert.deepEqual(diffMatch(base, next), []);
  });

  it("detects overs-only snapshot changes for socket publish", () => {
    const next = {
      ...base,
      currentInnings: { ...base.currentInnings, overs: 12.1 },
    };
    assert.equal(hasMatchChanged(base, next), true);
    assert.equal(hasMatchChanged(base, { ...base, currentInnings: { ...base.currentInnings } }), false);
  });
});

describe("isLiveSnapshotBehind", () => {
  it("rejects a stale live poll with fewer overs in the same innings (112/3 -> 80/2)", () => {
    const prev = {
      ...base,
      currentInning: 1,
      displayOvers: 14.2,
      displayScore: "India 112/3",
      currentInnings: { ...base.currentInnings, runs: 112, wickets: 3, overs: 14.2 },
    };
    const stale = {
      ...base,
      currentInning: 1,
      displayOvers: 10.1,
      displayScore: "India 80/2",
      currentInnings: { ...base.currentInnings, runs: 80, wickets: 2, overs: 10.1 },
    };
    assert.equal(isLiveSnapshotBehind(prev, stale), true);
  });

  it("rejects a stale live poll with fewer runs at the same over", () => {
    const prev = {
      ...base,
      currentInning: 1,
      displayOvers: 14.2,
      displayScore: "India 112/3",
      currentInnings: { ...base.currentInnings, runs: 112, wickets: 3, overs: 14.2 },
    };
    const stale = {
      ...base,
      currentInning: 1,
      displayOvers: 14.2,
      displayScore: "India 108/3",
      currentInnings: { ...base.currentInnings, runs: 108, wickets: 3, overs: 14.2 },
    };
    assert.equal(isLiveSnapshotBehind(prev, stale), true);
  });

  it("allows advancing to a new innings even though overs reset", () => {
    const prev = {
      ...base,
      currentInning: 1,
      displayOvers: 20.0,
      displayScore: "India 185/6",
      currentInnings: { ...base.currentInnings, runs: 185, wickets: 6, overs: 20.0 },
    };
    const next = {
      ...base,
      currentInning: 2,
      displayOvers: 1.2,
      displayScore: "Australia 12/0",
      currentInnings: { battingTeam: "Australia", runs: 12, wickets: 0, overs: 1.2, runRate: 9.0 },
    };
    assert.equal(isLiveSnapshotBehind(prev, next), false);
  });

  it("rejects an older innings snapshot even if its overs number is larger", () => {
    const prev = {
      ...base,
      currentInning: 2,
      displayOvers: 12.3,
      displayScore: "Australia 112/2",
      currentInnings: { battingTeam: "Australia", runs: 112, wickets: 2, overs: 12.3, runRate: 8.96 },
    };
    const stale = {
      ...base,
      currentInning: 1,
      displayOvers: 20.0,
      displayScore: "India 185/6",
      currentInnings: { battingTeam: "India", runs: 185, wickets: 6, overs: 20.0, runRate: 9.25 },
    };
    assert.equal(isLiveSnapshotBehind(prev, stale), true);
  });

  it("always allows live -> completed and rejects completed -> live", () => {
    const live = { ...base, currentInning: 2, displayOvers: 19.4 };
    const completed = { ...base, status: MATCH_STATUS.COMPLETED, currentInning: 2, displayOvers: 19.4 };
    assert.equal(isLiveSnapshotBehind(live, completed), false);
    assert.equal(isLiveSnapshotBehind(completed, live), true);
  });
});
