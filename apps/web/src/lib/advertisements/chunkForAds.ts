/** Splits a page of cards at 6 and 18 so a banner can sit between whole rows. */
export function chunkForAds<T>(items: T[]): T[][] {
  const cuts = [6, 18].filter((n) => n < items.length);
  const out: T[][] = [];
  let start = 0;
  for (const cut of cuts) {
    out.push(items.slice(start, cut));
    start = cut;
  }
  out.push(items.slice(start));
  return out;
}
