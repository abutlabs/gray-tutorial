// Part 4's summary widget: the tiny test vector's block as a parcel. A header, the cover
// page, and an extrinsic, five bags of things from outside the chain, each part tappable
// down to its bytes. Every value is one the lessons' own widgets already draw: the header is
// header_0 (header-map.ts), the bags are 4.1 to 4.4's vectors. tools/widget-block-parcel.test.ts
// checks the whole against codec/tiny/block.bin and 4.7's numbers.

import type { Json, Node, Type } from "./codec-map.ts";
import { assurance } from "./assurance-parcel.ts";
import { DISPUTES_EXTRINSIC, SAYS as DISPUTES_SAYS } from "./disputes-parcel.ts";
import { ASSURANCES_TINY_JSON, DISPUTES_JSON, PREIMAGES_JSON, TICKETS_JSON } from "./extrinsic-vectors.ts";
import { GUARANTEE_JSON, REPORT_GUARANTEE } from "./guarantee-parcel.ts";
import { HEADER, HEADER_0_JSON } from "./header-map.ts";
import { makeParcel } from "./parcel.ts";
import type { Parcel } from "./parcel.ts";
import { SAYS as REPORT_SAYS } from "./work-report.ts";
import { PREIMAGE, TICKET_ENVELOPE } from "./tickets-preimages.ts";

/** Extrinsic and Block, as lesson 4.7's codecs write them, at the tiny size (2 cores). */
export const EXTRINSIC: Type = {
  record: [
    ["tickets", { seq: TICKET_ENVELOPE }],
    ["preimages", { seq: PREIMAGE }],
    ["guarantees", { seq: REPORT_GUARANTEE }],
    ["assurances", { seq: assurance(2) }],
    ["disputes", DISPUTES_EXTRINSIC],
  ],
};
export const BLOCK: Type = { record: [["header", HEADER], ["extrinsic", EXTRINSIC]] };

export const BLOCK_JSON = {
  header: HEADER_0_JSON as Json,
  extrinsic: { tickets: TICKETS_JSON, preimages: PREIMAGES_JSON, guarantees: [GUARANTEE_JSON as Json], assurances: ASSURANCES_TINY_JSON, disputes: DISPUTES_JSON },
};
export const BAGS = ["tickets", "preimages", "guarantees", "assurances", "disputes"];

export const BLOCK_PARCEL: Parcel = makeParcel({
  name: "block",
  whole: "The tiny test vector's block: a header, the cover page, then the extrinsic, five bags of things from outside the chain. Tap any part.",
  type: BLOCK,
  json: BLOCK_JSON,
  compartments: [
    { id: "header", name: "The header", says: "the cover page: which block came before, when, who made it, and the seal that proves it", fields: ["header"], tone: "grey", stapled: true },
    { id: "extrinsic", name: "The extrinsic", says: "five bags of things from outside the chain, in this order", fields: ["extrinsic"], tone: "brand" },
  ],
  open: ["header", "extrinsic"],
  strip: ["header", ...BAGS.map((b) => `extrinsic.${b}`)],
  says: {
    ...REPORT_SAYS,
    ...DISPUTES_SAYS,
    header: "The cover page: ten fields about the block (lesson 4.6).",
    extrinsic: "Everything the block brings in from outside the chain, in five bags (lessons 4.1 to 4.4).",
    parent: "The block before this one, by its header's hash: the link that makes a chain.",
    parent_state_root: "The state after the parent block, by its root hash (Part 6).",
    extrinsic_hash: "A hash over the extrinsic below, so the header vouches for every bag (lesson 5.2).",
    slot: "Which 6-second timeslot this block is for.",
    epoch_mark: "Present at an epoch's first block: the next epoch's validators and randomness. A maybe: 01 then the value, or 00.",
    tickets_mark: "Present once the lottery has closed: who authors the next epoch's slots. Here: nothing, one byte 00.",
    author_index: "Which validator made this block: a u16.",
    entropy_source: "Fresh randomness from the author's VRF: 96 bytes.",
    offenders_mark: "Validators newly found guilty by a dispute, by their keys.",
    seal: "The author's signature over the header: 96 bytes.",
    tickets: "Lottery entries for who authors which slot (lesson 4.1).",
    preimages: "Data services asked for by its hash, delivered (lesson 4.1).",
    guarantees: "Work-reports from the cores, each signed by its guarantors (lesson 4.3).",
    assurances: "Validators' promises that they hold the cores' data (lesson 4.2).",
    disputes: "Verdicts on bad reports, and whom they catch out (lesson 4.4).",
    attempt: "Which of its owner's tries this ticket is.",
    signature: "A signature or proof: the evidence that the right validator made this.",
    requester: "The service that asked for the data.",
    blob: "The data itself, its length first.",
    verdicts: "Verdicts: a report's hash and the votes on it.",
    culprits: "Guarantors who vouched for a bad report.",
    faults: "Validators who voted against the verdict.",
    report: "The work-report being vouched for: lesson 3.3's receipt.",
    signatures: "The guarantors' signatures.",
    anchor: "The parent block's hash, the promise is made against.",
    bitfield: "One bit per core: 1 means I hold my pieces.",
    validator_index: "Which validator.",
    validators: "The next epoch's validators, each a Bandersnatch and an Ed25519 key.",
    entropy: "Randomness for the next epoch.",
    tickets_entropy: "Randomness the next epoch's tickets are drawn against.",
  },
  items: { tickets: "ticket", preimages: "preimage", guarantees: "guarantee", assurances: "assurance", validators: "validator", offenders_mark: "offender", signatures: "signature", verdicts: "verdict", votes: "vote", culprits: "culprit", faults: "fault", results: "digest" },
  saysItem: (n: Node) => `${n.path.replace(/^extrinsic\./, "")}: ${n.end - n.start} bytes.`,
  goals: [
    { id: "slot", say: "find the timeslot this block is for", reached: (p) => p === "header.slot" },
    { id: "who", say: "find who made the block", reached: (p) => p === "header.author_index" },
    { id: "work", say: "find the bag that carries the cores' work", reached: (p) => p === "extrinsic.guarantees" },
    { id: "biggest", say: "find the biggest bag in the strip", reached: (p) => p === "extrinsic.tickets" },
  ],
});
