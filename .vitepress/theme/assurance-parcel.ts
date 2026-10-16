// Lesson 4.2's widget: an assurance as a parcel, tiny and full. The parent's hash, a bitfield
// of one bit per core, a validator index and a signature; only the bitfield's size depends
// on the network: ⌈2/8⌉ = 1 byte on tiny, ⌈341/8⌉ = 43 on full. The values are the vectors'
// first assurance (extrinsic-vectors.ts); tools/widget-assurance-parcel.test.ts checks them
// against 4.2's codec, its decode traces and the vectors' bytes.

import type { Json, Node, Type } from "./codec-map.ts";
import { ASSURANCES_FULL_JSON, ASSURANCES_TINY_JSON } from "./extrinsic-vectors.ts";
import { makeParcel } from "./parcel.ts";
import type { Parcel } from "./parcel.ts";

export const SIZES = [
  { name: "tiny", cores: 2, json: ASSURANCES_TINY_JSON },
  { name: "full", cores: 341, json: ASSURANCES_FULL_JSON },
];

/** Assurance(config), as lesson 4.2's codec writes it for `cores` cores. */
export const assurance = (cores: number): Type => ({
  record: [["anchor", "hash"], ["bitfield", { bytes: Math.ceil(cores / 8) }], ["validator_index", "u16"], ["signature", { bytes: 64 }]],
});

export const PARCELS: Parcel[] = SIZES.map((s) =>
  makeParcel({
    name: "assurance",
    whole: `The first of the ${s.name} vector's ${(s.json as Json[]).length} assurances, for ${s.cores.toLocaleString("en-US")} cores. Tap any part.`,
    type: assurance(s.cores),
    json: (s.json as Json[])[0],
    compartments: [
      { id: "about", name: "Which block", says: "the parent block the promise is made against", fields: ["anchor"], tone: "grey" },
      { id: "promise", name: "The promise", says: "one bit per core: 1 means I hold my pieces of that core's report", fields: ["bitfield"], tone: "amber" },
      { id: "who", name: "Who promises", says: "the validator, and its signature over the promise", fields: ["validator_index", "signature"], tone: "green", stapled: true },
    ],
    says: {
      anchor: "The parent block's hash: the promise is about the reports waiting on its cores.",
      bitfield: `One bit per core, lowest first: ${s.cores.toLocaleString("en-US")} cores need ⌈${s.cores}/8⌉ = ${Math.ceil(s.cores / 8)} byte${s.cores > 8 ? "s" : ""}. The only part whose size depends on the network.`,
      validator_index: "Which validator promises: a u16, two bytes.",
      signature: "Its Ed25519 signature over the anchor and the bitfield: 64 bytes.",
    },
    items: {},
    saysItem: (n: Node) => `${n.path}.`,
    goals: [
      { id: "grows", say: "find the part that grows on full", reached: (p) => p === "bitfield" },
      { id: "who", say: "find which validator promises", reached: (p) => p === "validator_index" },
    ],
  }),
);
