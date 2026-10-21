import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveWinnerId, winnerFromResultText } from "../src/winner.js";

const sixers = { id: "sr:competitor:305408", name: "Sydney Sixers", abbreviation: "SYS" };
const scorchers = { id: "sr:competitor:305416", name: "Perth Scorchers", abbreviation: "PES" };

test("reads the winner from the result text when winner_id is missing", () => {
  const payload = {
    sport_event: { competitors: [sixers, scorchers] },
    sport_event_status: { status: "closed", match_result_text: "Sydney Sixers won by 15 runs" },
  };
  assert.equal(resolveWinnerId(payload), sixers.id);
});

test("prefers an explicit winner_id", () => {
  const payload = {
    sport_event: { competitors: [sixers, scorchers] },
    sport_event_status: { winner_id: scorchers.id, match_result_text: "Sydney Sixers won by 15 runs" },
  };
  assert.equal(resolveWinnerId(payload), scorchers.id);
});

test("the longest matching name wins (Pakistan Women is not Pakistan)", () => {
  const men = { id: "m", name: "Pakistan", abbreviation: "PAK" };
  const women = { id: "w", name: "Pakistan Women", abbreviation: "PAKW" };
  assert.equal(winnerFromResultText("Pakistan Women won by 5 wickets", [men, women]), "w");
  assert.equal(winnerFromResultText("Pakistan won by 5 wickets", [men, women]), "m");
});

test("the winner must be the subject of the sentence", () => {
  assert.equal(winnerFromResultText("Perth Scorchers lost; Sydney Sixers won by 1 run", [sixers, scorchers]), null);
  assert.equal(winnerFromResultText("SYS won by 3 wickets (DLS method)", [sixers, scorchers]), sixers.id);
});

test("ties, no results and abandonments have no winner", () => {
  for (const text of ["Match tied", "No result", "Match abandoned", "Match drawn", "", null]) {
    assert.equal(winnerFromResultText(text, [sixers, scorchers]), null, String(text));
  }
});

test("accents and spacing do not break the match", () => {
  const team = { id: "q", name: "Qila Saifullāh", abbreviation: "QS" };
  assert.equal(winnerFromResultText("Qila  Saifullah won by 2 runs", [team]), "q");
});
