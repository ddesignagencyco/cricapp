import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PREDICTION_MODELS, PREDICTION_STAGE } from "../src/schema.js";

describe("PREDICTION_STAGE", () => {
  it("uses append-only pre_match and live stages", () => {
    assert.equal(PREDICTION_STAGE.PRE_MATCH, "pre_match");
    assert.equal(PREDICTION_STAGE.LIVE, "live");
  });
});

describe("PREDICTION_MODELS", () => {
  it("versions the v1 statistical models", () => {
    assert.equal(PREDICTION_MODELS.PREMATCH, "prematch-logit-v1");
    assert.equal(PREDICTION_MODELS.LIVE, "live-resource-v1");
  });
});
