import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { REDIS_TTL, redisKeys } from "../src/redis.js";

describe("redisKeys", () => {
  it("builds match state and pub/sub keys from matchId", () => {
    assert.equal(redisKeys.matchState("sr:match:1"), "match:sr:match:1:state");
    assert.equal(redisKeys.matchChannel("sr:match:1"), "match:sr:match:1");
  });

  it("uses a single live-set key and per-tournament schedules", () => {
    assert.equal(redisKeys.liveMatches(), "matches:live");
    assert.equal(
      redisKeys.tournamentSchedule("sr:tournament:9"),
      "tournament:sr:tournament:9:schedule",
    );
  });
});

describe("REDIS_TTL", () => {
  it("keeps match snapshots longer than schedules", () => {
    assert.equal(REDIS_TTL.MATCH_STATE, 3600);
    assert.equal(REDIS_TTL.SCHEDULE, 300);
  });
});
