// Lesson 3.3's widget: the work_report vector as the receipt the lesson describes, how to
// find the package's data again, where and when it was refined, who let it in, the roots of
// what it imported, and what came out, with the same parts as the bytes hold them. Tiny's
// and full's reports differ in one part, erasure_shards. The bytes are encoded here by
// codec-map.ts from the vectors' values. tools/widget-work-report.test.ts checks the types
// against 3.3's codecs and the bytes against 3.3's decode trace and the vectors.

import { encodeMapped } from "./codec-map.ts";
import type { Json, Node, Type } from "./codec-map.ts";
import { bytesOf, compartmentIn, hexIn, nameOf, partsOf, resultSays, valueIn, wireOf } from "./parcel.ts";
import type { Compartment, Goal, Parcel } from "./parcel.ts";
import { DIGEST_JSON, SAYS as DIGEST_SAYS, WORK_DIGEST } from "./work-digest.ts";
import { PACKAGE_JSON, REFINE_CONTEXT, SAYS as PACKAGE_SAYS } from "./work-package.ts";

/** AvailabilitySpec, SegmentRootLookupItem and WorkReport, as lesson 3.3's codecs write them. */
export const AVAILABILITY_SPEC: Type = {
  record: [
    ["hash", "hash"],
    ["length", "u32"],
    ["erasure_root", "hash"],
    ["erasure_shards", "u16"],
    ["exports_root", "hash"],
    ["exports_count", "u16"],
  ],
};
export const SEGMENT_ROOT_LOOKUP_ITEM: Type = { record: [["work_package_hash", "hash"], ["segment_tree_root", "hash"]] };
export const WORK_REPORT: Type = {
  record: [
    ["package_spec", AVAILABILITY_SPEC],
    ["context", REFINE_CONTEXT],
    ["core_index", "natural"],
    ["authorizer_hash", "hash"],
    ["auth_gas_used", "natural"],
    ["auth_output", "blob"],
    ["segment_root_lookup", { seq: SEGMENT_ROOT_LOOKUP_ITEM }],
    ["results", { seq: WORK_DIGEST }],
  ],
};

/** codec/tiny/work_report.json, as it is: the package's context, and the two digests. */
const spec = (shards: number): Json => ({
  hash: "0x30466e0ae1b05dde5249872475f6beeac368fd014b5a3413ceb32d3872143284",
  length: 42,
  erasure_root: "0x7af11fdaa717c398e223211842b41392f18df4bbc4ea0f4cfb972f19c7a64949",
  erasure_shards: shards,
  exports_root: "0xe8e52949f6e4fb1d943248df48c3f2b538200fddfea22388e5e061be8ebf21a7",
  exports_count: 69,
});
const report = (shards: number): Json => ({
  package_spec: spec(shards),
  context: (PACKAGE_JSON as { context: Json }).context,
  core_index: 3,
  authorizer_hash: "0x022e5e165cc8bd586404257f5cd6f5a31177b5c951eb076c7c10174f90006eef",
  auth_gas_used: 0,
  auth_output: "0x0102030405",
  segment_root_lookup: [],
  results: DIGEST_JSON,
});
/** The two sizes' reports: full's differs only in erasure_shards, one per validator. */
export const SIZES = [
  { name: "tiny", validators: 6 },
  { name: "full", validators: 1023 },
];
export const REPORT_JSON: Json[] = SIZES.map((s) => report(s.validators));

/** The receipt's five compartments, and the report's top-level fields in each. */
export const COMPARTMENTS: Compartment[] = [
  { id: "data", name: "The package's data", says: "how to find it again: the bundle's hash and length, its shards' root and count, its exports' root and count", fields: ["package_spec"], tone: "purple" },
  { id: "where", name: "Where and when", says: "the chain the package was built on, and the core that refined it", fields: ["context", "core_index"], tone: "grey" },
  { id: "permit", name: "The permission", says: "the authorizer that let the package in, the gas it used, and what it said", fields: ["authorizer_hash", "auth_gas_used", "auth_output"], tone: "green", stapled: true },
  { id: "imports", name: "Imports' roots", says: "for each package it imported segments from, the root of those segments", fields: ["segment_root_lookup"], tone: "amber" },
  { id: "out", name: "What came out", says: "one digest per work item, as in lesson 3.2", fields: ["results"], tone: "brand" },
];
export const compartmentOf = compartmentIn(COMPARTMENTS);

