// A Part's opening page draws the Part as a flow (PartFlow.vue): the things your client
// holds, and the steps that turn one into the next, each with a plain-words line, a real
// value and the lesson that builds it. A step your client never takes (a guarantor's, on the
// network) says who takes it. tools/widget-part-flow.test.ts checks every value, field and
// lesson here against the lessons' own code.

import { bytesFor, needed } from "./bitfield.ts";
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
  "0.2": "00-start/02-set-up-the-project",
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
  "6.1": "06-state-and-merklization/01-the-state-trie",
  "6.2": "06-state-and-merklization/02-state-keys",
  "6.3": "06-state-and-merklization/03-reading-the-state",
  "7.1": "07-time-and-shuffling/01-epochs",
  "7.2": "07-time-and-shuffling/02-the-shuffle",
  "8.1": "08-safrole/01-stirring-the-entropy",
  "8.2": "08-safrole/02-rotating-the-validators",
  "8.3": "08-safrole/03-the-fallback-sealers",
  "8.4": "08-safrole/04-the-lotterys-winners",
  "8.5": "08-safrole/05-one-step-of-safrole",
  "8.6": "08-safrole/06-the-vrf-output",
  "8.7": "08-safrole/07-entering-tickets",
  "8.8": "08-safrole/08-the-ring-root",
  "8.9": "08-safrole/09-seals",
  "9.1": "09-recent-history/01-the-mountain-belt",
  "9.2": "09-recent-history/02-recent-blocks",
  "10.1": "10-disputes/01-votes-and-verdicts",
  "10.2": "10-disputes/02-culprits-and-faults",
  "10.3": "10-disputes/03-clearing-the-cores",
  "10.4": "10-disputes/04-bad-verdicts",
  "10.5": "10-disputes/05-bad-culprits-and-faults",
  "11.1": "11-assurances/01-available",
  "11.2": "11-assurances/02-timeouts",
  "11.3": "11-assurances/03-bad-assurances",
  "12.1": "12-guarantees/01-who-guarantees-what",
  "12.2": "12-guarantees/02-signed-and-counted",
  "12.3": "12-guarantees/03-onto-the-cores",
  "12.4": "12-guarantees/04-bad-guarantees",
  "12.5": "12-guarantees/05-bad-reports",
  "13.1": "13-authorization/01-the-authorizer-pools",
  "14.1": "14-services/01-providing-preimages",
  "14.2": "14-services/02-the-service-account",
};

