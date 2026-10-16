// Lesson 20.2's second widget: the lookup anchor's window. A report's lookup anchor must be
// at most L slots old (24 on tiny), and, when ancestry is on, one of the last L blocks by hash
// and slot. β remembers only 8 blocks, so the target keeps its own ancestry. The rule is the
// lesson's anchorError; tools/widget-anchor-window.test.ts checks it.

export const L = 24; // tiny's max_lookup_anchor_age
export const BETA = 8;
export function anchorError(slot: number, anchorSlot: number, known: boolean, ancestry: boolean): string | null {
  if (anchorSlot < slot - L) return "lookup_anchor_too_old";
  if (ancestry && !known) return "lookup_anchor_unknown";
  return null;
}
