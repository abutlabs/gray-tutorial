// A Part's opening page draws the Part as a flow (PartFlow.vue): the things your client
// holds, and the steps that turn one into the next, each with a plain-words line, a real
// value and the lesson that builds it. A step your client never takes (a guarantor's, on the
// network) says who takes it. tools/widget-part-flow.test.ts checks every value, field and
// lesson here against the lessons' own code.

import { bytesFor } from "./bitfield.ts";
import { encodeFixed, spacedHex, toHex } from "./bytes.ts";
import { compact } from "./compact.ts";

/** A thing your client holds, or a step that turns one thing into the next. */
export type Card = {
  kind: "thing" | "step";
  name: string;
  says: string; // what it is, in plain words
  example?: string; // a real value from the lessons
  fields?: string[]; // what it's made of, in the order it's encoded
  record?: string; // where those fields are defined: "3.1 WorkPackage", a record in that lesson's code
  lessons: string[]; // the lessons that build it, "1.1"; none for a step the client never takes
  elsewhere?: string; // a step the client never takes: who takes it instead
};

/** A Part as a flow: its cards in rows (each row's cards side by side), and the order to walk them. */
export type Flow = { part: number; rows: string[][]; walk: string[]; cards: Record<string, Card> };

/** Where each lesson the flows name is, under the site's base (checked against the lesson files). */
export const LESSON_PATHS: Record<string, string> = {
  "0.3": "00-start/03-watch-your-client",
  "0.4": "00-start/04-the-jam-clock",
  "1.1": "01-bytes-and-numbers/01-bytes-and-hex",
  "1.2": "01-bytes-and-numbers/02-numbers",
  "2.1": "02-codec/01-fixed-width-integers",
  "2.2": "02-codec/02-compact-naturals",
  "2.3": "02-codec/03-writer-and-reader",
  "2.4": "02-codec/04-codecs",
  "2.5": "02-codec/05-sequences-and-records",
  "2.6": "02-codec/06-the-first-test-vectors",
  "2.7": "02-codec/07-watch-a-decode",
  "3.1": "03-work-and-reports/01-a-work-package",
  "3.2": "03-work-and-reports/02-work-digests",
  "3.3": "03-work-and-reports/03-a-work-report",
  "4.1": "04-blocks/01-tickets-and-preimages",
  "4.2": "04-blocks/02-tiny-and-full",
  "4.3": "04-blocks/03-guarantees",
  "4.4": "04-blocks/04-disputes",
  "4.5": "04-blocks/05-maybe-and-exactly-n",
  "4.6": "04-blocks/06-the-header",
  "4.7": "04-blocks/07-the-block",
  "5.1": "05-hashing-and-signatures/01-hashes",
  "5.2": "05-hashing-and-signatures/02-the-extrinsic-hash",
  "5.3": "05-hashing-and-signatures/03-signatures",
};

const SLOT = 5n; // a timeslot, as the lessons first meet one
/** The JAM Common Era, 2025-01-01 12:00 UTC, in seconds since 1970 (0.4), and a slot's length. */
export const JAM_COMMON_ERA = Date.UTC(2025, 0, 1, 12) / 1000;
export const SLOT_SECONDS = 6;
const slotAt = (iso: string) => Math.floor((Date.parse(iso) / 1000 - JAM_COMMON_ERA) / SLOT_SECONDS);
/** An assurance's signed message starts with these ASCII bytes (5.3, X_A in the GP). */
export const AVAILABLE = "jam_available";
const BIG = 2n ** 64n - 70n; // 1.2's number that a float can't hold