const SLOT = 5n; // a timeslot, as the lessons first meet one
/** The JAM Common Era, 2025-01-01 12:00 UTC, in seconds since 1970 (0.4), and a slot's length. */
export const JAM_COMMON_ERA = Date.UTC(2025, 0, 1, 12) / 1000;
export const SLOT_SECONDS = 6;
const slotAt = (iso: string) => Math.floor((Date.parse(iso) / 1000 - JAM_COMMON_ERA) / SLOT_SECONDS);
/** E, an epoch's length in slots: tiny and full (7.1). */
export const EPOCH_LENGTH = { tiny: 12, full: 600 };
/** F(s, r), the shuffle (7.2): take item r₀ of what's left, put the last in its place, again. */
export function shuffle<T>(items: T[], numbers: number[]): T[] {
  const left = [...items];
  const out: T[] = [];
  for (const r of numbers.slice(0, items.length)) {
    const k = r % left.length;
    out.push(left[k]);
    left[k] = left[left.length - 1];
    left.pop();
  }
  return out;
}
/** Z, outside in (8.4): the first, the last, the second, the second to last, and inwards. */
export function outsideIn<T>(items: T[]): T[] {
  const out: T[] = [];
  for (let i = 0, j = items.length - 1; i <= j; i++, j--) out.push(...(i === j ? [items[i]] : [items[i], items[j]]));
  return out;
}
/** β_H's length: the blocks the recent history remembers (9.2). */
export const RECENT_BLOCKS = 8;
/** U: the slots a report may wait on its core to become available (11.2). */
export const AVAILABILITY_TIMEOUT = 5;
/** R, the slots between guarantor rotations (12.1), and the authorizer pool and queue sizes (13.1). */
export const ROTATION_PERIOD = { tiny: 4, full: 10 };
export const POOL_SIZE = 8;
export const QUEUE_SIZE = 80;
/** Tiny's validators, for the vote and assurance counts. */
const V = 6;
/** C(i), a state component's key (6.2): the byte i, then 30 zeros, as hex. */
export const componentKeyHex = (i: number): string => toHex([i, ...new Array<number>(30).fill(0)]);
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
        lessons: ["0.2", "0.4"],
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
  {
    part: 6,
    rows: [["state"], ["keys"], ["trie", "read"], ["root", "values"], ["check"]],
    walk: ["state", "keys", "trie", "root", "check", "read", "values"],
    cards: {
      state: {
        kind: "thing",
        name: "The state",
        says: "All of JAM's memory: the time, the entropy, the validators and the rest, plus every service's account and storage, as entries of a key and a value.",
        example: "a real state: 16 components, an account, preimages, requests",
        lessons: ["6.2"],
      },
      keys: {
        kind: "step",
        name: "File each entry under its key",
        says: "Every entry has a 31-byte key. A component's key is its number, then zeros; a service's things weave the service id into theirs.",
        example: `C(11), τ the time: ${componentKeyHex(11).slice(0, 4)} then 30 zero bytes`,
        lessons: ["6.2"],
      },
      trie: {
        kind: "step",
        name: "Merklize: build the trie",
        says: "Sort the entries by their keys' bits into a binary tree. Each entry becomes a 64-byte leaf, each fork a branch holding its two children's hashes, and each node is hashed.",
        example: "a leaf: 64 bytes, with the value inside if it fits in 32",
        lessons: ["6.1"],
      },
      root: {
        kind: "thing",
        name: "The state root",
        says: "The top node's hash: one 32-byte fingerprint of the whole state. Change any byte anywhere, and the root changes.",
        example: "the official trie vector's root, matched whole",
        lessons: ["6.1"],
      },
      check: {
        kind: "step",
        name: "Check the header's parent_state_root",
        says: "Every header names the state root after its parent block. Compute your own, and compare.",
        lessons: ["6.1"],
      },
      read: {
        kind: "step",
        name: "Read a component",
        says: "Look a component up by its key, and decode its bytes with the codecs you already have.",
        lessons: ["6.3"],
      },
      values: {
        kind: "thing",
        name: "The time, the entropy, the validators",
        says: "Three components, read back as values. A validator key is three keys for three jobs, and some metadata.",
        example: "a validator key: 336 bytes",
        fields: ["bandersnatch", "ed25519", "bls", "metadata"],
        record: "6.3 ValidatorKey",
        lessons: ["6.3"],
      },
    },
  },
  {
    part: 7,
    rows: [["slot"], ["epochOf"], ["epoch"], ["entropy"], ["numbers"], ["shuffle"], ["hand"]],
    walk: ["slot", "epochOf", "epoch", "entropy", "numbers", "shuffle", "hand"],
    cards: {
      slot: {
        kind: "thing",
        name: "A timeslot",
        says: "JAM's clock from Part 0: one tick every 6 seconds.",
        example: "slot 25",
        lessons: ["7.1"],
      },
      epochOf: {
        kind: "step",
        name: "Which epoch, and where in it",
        says: `Divide the slot by E, the epoch's length: the whole part is the epoch, the remainder the phase. E is ${EPOCH_LENGTH.tiny} slots on tiny and ${EPOCH_LENGTH.full}, an hour, on full.`,
        example: `tiny: slot 25 is epoch ${Math.floor(25 / EPOCH_LENGTH.tiny)}, phase ${25 % EPOCH_LENGTH.tiny}`,
        lessons: ["7.1"],
      },
      epoch: {
        kind: "thing",
        name: "An epoch",
        says: "JAM's slower hand. When a block starts a new epoch, the validators change and the entropy history moves along one place.",
        example: `epoch ${Math.floor(25 / EPOCH_LENGTH.tiny)}, phase ${25 % EPOCH_LENGTH.tiny}`,
        lessons: ["7.1"],
      },
      entropy: {
        kind: "thing",
        name: "A hash nobody could steer",
        says: "32 bytes of randomness the whole chain agrees on. Part 8 makes it; here it's the seed for a shuffle.",
        lessons: ["7.2"],
      },
      numbers: {
        kind: "step",
        name: "Q: numbers from the hash",
        says: "Hash the seed together with ℰ₄(0), then ℰ₄(1), and so on. Each 32-byte hash that comes out is eight 4-byte numbers.",
        lessons: ["7.2"],
      },
      shuffle: {
        kind: "step",
        name: "F: deal",
        says: "Take the item each number points at among those left, put the last item in its place, and go again. The same hash deals the same hand, on every node.",
        example: `a b c d with 1, 1, 0, 0 → ${shuffle(["a", "b", "c", "d"], [1, 1, 0, 0]).join(" ")}`,
        lessons: ["7.2"],
      },
      hand: {
        kind: "thing",
        name: "The dealt hand",
        says: "The list in an order every client agrees on. Lesson 12.1 uses it to deal guarantors to cores.",
        example: "the shuffle vectors: 0 to 341 items",
        lessons: ["7.2"],
      },
    },
  },
  {
    part: 8,
    rows: [["vrf", "enter"], ["stir", "tickets"], ["rotate", "lottery"], ["sealers", "seats"], ["seal"]],
    walk: ["vrf", "stir", "rotate", "sealers", "enter", "tickets", "lottery", "seats", "seal"],
    cards: {
      vrf: {
        kind: "thing",
        name: "A VRF output",
        says: "Randomness from the block author's signature: nobody could have picked it, and anyone can check it. SHA-512 is all it takes to read it.",
        lessons: ["8.6"],
      },
      stir: {
        kind: "step",
        name: "Stir the entropy",
        says: "Every block, hash the entropy together with the VRF output. At a new epoch, the last three epochs' entropy moves along one place.",
        example: "η′₀ = H(η₀ ⌢ VRF output)",
        lessons: ["8.1"],
      },
      rotate: {
        kind: "step",
        name: "Rotate the validators",
        says: "At each new epoch the four validator sets move along: the queued set becomes pending, pending becomes active, and active becomes last epoch's. Convicted offenders are left out.",
        example: "ι → γ_P → κ → λ",
        lessons: ["8.2"],
      },
      sealers: {
        kind: "thing",
        name: "Fallback sealers",
        says: "Plan B: if the lottery didn't fill every slot, each slot's author is picked by hash from the new validators, the same on every node.",
        lessons: ["8.3"],
      },
      enter: {
        kind: "step",
        name: "Enter the lottery",
        says: "A validator makes an anonymous ticket: proof that it is one of the validators, without saying which.",
        lessons: [],
        elsewhere: "each validator, with its own Bandersnatch key",
      },
      tickets: {
        kind: "thing",
        name: "Tickets",
        says: "Lottery entries, each with an id and a ring proof checked against the epoch's ring root.",
        lessons: ["8.7", "8.8"],
      },
      lottery: {
        kind: "step",
        name: "Run the lottery",
        says: "Keep the best tickets, lowest ids first, at most one for each slot of an epoch, until the lottery closes.",
        lessons: ["8.4"],
      },
      seats: {
        kind: "step",
        name: "Z: seat the winners",
        says: "Outside in: the best ticket gets the first slot, the next best the last, and so on towards the middle. The block that closes a full lottery announces them in its header.",
        example: `[1, 2, 3, 4, 5] → [${outsideIn([1, 2, 3, 4, 5]).join(", ")}]`,
        lessons: ["8.4", "8.5"],
      },
      seal: {
        kind: "step",
        name: "Check every seal",
        says: "Each block is sealed by its slot's author, a winner or a fallback sealer. Check that the seal and the entropy source are really theirs.",
        example: "all 46 safrole vectors pass, whole",
        lessons: ["8.8", "8.9"],
      },
    },
  },
  {
    part: 9,
    rows: [["block"], ["append"], ["belt"], ["superpeak"], ["record"], ["recent"]],
    walk: ["block", "append", "belt", "superpeak", "record", "recent"],
    cards: {
      block: {
        kind: "thing",
        name: "A new block",
        says: "What the chain wants to remember of it: its header hash, the state root it builds on, the root of what it accumulated, its slot, and the work-packages it reported.",
        fields: ["header_hash", "parent_state_root", "accumulate_root", "slot", "work_packages"],
        record: "9.2 NewBlock",
        lessons: ["9.2"],
      },
      append: {
        kind: "step",
        name: "Append to the belt",
        says: "Add the block's accumulation root to the mountain belt. Like counting in binary, two mountains of one size merge into one of the next size, so a block costs only a handful of hashes.",
        example: "Keccak-256, Ethereum's hash, so bridges can read it",
        lessons: ["9.1"],
      },
      belt: {
        kind: "thing",
        name: "The mountain belt",
        says: "A list of Merkle roots, one for each power of two, with a gap where there's no mountain of that size.",
        lessons: ["9.1"],
      },
      superpeak: {
        kind: "step",
        name: "Fold it to a super-peak",
        says: "Hash the peaks together into one 32-byte hash for the whole belt.",
        lessons: ["9.1"],
      },
      record: {
        kind: "step",
        name: "Record the block",
        says: `Fill in the state root left blank for the block before, add this block, and keep only the last ${RECENT_BLOCKS}.`,
        example: `the last ${RECENT_BLOCKS} blocks`,
        lessons: ["9.2"],
      },
      recent: {
        kind: "thing",
        name: "Recent history",
        says: "The chain's short-term memory. Guarantors must anchor their work in one of these blocks, so it can't claim a chain that never was.",
        fields: ["header_hash", "beefy_root", "state_root", "slot", "reported"],
        record: "9.2 RecentBlock",
        lessons: ["9.2"],
      },
    },
  },
  {
    part: 10,
    rows: [["report"], ["vote"], ["verdict"], ["count"], ["outcome"], ["offenders", "clear"], ["refuse"]],
    walk: ["report", "vote", "verdict", "count", "outcome", "offenders", "clear", "refuse"],
    cards: {
      report: {
        kind: "thing",
        name: "A report under suspicion",
        says: "A work-report that guarantors vouched for, but that may be wrong.",
        lessons: ["10.1"],
      },
      vote: {
        kind: "step",
        name: "Judge it",
        says: "Validators check the work again, and each signs a vote: valid, or invalid.",
        lessons: [],
        elsewhere: "the validators, who redo the work to judge it",
      },
      verdict: {
        kind: "thing",
        name: "A verdict",
        says: "The report's hash and the judges' signed votes, brought to the chain in a block.",
        lessons: ["10.1"],
      },
      count: {
        kind: "step",
        name: "Check and count the votes",
        says: "Check each vote's signature against the right judges, and count the valid votes. Only three splits mean anything: all of them, none, or a third.",
        example: `tiny, ${V} judges: ${needed(V)}, 0 or ${V / 3} valid votes`,
        lessons: ["10.1"],
      },
      outcome: {
        kind: "thing",
        name: "Good, bad or wonky",
        says: "The verdict, filed in ψ for good. A report judged bad or wonky can never come back.",
        fields: ["good", "bad", "wonky", "offenders"],
        record: "10.1 PastJudgements",
        lessons: ["10.1"],
      },
      offenders: {
        kind: "step",
        name: "Name the offenders",
        says: "Culprits vouched for a bad report, and faults voted against the verdict. With their own signatures as evidence, their keys go into ψ_O and the header's offenders mark.",
        lessons: ["10.2"],
      },
      clear: {
        kind: "step",
        name: "Clear the cores",
        says: "A report judged bad or wonky comes off its core, before it can do any harm.",
        lessons: ["10.3"],
      },
      refuse: {
        kind: "step",
        name: "Refuse a broken trial",
        says: "A block whose verdicts, culprits or faults break any rule is refused whole: seven rules for verdicts, more for the accusations.",
        example: "all 60 disputes vectors pass, whole",
        lessons: ["10.4", "10.5"],
      },
    },
  },
  {
    part: 11,
    rows: [["waiting"], ["assure"], ["assurances"], ["count"], ["available", "timeout"], ["refuse"]],
    walk: ["waiting", "assure", "assurances", "count", "available", "timeout", "refuse"],
    cards: {
      waiting: {
        kind: "thing",
        name: "A report on its core",
        says: "Work that guarantors vouched for, its data cut into pieces and spread among the validators.",
        lessons: ["11.1"],
      },
      assure: {
        kind: "step",
        name: "Assure",
        says: "Each validator checks which cores' pieces it holds, and signs one bit for each core: 1 if it holds its piece.",
        lessons: [],
        elsewhere: "each validator, every block",
      },
      assurances: {
        kind: "thing",
        name: "Assurances",
        says: "Each one is a validator's bitfield and signature, made on top of the block's parent.",
        fields: ["anchor", "bitfield", "validator_index", "signature"],
        record: "4.2 Assurance",
        lessons: ["11.1"],
      },
      count: {
        kind: "step",
        name: "Count each core",
        says: "Count the validators that assure each core in this block. More than two thirds, and the report is available.",
        example: `tiny: ${needed(V)} of ${V}`,
        lessons: ["11.1"],
      },
      available: {
        kind: "thing",
        name: "An available report",
        says: "Its data is safe, so JAM can act on it: off the core, on to accumulation (Part 17).",
        lessons: ["11.1", "11.2"],
      },
      timeout: {
        kind: "step",
        name: "Time out",
        says: `A report that isn't available within U = ${AVAILABILITY_TIMEOUT} slots of reaching its core is dropped, and the core is free again.`,
        example: `registered at slot 7: out at slot ${7 + AVAILABILITY_TIMEOUT}`,
        lessons: ["11.2"],
      },
      refuse: {
        kind: "step",
        name: "Refuse bad assurances",
        says: "Five rules: anchored on the parent, from a real validator, one per validator in order, bits only for cores with something on them, and signed. Break one, and the block is refused.",
        example: "every assurances vector, tiny and full, passes whole",
        lessons: ["11.3"],
      },
    },
  },
  {
    part: 12,
    rows: [["validators"], ["deal"], ["assignment"], ["sign"], ["guarantee"], ["check"], ["reporters", "seat"], ["refuse"]],
    walk: ["validators", "deal", "assignment", "sign", "guarantee", "check", "reporters", "seat", "refuse"],
    cards: {
      validators: {
        kind: "thing",
        name: "The validators and the entropy",
        says: "This epoch's validators, and randomness nobody could steer, from Parts 7 and 8.",
        lessons: ["12.1"],
      },
      deal: {
        kind: "step",
        name: "Deal guarantors to cores",
        says: `Shuffle the validators with the entropy, three to a core. Every R slots, everyone moves on to the next core.`,
        example: `tiny: ${V} validators keep ${V / 3} cores, R = ${ROTATION_PERIOD.tiny} slots; full: R = ${ROTATION_PERIOD.full}`,
        lessons: ["12.1"],
      },
      assignment: {
        kind: "thing",
        name: "Who guarantees what",
        says: "For each validator, the core it may vouch for, in this rotation and in the last.",
        lessons: ["12.1"],
      },
      sign: {
        kind: "step",
        name: "Guarantee a report",
        says: "Two or three of a core's guarantors run a package and sign its report: Part 3's journey, on the network.",
        lessons: [],
        elsewhere: "the core's guarantors, on the network",
      },
      guarantee: {
        kind: "thing",
        name: "A guarantee",
        says: "A report and its guarantors' signatures, in a block's extrinsic.",
        lessons: ["12.2"],
      },
      check: {
        kind: "step",
        name: "Check the signatures",
        says: "Every signature must be real, every signer assigned to that core, and no offender's word is taken.",
        lessons: ["12.2"],
      },
      reporters: {
        kind: "thing",
        name: "The reporters",
        says: "Every validator who signed a guarantee in the block, each counted once, for the statistics in Part 18.",
        lessons: ["12.2"],
      },
      seat: {
        kind: "step",
        name: "Put reports on their cores",
        says: "Each good report takes its free core, and its package is noted for the recent history.",
        lessons: ["12.3"],
      },
      refuse: {
        kind: "step",
        name: "Refuse a bad guarantee",
        says: "Thirteen rules for the guarantees, fourteen for the reports inside them. Break one, and the block is refused whole.",
        example: "all 62 refusals in the reports vectors",
        lessons: ["12.4", "12.5"],
      },
    },
  },
  {
    part: 13,
    rows: [["queue", "used"], ["step"], ["pool"]],
    walk: ["queue", "used", "step", "pool"],
    cards: {
      queue: {
        kind: "thing",
        name: "A core's queue",
        says: `ϕ[c]: exactly ${QUEUE_SIZE} authorizer hashes, waiting their turn. Only a privileged service can change it.`,
        lessons: ["13.1"],
      },
      used: {
        kind: "thing",
        name: "The authorizers reports used",
        says: "Each report a block guarantees names the authorizer that let its package onto the core.",
        fields: ["core", "auth_hash"],
        record: "13.1 UsedAuthorizer",
        lessons: ["13.1"],
      },
      step: {
        kind: "step",
        name: "One in, one out",
        says: `Every block: take out the authorizer a report used, add the queue's entry for this slot, and keep the newest ${POOL_SIZE}.`,
        example: `slot 85 takes the queue's entry 85 mod ${QUEUE_SIZE} = ${85 % QUEUE_SIZE}`,
        lessons: ["13.1"],
      },
      pool: {
        kind: "thing",
        name: "A core's pool",
        says: `α[c]: at most ${POOL_SIZE} authorizers the core accepts right now. A report's authorizer must be in its core's pool (lesson 12.4 checks it).`,
        example: "kept moving on 99 real blocks",
        lessons: ["13.1"],
      },
    },
  },
  {
    part: 14,
    rows: [["request", "provide"], ["preimage"], ["check"], ["store"], ["account"], ["read"]],
    walk: ["request", "provide", "preimage", "check", "store", "account", "read"],
    cards: {
      request: {
        kind: "thing",
        name: "A request",
        says: "A service asks for some data by its hash and its length, and the state remembers the request.",
        lessons: ["14.1"],
      },
      provide: {
        kind: "step",
        name: "Bring the data",
        says: "Someone who has the data puts it in a block's preimages, from lesson 4.1.",
        lessons: [],
        elsewhere: "whoever has the data, in a block",
      },
      preimage: {
        kind: "thing",
        name: "A preimage",
        says: "The data itself, with the id of the service that asked for it.",
        lessons: ["14.1"],
      },
      check: {
        kind: "step",
        name: "Check it by its hash",
        says: "Its hash and length must match a request still open: asked for, and not yet provided.",
        lessons: ["14.1"],
      },
      store: {
        kind: "step",
        name: "Store it, and close the request",
        says: "File the data under its key, and mark the request done with this slot.",
        example: "the same as the real chain did, 67 times over",
        lessons: ["14.1"],
      },
      account: {
        kind: "thing",
        name: "A service account",
        says: "What the state keeps for each service: its code's hash, its balance, its gas minimums, and how much it stores.",
        fields: ["version", "code_hash", "balance", "min_item_gas", "min_memo_gas", "bytes", "deposit_offset", "items", "creation_slot", "last_accumulation_slot", "parent_service"],
        record: "14.2 ServiceInfo",
        lessons: ["14.2"],
      },
      read: {
        kind: "step",
        name: "Read it, and check it adds up",
        says: "Read any service's account from the state, and check that what it keeps matches its footprint, and that its balance covers the deposit.",
        lessons: ["14.2"],
      },
    },
  },
];

export const flowOf = (part: number): Flow | undefined => FLOWS.find((f) => f.part === part);
