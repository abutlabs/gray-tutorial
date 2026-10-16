// Lesson 4.3's widget: a guarantee as a parcel. A whole work-report (3.3's receipt, byte for
// byte), the slot its guarantors signed it in, and their signatures. The value is the tiny
// vector's one guarantee; its report is work-report.ts's, the same vector's.
// tools/widget-guarantee-parcel.test.ts checks it against 4.3's codecs, its decode trace and
// the vector's bytes.

import type { Node, Type } from "./codec-map.ts";
import { GUARANTEE_SIGNATURES, GUARANTEE_SLOT } from "./extrinsic-vectors.ts";
import { makeParcel } from "./parcel.ts";
import type { Parcel } from "./parcel.ts";
import { REPORT_JSON, SAYS as REPORT_SAYS, WORK_REPORT } from "./work-report.ts";

/** ValidatorSignature and ReportGuarantee, as lesson 4.3's codecs write them. */
export const VALIDATOR_SIGNATURE: Type = { record: [["validator_index", "u16"], ["signature", { bytes: 64 }]] };
export const REPORT_GUARANTEE: Type = { record: [["report", WORK_REPORT], ["slot", "u32"], ["signatures", { seq: VALIDATOR_SIGNATURE }]] };

export const GUARANTEE_JSON = { report: REPORT_JSON[0], slot: GUARANTEE_SLOT, signatures: GUARANTEE_SIGNATURES };

export const GUARANTEE: Parcel = makeParcel({
  name: "guarantee",
  whole: "The tiny vector's one guarantee (after the bag's count byte, 01). Tap any part.",
  type: REPORT_GUARANTEE,
  json: GUARANTEE_JSON,
  compartments: [
    { id: "report", name: "The report", says: "a whole work-report: lesson 3.3's receipt, byte for byte", fields: ["report"], tone: "brand" },
    { id: "when", name: "When", says: "the slot the guarantors signed in", fields: ["slot"], tone: "grey" },
    { id: "who", name: "Who vouches", says: "two or three validators, each an index and a signature", fields: ["signatures"], tone: "green", stapled: true },
  ],
  says: {
    ...REPORT_SAYS,
    report: "The work-report being vouched for: everything lesson 3.3 encoded, as one field.",
    slot: "The timeslot the guarantors signed in: a u32.",
    signatures: "The guarantors' signatures: a count, then each one.",
    validator_index: "Which validator signed: a u16.",
    signature: "Its Ed25519 signature over the report's hash: 64 bytes.",
  },
  items: { signatures: "signature", results: "digest", prerequisites: "prerequisite", segment_root_lookup: "lookup" },
  saysItem: (n: Node, partAt) =>
    n.path.startsWith("signatures[") ? `Validator ${partAt(`${n.path}.validator_index`).json}'s signature: an index and 64 bytes.` : `One of the report's digests: service ${partAt(`${n.path}.service_id`).json}'s.`,
  goals: [
    { id: "report", say: "find the report inside", reached: (p) => p === "report" },
    { id: "slot", say: "find when it was signed", reached: (p) => p === "slot" },
    { id: "second", say: "find the second guarantor", reached: (p) => p === "signatures[1]" || p === "signatures[1].validator_index" },
  ],
});
