// Lesson 8.1's widget: one block's change to η, from three safrole vectors. η′₀ is
// H(η₀ ⌢ Y(H_V)), stirred in the page; at a new epoch the other three move down one
// place, once, however many epochs were skipped. tools/widget-entropy-stairs.test.ts checks
// the stirring against the vectors' post-state and the lesson's Output.

import { H } from "./hash.ts";
import { ETA_VECTORS, type EtaVector } from "./safrole-eta.ts";

export { ETA_VECTORS };
export type { EtaVector };
/** E on tiny, where these vectors live. */
export const E = 12;
export const epochOf = (slot: number): number => Math.floor(slot / E);
export const isNewEpoch = (v: EtaVector): boolean => epochOf(v.slot) > epochOf(v.tau);
/** How many epoch boundaries the block jumps: the rule only asks whether it crossed one. */
export const epochsSkipped = (v: EtaVector): number => epochOf(v.slot) - epochOf(v.tau);

const bytes = (hex: string): number[] => (hex.slice(2).match(/../g) ?? []).map((h) => parseInt(h, 16));
const hex = (b: number[]): string => `0x${b.map((x) => x.toString(16).padStart(2, "0")).join("")}`;

/** η′ for a block, the lesson's rule: stir, then move the history along at a new epoch. */
export function nextEntropy(v: EtaVector): string[] {
  const stirred = hex(H([...bytes(v.before[0]), ...bytes(v.vrf)]));
  const history = isNewEpoch(v) ? v.before.slice(0, 3) : v.before.slice(1, 4);
  return [stirred, ...history];
}
/** A hash as the lesson's entropy run shortens it: 0x and 16 hex digits. */
export const short = (h: string): string => `${h.slice(0, 18)}…`;
/** What the widget says of each vector. */
export const SAYS: Record<string, string> = {
  "enact-epoch-change-with-no-tickets-4": "slot 10 → 15: a new epoch",
  "publish-tickets-no-mark-2": "slot 0 → 1: the same epoch",
  "skip-epochs-1": "slot 10 → 46: two whole epochs skipped",
};
