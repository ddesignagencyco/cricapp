export function sigmoid(z) {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

export const PREMATCH_WEIGHTS = Object.freeze({
  form: 1.4,
  h2h: 0.8,
  table: 0.9,
  venue: 0.25,
  toss: 0.15,
});

export function prematchConfidence(snapshot) {
  const n = Math.min(snapshot.form?.homeN ?? 0, snapshot.form?.awayN ?? 0);
  if (n < 3) return 0.35;
  const h2hBoost = (snapshot.h2h?.meetings ?? 0) >= 3 ? 0.1 : 0;
  const sample = 0.5 + 0.4 * (1 - Math.exp(-n / 8)) + h2hBoost;
  return Math.min(0.9, Number(sample.toFixed(4)));
}

export function scorePrematch(snapshot) {
  const formEdge = (snapshot.form?.home ?? 0.5) - (snapshot.form?.away ?? 0.5);
  const h2hEdge = snapshot.h2h?.edge ?? 0;
  const tableEdge = snapshot.table?.used ? (snapshot.table.edge ?? 0) : 0;
  const venue = snapshot.venueEdge ?? 0;
  const toss = snapshot.toss?.edge ?? 0;

  const z =
    PREMATCH_WEIGHTS.form * formEdge +
    PREMATCH_WEIGHTS.h2h * h2hEdge +
    PREMATCH_WEIGHTS.table * tableEdge +
    PREMATCH_WEIGHTS.venue * venue +
    PREMATCH_WEIGHTS.toss * toss;

  const homeWinProb = Number(sigmoid(z).toFixed(4));
  const awayWinProb = Number((1 - homeWinProb).toFixed(4));
  const confidence = prematchConfidence(snapshot);

  return {
    homeWinProb,
    awayWinProb,
    confidence,
    explanation: {
      z: Number(z.toFixed(4)),
      formEdge: Number(formEdge.toFixed(4)),
      h2hEdge: Number(h2hEdge.toFixed(4)),
      tableEdge: Number(tableEdge.toFixed(4)),
      venueEdge: venue,
      tossEdge: toss,
      weights: PREMATCH_WEIGHTS,
      tossAdjusted: toss !== 0,
    },
  };
}