/** What each part is for, by its name; a context's and a digest's parts as in 3.1 and 3.2. */
export const SAYS: Record<string, string> = {
  ...PACKAGE_SAYS,
  ...DIGEST_SAYS,
  package_spec: "The availability specification: how to find the package's data again, later.",
  hash: "The work-package's hash.",
  length: "The size of its bundle: the package plus everything needed to refine it again.",
  erasure_root: "The root of the bundle's erasure-coded shards.",
  erasure_shards: "How many shards the bundle is cut into: one per validator.",
  exports_root: "The root of the segments the package exported.",
  exports_count: "How many segments it exported.",
  context: "The chain as the package saw it when it was built: its refinement context, as in 3.1.",
  core_index: "The core that refined the package. A compact natural: one byte below 128.",
  authorizer_hash: "The authorizer that let the package in, by its hash.",
  auth_gas_used: "The gas the authorizer used. §11 lists it last; the bytes put it fifth.",
  auth_output: "What the authorizer said: its output, a blob.",
  segment_root_lookup: "For packages this one imported segments from: each one's hash and the root of its segments. None here.",
  results: "The digests, one per work item, in order.",
};

/** The goals, and the parts that reach each. */
export const GOALS: Goal[] = [
  { id: "shards", say: "find how many shards the bundle is cut into", reached: (p) => p === "package_spec.erasure_shards" },
  { id: "core", say: "find the core that did the work", reached: (p) => p === "core_index" },
  { id: "second", say: "find how the second job went", reached: (p) => p === "results[1].result" },
  { id: "fifth", say: "find the part §11 lists last, but the bytes put fifth", reached: (p) => p === "auth_gas_used" },
];

/** One size's receipt: encoded, mapped, and described. */
export function reportParcel(size: number): Parcel {
  const map = encodeMapped(WORK_REPORT, REPORT_JSON[size]);
  const partAt = partsOf(map.root);
  const digest = /^results\[(\d+)\]$/;
  const children = (path: string) => partAt(path).children.map((n) => n.path);
  return {
    name: "work_report",
    whole: `A core's receipt for one whole work-package, from the ${SIZES[size].name} test vector. Tap any part.`,
    bytes: map.bytes,
    compartments: COMPARTMENTS,
    partAt,
    compartmentOf,
    chipRows: (c, selected) => {
      if (c === "data") return [["package_spec"], children("package_spec")];
      if (c === "where") return [["context", "core_index"], children("context")];
      if (c === "out") {
        const open = children("results").find((d) => selected === d || selected.startsWith(`${d}.`));
        if (!open) return [["results"], children("results")];
        const load = selected.startsWith(`${open}.refine_load`) ? [children(`${open}.refine_load`)] : [];
        return [["results"], children("results"), children(open), ...load];
      }
      return [COMPARTMENTS.find((x) => x.id === c)!.fields];
    },
    labelOf: (path) => {
      const d = digest.exec(path);
      return d ? `digest ${d[1]} · service ${partAt(`${path}.service_id`).json}` : nameOf(path);
    },
    saysOf: (n: Node) => {
      const d = digest.exec(n.path);
      if (d) {
        const [outcome] = Object.keys(partAt(`${n.path}.result`).json as object);
        return `Digest ${d[1]}: service ${partAt(`${n.path}.service_id`).json}'s item, which ${outcome === "ok" ? "succeeded" : `stopped with a ${outcome}`}.`;
      }
      if (n.type === "result") return resultSays(Object.keys(n.json as object)[0]);
      if (n.path === "package_spec.erasure_shards") return `How many shards the bundle is cut into: one per validator, ${SIZES[size].validators} on ${SIZES[size].name}.`;
      return SAYS[nameOf(n.path)] ?? "";
    },
    valueOf: valueIn(map.bytes),
    bytesOf,
    hexOf: hexIn(map.bytes),
    wire: wireOf(map.root, compartmentOf),
    goals: GOALS,
  };
}
export const PARCELS: Parcel[] = SIZES.map((_, k) => reportParcel(k));
