// Lesson 10.3's widget: ρ, the cores, before and after the verdicts. Each core holds a
// pending report; a verdict names a report by H(ℰ(report)); ρ† empties every core whose
// report is judged bad or wonky, and a good verdict leaves it be. The values are the run's
// vector, disputes/tiny/progress_invalidates_avail_assignments-1: its two pending reports,
// and its two verdicts, 0 of 5 votes valid (bad) and 5 of 5 (good).
// tools/widget-clear-cores.test.ts checks them against the lesson's code, run and vector.

import type { Json } from "./codec-map.ts";
import { encodeMapped } from "./codec-map.ts";
import { H } from "./hash.ts";
import { WORK_REPORT } from "./work-report.ts";

/** The vector's ρ: each core's pending report, and the slot it was registered in. */
export const REPORTS: Json[] = [
  {
    "package_spec": {
      "hash": "0x11da6d1f761ddf9bdb4c9d6e5303ebd41f61858d0a5647a1a7bfe089bf921be9",
      "length": 0,
      "erasure_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "erasure_shards": 0,
      "exports_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "exports_count": 0
    },
    "context": {
      "anchor": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "anchor_slot": 0,
      "state_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "beefy_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "lookup_anchor": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "lookup_anchor_slot": 0,
      "lookup_anchor_state_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "prerequisites": []
    },
    "core_index": 0,
    "authorizer_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "auth_gas_used": 0,
    "auth_output": "0x030201",
    "segment_root_lookup": [],
    "results": [
      {
        "service_id": 0,
        "code_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "payload_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "accumulate_gas": 42,
        "result": {
          "ok": "0x010203"
        },
        "refine_load": {
          "gas_used": 0,
          "imports": 0,
          "extrinsic_count": 0,
          "extrinsic_size": 0,
          "exports": 0
        }
      }
    ]
  },
  {
    "package_spec": {
      "hash": "0xe12c22d4f162d9a012c9319233da5d3e923cc5e1029b8f90e47249c9ab256b35",
      "length": 0,
      "erasure_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "erasure_shards": 0,
      "exports_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "exports_count": 0
    },
    "context": {
      "anchor": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "anchor_slot": 0,
      "state_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "beefy_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "lookup_anchor": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "lookup_anchor_slot": 0,
      "lookup_anchor_state_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "prerequisites": []
    },
    "core_index": 1,
    "authorizer_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "auth_gas_used": 0,
    "auth_output": "0x030201",
    "segment_root_lookup": [],
    "results": [
      {
        "service_id": 1,
        "code_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "payload_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "accumulate_gas": 42,
        "result": {
          "ok": "0x010203"
        },
        "refine_load": {
          "gas_used": 0,
          "imports": 0,
          "extrinsic_count": 0,
          "extrinsic_size": 0,
          "exports": 0
        }
      }
    ]
  }
];
export const REGISTERED = [42, 42];
export const JUDGES = 6; // tiny's validators, every one a judge

export type Outcome = "good" | "bad" | "wonky";
/** The votes that give each outcome on tiny: ⌊2·6/3⌋ + 1 = 5 valid is good, 0 is bad, ⌊6/3⌋ = 2 is wonky. */
export const VOTES: Record<Outcome, number> = { good: Math.floor((2 * JUDGES) / 3) + 1, bad: 0, wonky: Math.floor(JUDGES / 3) };

export const hexOf = (bytes: number[]): string => `0x${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
/** Each core: its report's hash H(ℰ(report)), the package it reports, and since when. */
export const CORES = REPORTS.map((report, core) => ({
  core,
  hash: hexOf(H(encodeMapped(WORK_REPORT, report).bytes)),
  pkg: ((report as { package_spec: { hash: string } }).package_spec.hash),
  since: REGISTERED[core],
}));
/** The vector's verdicts: its targets and how many of the 5 votes said valid. */
export const VERDICTS: { target: string; valid: number }[] = [{"target": "0xa78b526adc626d75485e3ef150f9c2a0c274854a7fc335c7f1ca5248bb9899c2", "valid": 5}, {"target": "0xf90768646e3be886546b933c21cf1ea053df008aba957e8b86719cf37b605169", "valid": 0}];
export const outcomeOf = (valid: number): Outcome => (valid === VOTES.good ? "good" : valid === 0 ? "bad" : "wonky");

/** ρ†: each core keeps its report unless a verdict on that report is bad or wonky. */
export function clearJudged(judged: { target: string; outcome: Outcome }[]): (number | null)[] {
  return CORES.map((c) => (judged.some((j) => j.target === c.hash && j.outcome !== "good") ? null : c.core));
}
