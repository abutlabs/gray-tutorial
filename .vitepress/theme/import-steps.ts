// Lesson 19.4's widget: Υ's steps in order, and the first refusal. The header's four checks
// come first (checkHeader's names), then each Part's step; the first that refuses refuses
// the block whole, and the state stays as it was. Each later step's refusal is a real name
// from its Part's vectors; the guarantees' is fuzzy block 37's, whose root stays 0xe9a2c0ff….
// tools/widget-import-steps.test.ts checks the names and the order against the lessons.

export const HEADER_CHECKS = [
  { field: "parent", says: "isn't the newest block β remembers", error: "bad_parent" },
  { field: "parent_state_root", says: "isn't the root of the state being imported into", error: "bad_parent_state_root" },
  { field: "slot", says: "isn't after the state's τ", error: "bad_slot" },
  { field: "extrinsic_hash", says: "isn't the hash of the block's extrinsic", error: "bad_extrinsic_hash" },
];
export const STEPS = [
  { name: "the header", part: "§5", error: "" },
  { name: "disputes", part: "Part 10", error: "bad_vote_split" },
  { name: "Safrole", part: "Part 8", error: "bad_seal" },
  { name: "assurances", part: "Part 11", error: "bad_attestation_parent" },
  { name: "guarantees", part: "Part 12", error: "bad_code_hash" },
  { name: "accumulation", part: "Part 17", error: "" },
  { name: "the rest: β′, α′, π′, δ′", part: "Parts 9, 13, 18, 14", error: "" },
];
export const ROOT_BEFORE = "0xe9a2c0ff…"; // fuzzy block 36's, kept through 37 to 39

/** Υ with one thing broken: a header field, or a later step made to refuse. */
export function importWith(broken: { header?: number; step?: number }): { reached: number; error: string | null } {
  if (broken.header !== undefined) return { reached: 0, error: HEADER_CHECKS[broken.header].error };
  if (broken.step !== undefined) return { reached: broken.step, error: STEPS[broken.step].error };
  return { reached: STEPS.length, error: null };
}
