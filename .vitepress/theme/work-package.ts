// Lesson 3.1's widget: the tiny work_package vector as the parcel the lesson describes, a
// permission slip on the front, a postmark saying how the chain looked, and the jobs
// inside, and the same parts as the bytes hold them, in Appendix C's order. The bytes are
// made here by codec-map.ts's encoder from the vector's values, so where each part went
// can't be faked. tools/widget-work-package.test.ts checks the types against lessons 2.6
// and 3.1's codecs, and every byte range against 3.1's decode trace.

import { encodeMapped, flatten, short, spaced } from "./codec-map.ts";
import type { Json, Node, Type } from "./codec-map.ts";
import { WORK_ITEM } from "./vector-map.ts";

/** RefineContext and WorkPackage, field by field, as lessons 2.6 and 3.1's codecs write them. */
export const REFINE_CONTEXT: Type = {
  record: [
    ["anchor", "hash"],
    ["anchor_slot", "u32"],
    ["state_root", "hash"],
    ["beefy_root", "hash"],
    ["lookup_anchor", "hash"],
    ["lookup_anchor_slot", "u32"],
    ["lookup_anchor_state_root", "hash"],
    ["prerequisites", { seq: "hash" }],
  ],
};
export const WORK_PACKAGE: Type = {
  record: [
    ["auth_code_host", "u32"],
    ["auth_code_hash", "hash"],
    ["context", REFINE_CONTEXT],
    ["authorization", "blob"],
    ["authorizer_config", "blob"],
    ["items", { seq: WORK_ITEM }],
  ],
};

/** codec/tiny/work_package.json, as it is. */
export const PACKAGE_JSON: Json = {
  auth_code_host: 305419896,
  auth_code_hash: "0x022e5e165cc8bd586404257f5cd6f5a31177b5c951eb076c7c10174f90006eef",
  context: {
    anchor: "0xc0564c5e0de0942589df4343ad1956da66797240e2a2f2d6f8116b5047768986",
    anchor_slot: 11,
    state_root: "0xf6967658df626fa39cbfb6014b50196d23bc2cfbfa71a7591ca7715472dd2b48",
    beefy_root: "0x9329de635d4bbb8c47cdccbbc1285e48bf9dbad365af44b205343e99dea298f3",
    lookup_anchor: "0x60751ab5b251361fbfd3ad5b0e84f051ccece6b00830aed31a5354e00b20b9ed",
    lookup_anchor_slot: 33,
    lookup_anchor_state_root: "0x8f665c40573f1288749767417430f62360e37865ef773c24186527aa24b5a493",
    prerequisites: []
  },
  authorization: "0x0102030405",
  authorizer_config: "0x00010203040506070809",
  items: [
    {
      service: 16909060,
      code_hash: "0x70a50829851e8f6a8c80f92806ae0e95eb7c06ad064e311cc39107b3219e532e",
      refine_gas_limit: 42,
      accumulate_gas_limit: 42,
      export_count: 4,
      payload: "0x0102030405",
      import_segments: [
        {
          tree_root: "0x461236a7eb29dcffc1dd282ce1de0e0ed691fc80e91e02276fe8f778f088a1b8",
          index: 0
        },
        {
          tree_root: "0xe7cb536522c1c1b41fff8021055b774e929530941ea12c10f1213c56455f29ad",
          index: 1
        },
        {
          tree_root: "0xb0a487a4adf6a0eda5d69ddd2f8b241cf44204f0ff793e993e5e553b7862a1dc",
          index: 2
        }
      ],
      extrinsic: [
        {
          hash: "0x381a0e351c5593018bbc87dd6694695caa1c0c1ddb24e70995da878d89495bf1",
          len: 16
        },
        {
          hash: "0x6c437d85cd8327f42a35d427ede1b5871347d3aae7442f2df1ff80f834acf17a",
          len: 17
        }
      ]
    },
    {
      service: 84281096,
      code_hash: "0xfcfc857dab216daf41f409c2012685846e4d34aedfeacaf84d9adfebda73fae6",
      refine_gas_limit: 77,
      accumulate_gas_limit: 77,
      export_count: 7,
      payload: "0x030201",
      import_segments: [
        {
          tree_root: "0x3e5d0bea78537414bd1cfdaeb0f22d743bcaba5dbffacbabce8457f4cd78f69b",
          index: 0
        },
        {
          tree_root: "0xb7f8dffa65971832ec9e19719debc04b1ccd9ad27187a4943807ca756962481b",
          index: 1
        }
      ],
      extrinsic: [
        {
          hash: "0x80b628780612e8928705018d1ced53b2f76607ad026a86e4f36c99ac0491f8eb",
          len: 32
        },
        {
          hash: "0x47f142b4488bbd34e59afc60a0daedc6020e8be52a3cedecbd75e93ee9908adf",
          len: 33
        },
        {
          hash: "0xcc2f47030ff8a9fe8d02e8eb87e86d4db05b57258d30f9d81acb3b280d04e877",
          len: 34
        }
      ]
    }
  ]
};

