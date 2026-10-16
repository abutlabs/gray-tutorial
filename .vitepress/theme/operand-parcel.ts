// Lesson 16.7's widget: an operand, U, as a parcel. One input to a service's accumulation,
// mixing the report's parts (its package, exports root, authorizer and trace) with the
// digest's (its payload, gas and result), a 0 in front to say "operand". The values are
// process_one_immediate_report-1's one report and its digest for service 1729.
// tools/widget-operand-parcel.test.ts checks them against the lesson's codec, test and run.

import type { Json, Type } from "./codec-map.ts";
import { makeParcel } from "./parcel.ts";

/** Operand, as lesson 16.7's codec writes it, with the 0 serviceInputs puts in front. */
export const OPERAND: Type = {
  record: [
    ["kind", "u8"], ["package_hash", "hash"], ["exports_root", "hash"], ["authorizer_hash", "hash"],
    ["payload_hash", "hash"], ["gas", "natural"], ["result", "result"], ["auth_trace", "blob"],
  ],
};
export const SERVICE = 1729;
export const OPERAND_JSON: Json = {
  "kind": 0,
  "package_hash": "0x2a762f984bcb960c32e78fb31b648c3bab5b8ebc0ac2b945f936d30cdc4bec9c",
  "exports_root": "0x51f9df1925c1adae33dc75126996fe1200fe80fcc27e70c177fa259081296236",
  "authorizer_hash": "0xbf52de5ab6e18f3a407ae0952c67b624a56a6eafd7c40feb2ade331a18b4c929",
  "payload_hash": "0x038a8a7fea081877c200733e9aad0bdf3c1f43ea76cf5c3235d70dce8c58a84a",
  "gas": 200000,
  "result": {
    "ok": "0xefd36b4ce7a69729081481c50119dbe4"
  },
  "auth_trace": "0x"
};

export const OPERAND_PARCEL = makeParcel({
  name: "operand",
  whole: "Service 1729's one input in process_one_immediate_report-1: what accumulation learns of one work-digest. Tap any part.",
  type: OPERAND,
  json: OPERAND_JSON,
  compartments: [
    { id: "kind", name: "What it is", says: "0: an operand; a transfer starts with 1 (lesson 17.4)", fields: ["kind"], tone: "grey" },
    { id: "report", name: "From the report", says: "the same for every digest of the report", fields: ["package_hash", "exports_root", "authorizer_hash", "auth_trace"], tone: "brand" },
    { id: "digest", name: "From the digest", says: "this one work-item's own", fields: ["payload_hash", "gas", "result"], tone: "green", stapled: true },
  ],
  says: {
    kind: "0 says operand. Inputs can be transfers too, which start with 1.",
    package_hash: "p: the work-package's hash.",
    exports_root: "e: the root of the segments the package exported.",
    authorizer_hash: "a: the authorizer that let the package in.",
    payload_hash: "y: the work-item's payload, by its hash.",
    gas: "g: the gas this digest brings to accumulation, a compact natural. The service's gas adds them all up.",
    auth_trace: "t: the authorizer's trace, a blob, its length first. Empty here: one byte, 00.",
  },
  items: {},
  goals: [
    { id: "zero", say: "find the byte that says operand", reached: (p) => p === "kind" },
    { id: "gas", say: "find the gas this input brings", reached: (p) => p === "gas" },
    { id: "split", say: "find the report's part the bytes put after the digest's", reached: (p) => p === "auth_trace" },
  ],
});
