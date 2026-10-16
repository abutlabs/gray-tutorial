// Lesson 18.1's widget: the validators' tallies across an epoch's turn, in the Gray Paper's
// order, on stats_with_epoch_change-1: the assurances count first, into the tally in
// progress; then the new epoch turns the page (π_V becomes π_L, a fresh π_V begins); then
// the author's block, tickets and preimages, and one guarantee per reporter, into the fresh
// one. tools/widget-epoch-tallies.test.ts checks every number against the vector and run.

/** Columns: blocks, tickets, preimages, preimage bytes, guarantees, assurances. */
export const COLUMNS = ["b", "t", "p", "d", "g", "a"];
/** The vector's tallies before the block: π_V (this epoch) and π_L (the last). */
const BEFORE: { current: number[][]; last: number[][] } = {"current": [[18093, 11785, 27, 575, 1363, 1359], [15610, 17650, 39, 731, 1319, 1379], [13127, 8155, 34, 442, 1882, 1586], [15860, 14436, 121, 965, 1457, 1749], [13377, 20301, 6, 270, 1310, 1734], [10894, 10806, 1, 941, 1441, 1541]], "last": [[13627, 17087, 88, 504, 1448, 1808], [11144, 2376, 86, 926, 1070, 1870], [8661, 8241, 98, 826, 1250, 1842], [6178, 19322, 107, 271, 1851, 1599], [8911, 5027, 53, 465, 1061, 1225], [6428, 10892, 65, 365, 1241, 1901]]};
/** The block: slot 123,455 → 123,456 (E = 12: a new epoch), its author, and what it carries. */
export const BLOCK = { from: 123_455, to: 123_456, author: 1, tickets: 2, preimageSizes: [16, 17, 18], assurers: [0, 1], reporters: [0, 1, 2, 3] };
export const E = 12;
export const newEpoch = (from: number, to: number): boolean => Math.floor(to / E) !== Math.floor(from / E);

export type Tallies = { current: number[][]; last: number[][]; says: string; changed: [string, number, number][] };
/** The three steps, from the state before; with `turn` false, as if the epoch didn't change. */
export function steps(turn = true): Tallies[] {
  const copy = (t: number[][]) => t.map((r) => [...r]);
  let current = copy(BEFORE.current);
  let last = copy(BEFORE.last);
  const out: Tallies[] = [{ current: copy(current), last: copy(last), says: `Before the block: slot ${BLOCK.from.toLocaleString("en-US")}, the last of its epoch.`, changed: [] }];
  for (const v of BLOCK.assurers) current[v][5] += 1;
  out.push({ current: copy(current), last: copy(last), says: `1. Assurances count first, in the tally in progress: validators ${BLOCK.assurers.join(" and ")}, one each. They belong to the epoch the parent was in.`, changed: BLOCK.assurers.map((v) => ["current", v, 5]) });
  if (turn) {
    last = current;
    current = BEFORE.current.map(() => [0, 0, 0, 0, 0, 0]);
    out.push({ current: copy(current), last: copy(last), says: `2. Slot ${BLOCK.to.toLocaleString("en-US")} starts a new epoch (⌊τ′/12⌋ ≠ ⌊τ/12⌋): the tally in progress becomes the last epoch's, and a fresh one begins. The old last epoch's is forgotten.`, changed: [] });
  } else {
    out.push({ current: copy(current), last: copy(last), says: "2. No new epoch: nothing turns.", changed: [] });
  }
  const a = current[BLOCK.author];
  a[0] += 1; a[1] += BLOCK.tickets; a[2] += BLOCK.preimageSizes.length; a[3] += BLOCK.preimageSizes.reduce((n, x) => n + x, 0);
  for (const v of BLOCK.reporters) current[v][4] += 1;
  out.push({
    current: copy(current), last: copy(last),
    says: `3. Then the rest: the author, validator ${BLOCK.author}, gets its block, ${BLOCK.tickets} tickets, ${BLOCK.preimageSizes.length} preimages of ${BLOCK.preimageSizes.reduce((n, x) => n + x, 0)} bytes; every reporter, one guarantee.`,
    changed: [[ "current", BLOCK.author, 0 ], [ "current", BLOCK.author, 1 ], [ "current", BLOCK.author, 2 ], [ "current", BLOCK.author, 3 ], ...BLOCK.reporters.map((v) => ["current", v, 4] as [string, number, number])],
  });
  return out;
}