export const FLOWS: Flow[] = [
  {
    part: 0,
    rows: [["now"], ["slotAt"], ["slot", "tests"], ["report"], ["stack"]],
    walk: ["now", "slotAt", "slot", "tests", "report", "stack"],
    cards: {
      now: {
        kind: "thing",
        name: "The time now",
        says: "Your computer's clock: a date and a time, to the millisecond.",
        example: "1 January 2025 at 1 pm UTC: an hour after the JAM Common Era began",
        lessons: ["0.4"],
      },
      slotAt: {
        kind: "step",
        name: "slotAt",
        says: `Count the seconds since the JAM Common Era, 2025-01-01 at 12:00 UTC, and divide by ${SLOT_SECONDS}. JAM's clock ticks once every ${SLOT_SECONDS} seconds.`,
        example: `6 seconds in → slot ${slotAt("2025-01-01T12:00:06Z")}, an hour in → slot ${slotAt("2025-01-01T13:00:00Z")}`,
        lessons: ["0.4"],
      },
      slot: {
        kind: "thing",
        name: "A timeslot",
        says: "JAM's own time: which 6-second tick it is. Every block names the slot it was made in.",
        example: `an hour in: slot ${slotAt("2025-01-01T13:00:00Z")}`,
        lessons: ["0.4"],
      },
      tests: {
        kind: "thing",
        name: "Tests",
        says: "Small programs that check one thing each. Write the test first, watch it fail, then write the code that makes it pass.",
        example: "slot 0 is the first six seconds of the JAM Common Era",
        lessons: ["0.4"],
      },
      report: {
        kind: "step",
        name: "Report a run",
        says: "Every run, a program or npm test, sends what it did as events and what it measured as numbers, in one go at the end.",
        example: `{"step":"hello","message":"my JAM client is alive"}`,
        lessons: ["0.3"],
      },
      stack: {
        kind: "step",
        name: "Keep it, and show it",
        says: "Loki keeps the events, the Pushgateway and Prometheus keep the numbers, and Grafana draws both, run after run.",
        lessons: [],
        elsewhere: "the observability stack, which lesson 0.2 starts in Docker",
      },
    },
  },
  {
    part: 1,
    rows: [["hex", "number"], ["fromHex", "exact"], ["bytes", "kept"], ["codec"]],
    walk: ["hex", "fromHex", "bytes", "number", "exact", "kept", "codec"],
    cards: {
      hex: {
        kind: "thing",
        name: "Hex, as the test vectors write it",
        says: "The official test vectors are text files. Every byte in them is two hex digits, so 255 is 0xff.",
        example: toHex([1, 2, 255]),
        lessons: ["1.1"],
      },
      fromHex: {
        kind: "step",
        name: "fromHex, and toHex back",
        says: "Read every two hex digits as one byte, and write a byte back as two digits. Going there and back must give the same thing.",
        example: `${toHex([1, 2, 255])} ⇄ [1, 2, 255]`,
        lessons: ["1.1"],
      },
      bytes: {
        kind: "thing",
        name: "Bytes",
        says: "A row of numbers from 0 to 255: what every JAM value is in the end, and what gets hashed.",
        example: "Uint8Array [1, 2, 255]",
        lessons: ["1.1"],
      },
      number: {
        kind: "thing",
        name: "A JAM number",
        says: "Slots, ids, counts and gas. Some are small, and some go right up to 64 bits.",
        example: `slot ${SLOT}, or gas ${BIG}`,
        lessons: ["1.2"],
      },
      exact: {
        kind: "step",
        name: "Keep it exact",
        says: "A JavaScript number rounds above 2^53, so 2^64 − 70 and 2^64 come out the same. Use number up to 32 bits, and bigint for 64.",
        example: `${BIG}n`,
        lessons: ["1.2"],
      },
      kept: {
        kind: "thing",
        name: "An exact number",
        says: "The same value in every client, down to the last digit, ready to be turned into bytes.",
        example: `${SLOT} (a number), ${BIG}n (a bigint)`,
        lessons: ["1.2"],
      },
      codec: {
        kind: "step",
        name: "On to the codec",
        says: "Numbers in, bytes out, the same in every client. Part 2 builds it.",
        lessons: [],
        elsewhere: "Part 2 · The codec",
      },
    },
  },
  {
    part: 2,
    rows: [["value"], ["encode"], ["bytes"], ["decode"], ["again"], ["vectors"], ["trace"]],
    walk: ["value", "encode", "bytes", "decode", "again", "vectors", "trace"],
    cards: {
      value: {
        kind: "thing",
        name: "A JAM value",
        says: "Anything JAM keeps: a number, a hash, a list, or a whole structure of named fields, such as a work item.",
        example: `slot ${SLOT}, or 300 as a count`,
        lessons: ["2.4", "2.5"],
      },
      encode: {
        kind: "step",
        name: "Encode: ℰ",
        says: "Write the value as bytes, field after field, in the Gray Paper's order. A Writer collects them. A fixed-width number always takes the same bytes; a compact one takes only as many as it needs.",
        example: `ℰ₄(${SLOT}) = ${spacedHex(encodeFixed(SLOT, 4))}, ℰ(300) = ${spacedHex(compact(300n).bytes)}`,
        lessons: ["2.1", "2.2", "2.3"],
      },
      bytes: {
        kind: "thing",
        name: "The bytes",
        says: "Exactly one row of bytes for each value: the same in every client, so the same hash.",
        example: spacedHex(encodeFixed(SLOT, 4)),
        lessons: ["2.1"],
      },
      decode: {
        kind: "step",
        name: "Decode",
        says: "A Reader walks back through the bytes, keeping its place, and rebuilds the value. One codec describes a value both ways, so encode and decode can't drift apart.",
        example: `${spacedHex(encodeFixed(SLOT, 4))} → ${SLOT}`,
        lessons: ["2.3", "2.4"],
      },
      again: {
        kind: "thing",
        name: "The same value, back",
        says: "Decoding what you encoded gives back exactly what you started with. Lists and records work the same way, field by field.",
        example: `${SLOT}`,
        lessons: ["2.4", "2.5"],
      },
      vectors: {
        kind: "step",
        name: "Check against the official vectors",
        says: "Decode the vector's bytes and compare them with its JSON, then encode again and compare the bytes. A vector passes only when both match.",
        example: "work_item and refine_context, tiny and full: 4 of 1,428",
        lessons: ["2.6"],
      },
      trace: {
        kind: "thing",
        name: "A decode trace",
        says: "Which bytes became which field, so a mistake shows exactly where it is.",
        example: "0..4  service  0x04030201",
        lessons: ["2.7"],
      },
    },
  },
  {
    part: 3,
    rows: [["job"], ["package"], ["authorize"], ["refine"], ["digests"], ["report"], ["guarantee"]],
    walk: ["job", "package", "authorize", "refine", "digests", "report", "guarantee"],
    cards: {
      job: {
        kind: "thing",
        name: "A job to do",
        says: "A service wants its code run on some input, its payload, using one of JAM's cores.",
        lessons: [],
        elsewhere: "a builder, outside the chain",
      },
      package: {
        kind: "thing",
        name: "Work-package",
        says: "The parcel: up to 16 work items, the chain as it looked when the parcel was built, and a permission slip for the core.",
        fields: ["auth_code_host", "auth_code_hash", "context", "authorization", "authorizer_config", "items"],
        record: "3.1 WorkPackage",
        lessons: ["3.1"],
      },
      authorize: {
        kind: "step",
        name: "Authorize",
        says: "A guarantor runs the package's authorizer: may this package use the core at all?",
        lessons: [],
        elsewhere: "a guarantor, on the network. Block import never runs an authorizer",
      },
      refine: {
        kind: "step",
        name: "Refine",
        says: "The guarantor runs each item's service code on its payload: one result for each item.",
        lessons: [],
        elsewhere: "a guarantor, on the network",
      },
      digests: {
        kind: "thing",
        name: "Work digests",
        says: "One summary card for each item: which service, what it was given, the gas it may use, and its result, which is either an output or an error.",
        fields: ["service_id", "code_hash", "payload_hash", "accumulate_gas", "result", "refine_load"],
        record: "3.2 WorkDigest",
        lessons: ["3.2"],
      },
      report: {
        kind: "thing",
        name: "Work-report",
        says: "The receipt that ties it all together: which package, on which core, who authorized it, and every item's digest.",
        fields: ["package_spec", "context", "core_index", "authorizer_hash", "auth_gas_used", "auth_output", "segment_root_lookup", "results"],
        record: "3.3 WorkReport",
        lessons: ["3.3"],
      },
      guarantee: {
        kind: "step",
        name: "Guarantee",
        says: "Two or three guarantors sign the report, and the signed report goes into a block. Part 4 encodes it there, and Part 12 checks the signatures.",
        lessons: [],
        elsewhere: "the core's guarantors, on the network",
      },
    },
  },
  {
    part: 4,
    rows: [["tickets", "preimages", "guarantees", "assurances", "disputes"], ["extrinsic", "header"], ["block"], ["sizes"], ["read"]],
    walk: ["tickets", "preimages", "guarantees", "assurances", "disputes", "extrinsic", "header", "block", "sizes", "read"],
    cards: {
      tickets: {
        kind: "thing",
        name: "Tickets",
        says: "Entries in the lottery that decides who writes the blocks of a coming epoch.",
        lessons: ["4.1"],
      },
      preimages: {
        kind: "thing",
        name: "Preimages",
        says: "Data a service asked for by its hash, now delivered.",
        lessons: ["4.1"],
      },
      guarantees: {
        kind: "thing",
        name: "Guarantees",
        says: "Part 3's work-reports, each signed by the guarantors that vouch for it.",
        lessons: ["4.3"],
      },
      assurances: {
        kind: "thing",
        name: "Assurances",
        says: `Validators saying "I hold my piece of this core's data": one bit for each core, so the block's size depends on the network's.`,
        lessons: ["4.2"],
      },
      disputes: {
        kind: "thing",
        name: "Disputes",
        says: "Judgments on reports: the validators' verdict on whether a report was good, and who is to blame for a bad one.",
        lessons: ["4.4"],
      },
      extrinsic: {
        kind: "thing",
        name: "The extrinsic",
        says: "Everything the block brings in from outside: the five lists, always in this order.",
        fields: ["tickets", "preimages", "guarantees", "assurances", "disputes"],
        record: "4.7 Extrinsic",
        lessons: ["4.4", "4.7"],
      },
      header: {
        kind: "thing",
        name: "The header",
        says: "The block's cover page: its parent, the state it builds on, a hash that commits to the extrinsic, its slot, its author and its seal. Two of its fields are only sometimes there.",
        fields: ["parent", "parent_state_root", "extrinsic_hash", "slot", "epoch_mark", "tickets_mark", "author_index", "entropy_source", "offenders_mark", "seal"],
        record: "4.6 Header",
        lessons: ["4.5", "4.6"],
      },
      block: {
        kind: "thing",
        name: "A block",
        says: "The header and the extrinsic, together.",
        fields: ["header", "extrinsic"],
        record: "4.7 Block",
        lessons: ["4.7"],
      },
      sizes: {
        kind: "step",
        name: "Tiny or full",
        says: "The same codec in two sizes. Tiny is for tests and full is the real network, and a few lists change length to match.",
        example: `tiny: 6 validators, 2 cores (an assurance is ${bytesFor(2)} byte); full: 1023 validators, 341 cores (${bytesFor(341)} bytes)`,
        lessons: ["4.2"],
      },
      read: {
        kind: "step",
        name: "Read any block",
        says: "Decode a whole block, at either size, and show every byte of it. Checking that the block is valid comes in Part 5.",
        example: "all 30 codec vectors pass whole",
        lessons: ["4.7"],
      },
    },
  },
  {
    part: 5,
    rows: [["header"], ["hash"], ["link"], ["extrinsic"], ["exthash"], ["sign"], ["assurance"], ["verify"]],
    walk: ["header", "hash", "link", "extrinsic", "exthash", "sign", "assurance", "verify"],
    cards: {
      header: {
        kind: "thing",
        name: "A block's header",
        says: "The cover page from Part 4, from a chain of 100 real blocks in a test trace.",
        lessons: ["5.1"],
      },
      hash: {
        kind: "step",
        name: "Hash it: blake2b-256",
        says: "Encode the header, and boil its bytes down to a 32-byte fingerprint. Change one bit of the header and the fingerprint changes completely.",
        example: "H(ℰ(header)): 32 bytes",
        lessons: ["5.1"],
      },
      link: {
        kind: "step",
        name: "Check the link",
        says: "The next block's header names its parent by exactly that hash. If they match, the two blocks are a chain.",
        example: "block 2's parent is the hash of block 1's header",
        lessons: ["5.1"],
      },
      extrinsic: {
        kind: "thing",
        name: "The block's extrinsic",
        says: "Everything the block brings in. Its header promises it by hash, before anyone has looked inside.",
        lessons: ["5.2"],
      },
      exthash: {
        kind: "step",
        name: "Check the extrinsic hash",
        says: "Hash each of the five lists, then hash those hashes together. The result must be the header's extrinsic_hash.",
        example: "100 of 100 extrinsics match their headers",
        lessons: ["5.2"],
      },
      sign: {
        kind: "step",
        name: "Sign",
        says: `A validator signs with its secret key. What it signs starts with a few letters naming the job, ${AVAILABLE}, so a signature for one job can't pass for another.`,
        lessons: [],
        elsewhere: "each validator, with a secret key only it has",
      },
      assurance: {
        kind: "thing",
        name: "A signed assurance",
        says: "A validator's word that it holds its piece of some cores' data, with its signature.",
        fields: ["anchor", "bitfield", "validator_index", "signature"],
        record: "4.2 Assurance",
        lessons: ["5.3"],
      },
      verify: {
        kind: "step",
        name: "Check the signature: Ed25519",
        says: "Put the validator's public key, the message and the signature together: either it was made with that validator's key, or it wasn't.",
        example: `the message: the ${AVAILABLE.length} bytes of ${AVAILABLE}, then H(ℰ(anchor, bitfield))`,
        lessons: ["5.3"],
      },
    },
  },
];

export const flowOf = (part: number): Flow | undefined => FLOWS.find((f) => f.part === part);
