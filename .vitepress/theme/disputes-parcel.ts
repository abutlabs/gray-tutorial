// Lesson 4.4's widget: the disputes extrinsic as a parcel. Three lists: verdicts (a report's
// hash, an epoch and the votes, each a yes or no, an index and a signature), culprits and
// faults. The value is the tiny vector's (extrinsic-vectors.ts);
// tools/widget-disputes-parcel.test.ts checks it against 4.4's codecs and the vector's bytes.

import type { Node, Type } from "./codec-map.ts";
import { DISPUTES_JSON } from "./extrinsic-vectors.ts";
import { makeParcel } from "./parcel.ts";
import type { Parcel } from "./parcel.ts";

/** Judgement, Verdict, Culprit, Fault and DisputesExtrinsic, as lesson 4.4's codecs write them. */
export const JUDGEMENT: Type = { record: [["vote", "bool"], ["index", "u16"], ["signature", { bytes: 64 }]] };
export const VERDICT: Type = { record: [["target", "hash"], ["age", "u32"], ["votes", { seq: JUDGEMENT }]] };
export const CULPRIT: Type = { record: [["target", "hash"], ["key", { bytes: 32 }], ["signature", { bytes: 64 }]] };
export const FAULT: Type = { record: [["target", "hash"], ["vote", "bool"], ["key", { bytes: 32 }], ["signature", { bytes: 64 }]] };
export const DISPUTES_EXTRINSIC: Type = { record: [["verdicts", { seq: VERDICT }], ["culprits", { seq: CULPRIT }], ["faults", { seq: FAULT }]] };

export const DISPUTES: Parcel = makeParcel({
  name: "disputes_extrinsic",
  whole: "The tiny vector's disputes: verdicts, then the guarantors and voters they catch out. Tap any part.",
  type: DISPUTES_EXTRINSIC,
  json: DISPUTES_JSON,
  compartments: [
    { id: "verdicts", name: "Verdicts", says: "a report's hash and the votes of two thirds of the validators, plus one", fields: ["verdicts"], tone: "brand" },
    { id: "culprits", name: "Culprits", says: "guarantors who vouched for a report that turned out bad", fields: ["culprits"], tone: "amber" },
    { id: "faults", name: "Faults", says: "validators who voted against the verdict", fields: ["faults"], tone: "purple" },
  ],
  says: {
    verdicts: "The verdicts: a count, then each one.",
    culprits: "The culprits: a count, then each one.",
    faults: "The faults: a count, then each one.",
    target: "The work-report this is about, by its hash.",
    age: "The epoch whose validators voted: this one or the one before. A u32.",
    votes: "The votes: a count, then each judgement. 5 on tiny, 683 on full.",
    vote: "Yes or no: one byte, 1 for valid, 0 for not.",
    index: "Which validator voted: a u16.",
    key: "The validator's Ed25519 key: 32 bytes.",
    signature: "An Ed25519 signature: 64 bytes, the evidence.",
  },
  items: { verdicts: "verdict", votes: "vote", culprits: "culprit", faults: "fault" },
  saysItem: (n: Node, partAt) => {
    if (/^verdicts\[\d+\]$/.test(n.path)) {
      const votes = partAt(`${n.path}.votes`).children.map((v) => partAt(`${v.path}.vote`).json);
      return `A verdict: ${votes.filter(Boolean).length} of ${votes.length} votes say valid.`;
    }
    if (/\.votes\[\d+\]$/.test(n.path)) return `Validator ${partAt(`${n.path}.index`).json} votes ${partAt(`${n.path}.vote`).json ? "valid" : "not valid"}.`;
    if (n.path.startsWith("culprits[")) return "A guarantor caught out: the report, its key, and its guarantee as evidence.";
    return `A voter caught out: it voted ${partAt(`${n.path}.vote`).json ? "valid" : "not valid"}, against the verdict.`;
  },
  goals: [
    { id: "yes", say: "find the byte that says one vote is yes", reached: (p) => /^verdicts\[\d+\]\.votes\[\d+\]\.vote$/.test(p) },
    { id: "culprit", say: "find a culprit's key", reached: (p) => /^culprits\[\d+\]\.key$/.test(p) },
    { id: "fault", say: "find how a fault voted", reached: (p) => /^faults\[\d+\]\.vote$/.test(p) },
  ],
});
