// Lesson 9.2's widget: β_H as block 50, then 51, 52 and 53 of the preimages trace arrive.
// Each block fills in the newest remembered block's state root with its own
// parent_state_root, joins the list with a zero state root, and the oldest of nine drops
// off. The data is the trace's own β before each block (recent-beta.ts), so every step
// can be checked against what the chain really wrote. tools/widget-recent-blocks.test.ts
// checks it, and the lesson's Output and check question.

import { STEPS, type Beta, type Remembered } from "./recent-beta.ts";

export { STEPS };
export type { Beta, Remembered };
/** H: how many recent blocks the state remembers. */
export const RECENT_BLOCKS = 8;
export const ZERO_ROOT = "0x00000000…";

/** β_H after block `k` of the steps (0 is block 50), by the lesson's three steps, with the
 *  new entry's header hash and super-peak taken from what the chain wrote (the next step's β). */
export function recordBlock(k: number): { history: Remembered[]; filled: number; dropped: number | null } {
  const { before, block } = STEPS[k];
  const next = STEPS[k + 1]?.before.history.at(-1);
  const last = before.history.length - 1;
  const fixed = before.history.map((b, i) => (i === last ? { ...b, state_root: block.parent_state_root } : b));
  const entry: Remembered = {
    slot: block.slot,
    header_hash: next?.header_hash ?? "H(this header)",
    beefy_root: next?.beefy_root ?? "the belt's new super-peak",
    state_root: ZERO_ROOT,
    reported: block.reported,
  };
  const all = [...fixed, entry];
  const history = all.slice(-RECENT_BLOCKS);
  return { history, filled: before.history[last].slot, dropped: all.length > RECENT_BLOCKS ? all[0].slot : null };
}
/** A belt as the lesson's run draws it: a peak or a gap at each height. */
export const drawBelt = (belt: (string | null)[]): string => belt.map((p) => (p === null ? "·" : "●")).join(" ");
/** The belt's count, read backwards in binary, as lesson 9.1 taught: peaks at heights 0, 4 and 5 is 110001 = 49. */
export const beltCount = (belt: (string | null)[]): number => belt.reduce((n, p, i) => n + (p === null ? 0 : 2 ** i), 0);
