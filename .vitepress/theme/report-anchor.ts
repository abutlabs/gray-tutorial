// Lesson 12.5's widget: a report against the chain. Its context must name one of the eight
// recent blocks (lesson 9.2's, before block 50 of the preimages trace) and match its state
// root, belt root and slot; its package must be new to this block, the recent blocks'
// reported packages and the pipeline; and its results' gas is capped together. The checks
// come in reportError's order. tools/widget-report-anchor.test.ts checks the order, the
// names and the answers against the lesson's code, run and check questions.

import { STEPS } from "./recent-beta.ts";

/** β_H†: the recent blocks, as lesson 9.2's run lists them. */
export const RECENT = STEPS[0].before.history;
/** G_A: the most accumulation gas a report's results may ask for, together. */
export const REPORT_GAS = 10_000_000;

export type Report = {
  anchor: number | null; // the slot of the recent block it names, or null: a block nobody remembers
  rootMatches: boolean;
  beltMatches: boolean;
  slotMatches: boolean;
  package: "new" | "reported" | "pipeline";
  gas: [number, number]; // its two results' accumulation gas
};
export const START: Report = { anchor: 49, rootMatches: true, beltMatches: true, slotMatches: true, package: "new", gas: [6_000_000, 2_000_000] };

/** The rules this widget turns on, in reportError's order, under the vectors' names. */
export const RULES: { error: string; says: string; vector: string }[] = [
  { error: "work_report_gas_too_high", says: "its results ask for at most G_A = 10,000,000 gas, together", vector: "high_work_report_gas-1" },
  { error: "duplicate_package", says: "a new package: not reported recently, not in the pipeline", vector: "duplicate_package_in_recent_history-1" },
  { error: "anchor_not_recent", says: "its anchor is one of the recent blocks", vector: "anchor_not_recent-1" },
  { error: "bad_state_root", says: "the same state root as that block", vector: "bad_state_root-1" },
  { error: "bad_beefy_mmr_root", says: "the same belt root as that block", vector: "bad_beefy_mmr-1" },
  { error: "bad_anchor_slot", says: "the same slot as that block", vector: "bad_anchor_slot-1" },
];
export function reportError(r: Report): (typeof RULES)[number] | null {
  const rule = (error: string) => RULES.find((x) => x.error === error)!;
  if (r.gas[0] + r.gas[1] > REPORT_GAS) return rule("work_report_gas_too_high");
  if (r.package !== "new") return rule("duplicate_package");
  if (r.anchor === null || !RECENT.some((b) => b.slot === r.anchor)) return rule("anchor_not_recent");
  if (!r.rootMatches) return rule("bad_state_root");
  if (!r.beltMatches) return rule("bad_beefy_mmr_root");
  if (!r.slotMatches) return rule("bad_anchor_slot");
  return null;
}
