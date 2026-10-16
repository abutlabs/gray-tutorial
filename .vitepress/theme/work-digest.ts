// Lesson 3.2's widget: the two tiny work_result vectors as the summary card the lesson
// describes, whose job, how it went, how hard the core worked, and what accumulating it may
// cost, with the same parts as the bytes hold them. Both are encoded here by codec-map.ts
// from the vectors' values, so the tag byte that says how it went is where the bytes put
// it. tools/widget-work-digest.test.ts checks the types against 3.2's codecs, the bytes
// against 3.2's decode trace and the vectors.

import { encodeMapped, ERRORS } from "./codec-map.ts";
import type { Json, Node, Type } from "./codec-map.ts";
import { bytesOf, compartmentIn, hexIn, nameOf, partsOf, valueIn, wireOf } from "./parcel.ts";
import type { Compartment, Goal, Parcel } from "./parcel.ts";

/** RefineLoad and WorkDigest, field by field, as lesson 3.2's codecs write them. */
export const REFINE_LOAD: Type = {
  record: [
    ["gas_used", "natural"],
    ["imports", "natural"],
    ["extrinsic_count", "natural"],
    ["extrinsic_size", "natural"],
    ["exports", "natural"],
  ],
};
export const WORK_DIGEST: Type = {
  record: [
    ["service_id", "u32"],
    ["code_hash", "hash"],
    ["payload_hash", "hash"],
    ["accumulate_gas", "u64"],
    ["result", "result"],
    ["refine_load", REFINE_LOAD],
  ],
};

/** codec/tiny/work_result_0.json and work_result_1.json, as they are. */
export const DIGEST_JSON: Json[] = [
  {
    service_id: 16909060,
    code_hash: "0x70a50829851e8f6a8c80f92806ae0e95eb7c06ad064e311cc39107b3219e532e",
    payload_hash: "0xfa99b97e72fcfaef616108de981a59dc3310e2a9f5e73cd44d702ecaaccd8696",
    accumulate_gas: 42,
    result: { ok: "0xaabbcc" },
    refine_load: { gas_used: 0, imports: 0, extrinsic_count: 0, extrinsic_size: 0, exports: 0 },
  },
  {
    service_id: 84281096,
    code_hash: "0xfcfc857dab216daf41f409c2012685846e4d34aedfeacaf84d9adfebda73fae6",
    payload_hash: "0xd55e07438aeeeb0d6509ab28af8a758d1fb70424db6b27c7e1ef6473e721c328",
    accumulate_gas: 33,
    result: { panic: null },
    refine_load: { gas_used: 0, imports: 0, extrinsic_count: 0, extrinsic_size: 0, exports: 0 },
  },
];
/** The vectors' names for the two. */
export const DIGEST_NAMES = ["work_result_0", "work_result_1"];

/** The card's four compartments, and the digest's top-level fields in each. */
export const COMPARTMENTS: Compartment[] = [
  { id: "job", name: "Whose job", says: "the service, and which code and input it ran, by their hashes", fields: ["service_id", "code_hash", "payload_hash"], tone: "grey" },
  { id: "went", name: "How it went", says: "the output, or which of six errors stopped it", fields: ["result"], tone: "amber" },
  { id: "load", name: "How hard the core worked", says: "five compact numbers: gas, segments in and out, extrinsics read", fields: ["refine_load"], tone: "brand" },
  { id: "next", name: "What comes next", says: "the gas accumulating this result may use, later and on the chain", fields: ["accumulate_gas"], tone: "green" },
];
export const compartmentOf = compartmentIn(COMPARTMENTS);

/** What each part is for, in plain words, by its name. */
export const SAYS: Record<string, string> = {
  service_id: "Whose job this was: a service, by its id.",
  code_hash: "Which of the service's code refine ran, by its hash.",
  payload_hash: "The input it ran on, by its hash: the item's payload.",
  accumulate_gas: "The most gas accumulating this result may use, on-chain.",
  result: "How refine went: tag 0 and the output as a blob, or just an error's tag, 1 to 6.",
  refine_load: "How hard the core worked, as five compact naturals in a row.",
  gas_used: "The gas refine used.",
  imports: "How many segments it imported.",
  extrinsic_count: "How many extrinsics it read.",
  extrinsic_size: "Their total size, in bytes.",
  exports: "How many segments it exported.",
};

/** How refine went, for a result whose JSON key is `outcome`: "ok", or an error's name. */
export const resultSays = (outcome: string): string =>
  outcome === "ok"
    ? "How refine went: tag 0, success, then the output as a blob, its length first."
    : `How refine went: the tag ${ERRORS.indexOf(outcome) + 1}, a ${outcome}, and nothing more.`;

/** The goals, and the parts that reach each. */
export const GOALS: Goal[] = [
  { id: "tag", say: "find the byte that says how it went", reached: (p) => p === "result" },
  { id: "gas", say: "find the gas the core actually used", reached: (p) => p === "refine_load.gas_used" },
  { id: "later", say: "find the gas it may use later, on the chain", reached: (p) => p === "accumulate_gas" },
];

/** One vector's card: encoded, mapped, and described. */
export function digestParcel(which: number): Parcel {
  const map = encodeMapped(WORK_DIGEST, DIGEST_JSON[which]);
  const partAt = partsOf(map.root);
  const result = DIGEST_JSON[which] as { result: { [k: string]: Json } };
  const [outcome] = Object.keys(result.result);
  return {
    name: DIGEST_NAMES[which],
    whole: outcome === "ok" ? "A core's card for a job that succeeded, from the tiny vectors. Tap any part." : `A core's card for a job that stopped with a ${outcome}, from the tiny vectors. Tap any part.`,
    bytes: map.bytes,
    compartments: COMPARTMENTS,
    partAt,
    compartmentOf,
    chipRows: (c) => (c === "load" ? [["refine_load"], partAt("refine_load").children.map((n) => n.path)] : [COMPARTMENTS.find((x) => x.id === c)!.fields]),
    labelOf: nameOf,
    saysOf: (n: Node) => (n.path === "result" ? resultSays(outcome) : SAYS[nameOf(n.path)] ?? ""),
    valueOf: valueIn(map.bytes),
    bytesOf,
    hexOf: hexIn(map.bytes),
    wire: wireOf(map.root, compartmentOf),
    goals: GOALS,
  };
}
export const PARCELS: Parcel[] = [digestParcel(0), digestParcel(1)];