/** The package encoded, and where each of its parts went. */
export const PACKAGE = encodeMapped(WORK_PACKAGE, PACKAGE_JSON);
const NODES = new Map(flatten(PACKAGE.root).map((n) => [n.path, n]));
/** A part of the package by its path: "context.anchor", "items[1].payload". */
export const partAt = (path: string): Node => {
  const n = NODES.get(path);
  if (!n) throw new Error(`no part ${path}`);
  return n;
};

/** The parcel's three compartments, and the package's top-level fields in each. */
export type Compartment = "slip" | "postmark" | "jobs";
export const COMPARTMENTS: { id: Compartment; name: string; says: string; fields: string[] }[] = [
  {
    id: "slip",
    name: "The permission slip",
    says: "stapled to the front: which program decides whether the package may use a core, and what to show it",
    fields: ["auth_code_host", "auth_code_hash", "authorization", "authorizer_config"],
  },
  {
    id: "postmark",
    name: "The postmark",
    says: "the chain as the builder saw it, when the package was made",
    fields: ["context"],
  },
  {
    id: "jobs",
    name: "The jobs",
    says: "the work itself: 1 to 16 items, each one service's code run on one input",
    fields: ["items"],
  },
];
/** The compartment a part is in, by its top-level field. */
export const compartmentOf = (path: string): (typeof COMPARTMENTS)[number] =>
  COMPARTMENTS.find((c) => c.fields.includes(path.split(/[.[]/)[0]))!;

/** What each part is for, in plain words, by its name (the last step of its path). */
export const SAYS: Record<string, string> = {
  auth_code_host: "The service whose storage holds the authorizer's code.",
  auth_code_hash: "Which code in that service is the authorizer, by its hash.",
  authorization: "The token the authorizer checks before it lets the package in.",
  authorizer_config: "The authorizer's settings, handed to it with the token.",
  context: "The chain as the builder saw it: a recent block to build on, and what must come first.",
  anchor: "A recent block the package is built on, by its header hash.",
  anchor_slot: "The anchor block's timeslot.",
  state_root: "The state root after the anchor block.",
  beefy_root: "The anchor block's accumulation-output super-peak.",
  lookup_anchor: "The block whose state refine reads preimages from.",
  lookup_anchor_slot: "The lookup anchor's timeslot.",
  lookup_anchor_state_root: "The state root after the lookup anchor.",
  prerequisites: "Work-packages that must be accumulated first, by hash. None here.",
  items: "The jobs, each one work-item, in order.",
  service: "Whose job this is: a service, by its id.",
  code_hash: "Which of the service's code refine runs, by its hash.",
  refine_gas_limit: "The most gas refining this item may use, in-core.",
  accumulate_gas_limit: "The most gas accumulating its result may use, on-chain.",
  export_count: "How many segments the job will export, for later packages to import.",
  payload: "The input: what the job's code runs on.",
  import_segments: "Segments earlier packages exported, that this job reads.",
  extrinsic: "Extra data that travels with the package, each piece by its hash and length.",
};
/** A part's name: the last step of its path, "[1]" for an item in a list. */
export const nameOf = (path: string): string => /(\[\d+\]|[^.[\]]+)$/.exec(path)![1];
/** What a part is for. An item in a list says which it is. */
export function saysOf(n: Node): string {
  const item = /^items\[(\d+)\]$/.exec(n.path);
  if (item) {
    const [service, payload] = [partAt(`${n.path}.service`), partAt(`${n.path}.payload`)];
    return `Job ${item[1]}: service ${service.json}'s code, run on a ${payload.end - payload.start - payload.prefix}-byte payload.`;
  }
  return SAYS[nameOf(n.path)] ?? "";
}

/** A part's value, short: a number as a number, bytes as their first and last few. */
export function valueOf(n: Node): string {
  const bytes = PACKAGE.bytes.slice(n.start + n.tag + n.prefix, n.end);
  if (typeof n.json === "number") return String(n.json);
  if (Array.isArray(n.json)) return n.json.length === 0 ? "none" : `${n.json.length} of them`;
  if (typeof n.json === "string") return n.prefix ? `${bytes.length} bytes: ${short(bytes)}` : short(bytes);
  return `${n.end - n.start} bytes in ${n.children.length} parts`;
}

/** Where a part's bytes are: "bytes 0 to 3, 4 of them", and what comes first, if anything. */
export function bytesOf(n: Node): string {
  const size = n.end - n.start;
  const where = size === 1 ? `byte ${n.start}, 1 of them` : `bytes ${n.start} to ${n.end - 1}, ${size} of them`;
  if (!n.prefix) return where;
  const what = Array.isArray(n.json) ? "the count" : "its length";
  return `${where}, ${what} first${n.prefix > 1 ? ` (${n.prefix} bytes)` : ""}`;
}

/** A part's bytes as a hex dump writes them, for the readout's line (at most 12). */
export const hexOf = (n: Node): string => {
  const b = PACKAGE.bytes.slice(n.start, n.end);
  return b.length <= 12 ? spaced(b) : `${spaced(b.slice(0, 8))} … (${b.length} bytes)`;
};

/** The top-level fields as the bytes hold them, in Appendix C's order, with their sizes. */
export const WIRE = PACKAGE.root.children.map((n) => ({ path: n.path, bytes: n.end - n.start, compartment: compartmentOf(n.path).id }));

/** The goals, and the parts that reach each. */
export const GOALS = [
  { id: "token", say: "find what the authorizer checks", reached: (p: string) => p === "authorization" },
  { id: "anchor", say: "find the block the package was built on", reached: (p: string) => p === "context.anchor" },
  { id: "input", say: "find the second job's input", reached: (p: string) => p === "items[1].payload" },
  { id: "split", say: "find the slip's part that the bytes put after the postmark", reached: (p: string) => p === "authorization" || p === "authorizer_config" },
];

/** The chips a compartment shows, row by row: the slip's four parts; the postmark and its
 *  eight; the jobs, and the parts of the one chosen. */
export function chipRows(c: Compartment, selected: string): string[][] {
  if (c === "slip") return [COMPARTMENTS[0].fields];
  if (c === "postmark") return [["context"], partAt("context").children.map((n) => n.path)];
  const items = partAt("items").children.map((n) => n.path);
  const open = items.find((i) => selected === i || selected.startsWith(`${i}.`));
  return [["items"], items, ...(open ? [partAt(open).children.map((n) => n.path)] : [])];
}

/** A chip's label: its name, or for a job, which job and whose. */
export function labelOf(path: string): string {
  const item = /^items\[(\d+)\]$/.exec(path);
  return item ? `job ${item[1]} · service ${partAt(`${path}.service`).json}` : nameOf(path);
}
