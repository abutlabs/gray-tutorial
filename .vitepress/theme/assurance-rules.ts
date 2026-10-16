// Lesson 11.3's widget: the five rules an assurance must keep, checked in the order
// assuranceError checks them, so the cheap rules name a block before the slow signature
// does. Tiny: |κ| = 6, two cores, one engaged. tools/widget-assurance-rules.test.ts checks
// the order and names against the lesson's code, run and check questions.

export const VALIDATORS = 6;
/** ρ†: core 0 has a report pending, core 1 nothing. */
export const ENGAGED: boolean[] = [true, false];
export type Assurance = { index: number; onParent: boolean; bits: boolean[]; signed: boolean };
export const RULES: { n: number; says: string; error: string; vector: string }[] = [
  { n: 1, says: "anchored on the parent, H_P", error: "bad_attestation_parent", vector: "assurance_with_bad_attestation_parent-1" },
  { n: 2, says: "from a real validator: its index below |κ|", error: "bad_validator_index", vector: "assurances_with_bad_validator_index-1" },
  { n: 3, says: "one per validator, indices strictly up", error: "not_sorted_or_unique_assurers", vector: "assurers_not_sorted_or_unique-1" },
  { n: 4, says: "a bit set only for a core with a report pending", error: "core_not_engaged", vector: "assurance_for_not_engaged_core-1" },
  { n: 5, says: "signed by that validator's Ed25519 key", error: "bad_signature", vector: "assurances_with_bad_signature-1" },
];

/** The first rule broken, as assuranceError finds it, or null: accepted. */
export function assuranceError(list: Assurance[], validators = VALIDATORS, engaged = ENGAGED): (typeof RULES)[number] | null {
  if (!list.every((a) => a.onParent)) return RULES[0];
  if (!list.every((a) => a.index < validators)) return RULES[1];
  if (!list.every((a, i) => i === 0 || list[i - 1].index < a.index)) return RULES[2];
  if (!list.every((a) => engaged.every((on, c) => on || !a.bits[c]))) return RULES[3];
  if (!list.every((a) => a.signed)) return RULES[4];
  return null;
}
/** A block's assurances to start from: validators 0, 1 and 2, each holding core 0's piece. */
export const START: Assurance[] = [0, 1, 2].map((index) => ({ index, onParent: true, bits: [true, false], signed: true }));
/** The check question: validators 2, 1 and 6, in that order. */
export const TWO_ONE_SIX: Assurance[] = [2, 1, 6].map((index) => ({ index, onParent: true, bits: [true, false], signed: true }));
