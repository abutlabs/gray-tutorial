// Lesson 4.6's widget: the two tiny header vectors, field by field, in the order Appendix C
// encodes them. The bytes are made here by codec-map.ts's encoder from the vectors' values,
// so the map of which bytes each field became can't be faked: a missing maybe is one byte 00,
// a present one 01 and then its value, and the tickets mark is exactly E tickets with no
// count in front. tools/widget-header-map.test.ts checks it against lessons 4.5 and 4.6.

import { encodeMapped, flatten, isNumber, numberRule, numberSay, pieces, short, spaced } from "./codec-map.ts";
import type { Json, Node, Piece, Type } from "./codec-map.ts";

/** E, tiny's epoch length: the tickets mark holds exactly this many tickets. */
export const E = 12;

/** EpochMarkValidatorKeys, EpochMark, TicketBody and Header, field by field, as lesson 4.6's
 *  codec writes them (Appendix C's order). */
export const VALIDATOR_KEYS: Type = { record: [["bandersnatch", { bytes: 32 }], ["ed25519", { bytes: 32 }]] };
export const EPOCH_MARK: Type = { record: [["entropy", "hash"], ["tickets_entropy", "hash"], ["validators", { seq: VALIDATOR_KEYS }]] };
export const TICKET_BODY: Type = { record: [["id", "hash"], ["attempt", "u8"]] };
export const HEADER: Type = {
  record: [
    ["parent", "hash"],
    ["parent_state_root", "hash"],
    ["extrinsic_hash", "hash"],
    ["slot", "u32"],
    ["epoch_mark", { option: EPOCH_MARK }],
    ["tickets_mark", { option: { seqN: TICKET_BODY, n: E } }],
    ["author_index", "u16"],
    ["entropy_source", { bytes: 96 }],
    ["offenders_mark", { seq: { bytes: 32 } }],
    ["seal", { bytes: 96 }],
  ],
};

/** The same ten fields in the order §5's definition of the header lists them. */
export const SECTION_5 = [
  "parent", "parent_state_root", "extrinsic_hash", "slot", "epoch_mark", "tickets_mark",
  "offenders_mark", "author_index", "entropy_source", "seal",
];

/** Appendix C's order: the header's fields as the bytes hold them. */
export const APPENDIX_C = (HEADER as { record: [string, Type][] }).record.map(([name]) => name);

// codec/tiny/header_0.json and header_1.json. They share every field but the three marks.
const SHARED = {
  parent: "0x5c743dbc514284b2ea57798787c5a155ef9d7ac1e9499ec65910a7a3d65897b7",
  parent_state_root: "0x2591ebd047489f1006361a4254731466a946174af02fe1d86681d254cfd4a00b",
  extrinsic_hash: "0x74a9e79d2618e0ce8720ff61811b10e045c02224a09299f04e404a9656e85c81",
  slot: 42,
  author_index: 3,
  entropy_source:
    "0xae85d6635e9ae539d0846b911ec86a27fe000f619b78bcac8a74b77e36f6dbcf49a52360f74a0233cea0775356ab0512fafff0683df08fae3cb848122e296cbc50fed22418ea55f19e55b3c75eb8b0ec71dcae0d79823d39920bf8d6a2256c5f",
  seal:
    "0x31dc5b1e9423eccff9bccd6549eae8034162158000d5be9339919cc03d14046e6431c14cbb172b3aed702b9e9869904b1f39a6fe1f3e904b0fd536f13e8cac496682e1c81898e88e604904fa7c3e496f9a8771ef1102cc29d567c4aad283f7b0",
};

/** header_0's epoch mark validators: [bandersnatch, ed25519]. */
const VALIDATORS = [
  ["0xff71c6c03ff88adb5ed52c9681de1629a54e702fc14729f6b50d2f0a76f185b3", "0x4418fb8c85bb3985394a8c2756d3643457ce614546202a2f50b093d762499ace"],
  ["0xdee6d555b82024f1ccf8a1e37e60fa60fd40b1958c4bb3006af78647950e1b91", "0xad93247bd01307550ec7acd757ce6fb805fcf73db364063265b30a949e90d933"],
  ["0x9326edb21e5541717fde24ec085000b28709847b8aab1ac51f84e94b37ca1b66", "0xcab2b9ff25c2410fbe9b8a717abb298c716a03983c98ceb4def2087500b8e341"],
  ["0x0746846d17469fb2f95ef365efcab9f4e22fa1feb53111c995376be8019981cc", "0xf30aa5444688b3cab47697b37d5cac5707bb3289e986b19b17db437206931a8d"],
  ["0x151e5c8fe2b9d8a606966a79edd2f9e5db47e83947ce368ccba53bf6ba20a40b", "0x8b8c5d436f92ecf605421e873a99ec528761eb52a88a2f9a057b3b3003e6f32a"],
  ["0x2105650944fcd101621fd5bb3124c9fd191d114b7ad936c1d79d734f9f21392e", "0xab0084d01534b31c1dd87c81645fd762482a90027754041ca1b56133d0466c06"],
];

/** header_1's tickets mark: [id, attempt], one per slot of the next epoch. */
const TICKETS: [string, number][] = [
  ["0x8c25c063c631c0d4cd0206159b3495deb761cc057e06192fe5497dc9b3744c7b", 0],
  ["0x2f24ea5c5cfc5631ea3b7799222ca555250b8591751fd1d59df4abeb690d66e6", 1],
  ["0x036479afe8e29f97741a1e3c2b59c217dc67d8a25f7ce12bf1febf6b4a5b2646", 2],
  ["0xa8a439a4aa6e18682c6a524feb2da2ebcead6f0fb0826707aef7b1d57e790e6e", 3],
  ["0x4fc10511323e4b3b82cf10ece1a1f6b8497dbdd9de032e6c6986d57303c31364", 0],
  ["0xd5ca7a57adaffc68011b46ec02ff8baad3f1539068f642b6af2cfcaca639d96e", 1],
  ["0x3ec31eb46e471951d21febf6a2842b8482b2ea40a61b37c4cbd4f136ef31d24f", 2],
  ["0xb5a35c5c1473de918f517142bacb78a968fcdd65fb5e935b2cfaf52c840cc3ad", 3],
  ["0x3559f53a0ad2e4462b2d1805ac28a665e2181fdc27e5acc6561fd6e713e7d498", 0],
  ["0x5ed4423732dbeb794c7a05fc899718a093ad9c832a1d3a89f34f525e55b87f53", 1],
  ["0xfdee093e7fd5cace92b7eb9f41d3ee7154aabcf84b797a6eb2e951ae11ed921c", 2],
  ["0xabf4869d2585e777feb713a7fd79ea49dbea2ca3eeb5e081c63ece4d6208c68c", 3],
];

/** header_0: an epoch mark, no tickets mark, one offender (validator 0's Ed25519 key). */
export const HEADER_0_JSON = {
  ...SHARED,
  epoch_mark: {
    entropy: "0xae85d6635e9ae539d0846b911ec86a27fe000f619b78bcac8a74b77e36f6dbcf",
    tickets_entropy: "0x333a7e328f0c4183f4b947e1d8f68aa4034f762e5ecdb5a7f6fbf0afea2fd8cd",
    validators: VALIDATORS.map(([bandersnatch, ed25519]) => ({ bandersnatch, ed25519 })),
  },
  tickets_mark: null,
  offenders_mark: [VALIDATORS[0][1]],
};

/** header_1: no epoch mark, a tickets mark, no offenders. */
export const HEADER_1_JSON = {
  ...SHARED,
  epoch_mark: null,
  tickets_mark: TICKETS.map(([id, attempt]) => ({ id, attempt })),
  offenders_mark: [],
};

/** A header vector, encoded and mapped. */
export interface Vector { name: string; has: string; bytes: number[]; root: Node }
const vector = (name: string, has: string, json: Json): Vector => ({ name, has, ...encodeMapped(HEADER, json) });
export const HEADERS: Vector[] = [
  vector("header_0", "an epoch mark", HEADER_0_JSON),
  vector("header_1", "a tickets mark", HEADER_1_JSON),
];

/** A header's parts by path: "slot", "epoch_mark.validators[2].ed25519", "tickets_mark[11]". */
export const nodesOf = (v: Vector): Map<string, Node> => new Map(flatten(v.root).filter((n) => n.path).map((n) => [n.path, n]));

/** The part a path names, or its nearest ancestor that this header has: a ticket's path, in a
 *  header with no tickets mark, falls back to "tickets_mark". */
export function nearest(nodes: Map<string, Node>, path: string): Node {
  for (let p = path; p; p = p.replace(/(\.[^.[\]]+|\[\d+\])$/, "")) {
    const n = nodes.get(p);
    if (n) return n;
    if (!/[.[]/.test(p)) break;
  }
  return nodes.get(APPENDIX_C[0])!;
}

/** The top-level field a part is in: "tickets_mark[3].id" → "tickets_mark". */
export const fieldOf = (path: string): string => path.split(/[.[]/)[0];

/** Whether a node is a maybe (¿x) with nothing in it. */
export const isMissing = (n: Node): boolean => n.tag > 0 && n.json === null;

/** A part's rule, short, for the readout. */
export function ruleOf(n: Node): string {
  const t = n.type;
  if (isNumber(t)) return numberRule(t);
  if (t === "hash" || t === "blob" || "bytes" in t) return t === "blob" ? "length + bytes" : "as is";
  if ("option" in t) {
    if (n.json === null) return "¿x: nothing → 00";
    const v = t.option;
    return typeof v === "object" && "seqN" in v ? `¿x: 01 + exactly ${v.n}` : "¿x: 01 + value";
  }
  if ("seq" in t) return "count + items";
  if ("seqN" in t) return `exactly ${t.n}, no count`;
  return "fields in order";
}

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

/** Where §5 and Appendix C disagree about a field's place, in words; "" where they agree. */
export function orderNote(name: string): string {
  const s = SECTION_5.indexOf(name);
  const a = APPENDIX_C.indexOf(name);
  if (s < 0 || s === a) return "";
  const s5 = s < SECTION_5.length - 1 ? `, before ${SECTION_5[s + 1]}` : "";
  const ac = a > 0 ? `, after ${APPENDIX_C[a - 1]}` : "";
  return ` §5 lists it ${ORDINAL[s]}${s5}; Appendix C writes it ${ORDINAL[a]}${ac}. The bytes follow Appendix C.`;
}

const nameOf = (path: string) => path.replace(/^.*[.[]/, "").replace(/\]$/, "");

/** A record's fields, in words, for a line about a list of them. */
function fieldsSay(t: Type): string {
  if (typeof t !== "object" || !("record" in t)) return "";
  return t.record.map(([name, ft]) => (isNumber(ft) ? `its ${name} as a ${ft} (${numberRule(ft)})` : `its ${sizeOf(ft)}-byte ${name}`)).join(", then ");
}

/** A fixed size's byte count: a hash's 32, or n bytes. */
const sizeOf = (t: Type): number => (t === "hash" ? 32 : typeof t === "object" && "bytes" in t ? t.bytes : 0);

/** What a fixed-size field holds, in words, by name. */
const WHAT: Record<string, string> = {
  parent: "the parent block's header hash",
  parent_state_root: "the state root after the parent block",
  extrinsic_hash: "the hash committing to this block's extrinsic",
  entropy_source: "a VRF signature, verifiable fresh randomness",
  seal: "the author's signature over everything before it, and the last field",
  entropy: "fresh randomness for the epoch ahead",
  tickets_entropy: "the randomness the next ticket lottery uses",
  bandersnatch: "a Bandersnatch key, for sealing blocks and the lottery",
  ed25519: "an Ed25519 key, for signing everything else",
  id: "the ticket's id",
};

/** The line that says how a part became its bytes, on the real values. */
export function explain(n: Node, bytes: number[]): string {
  const own = bytes.slice(n.start, n.end);
  const t = n.type;
  const top = !/[.[]/.test(n.path);
  const order = top ? orderNote(n.path) : "";
  if (isNumber(t)) return numberSay(n, own) + "." + order;
  const size = sizeOf(t);
  if (size) {
    const what = WHAT[nameOf(n.path)] ?? (fieldOf(n.path) === "offenders_mark" ? "the Ed25519 key of a validator this block convicts" : "");
    return `${n.path}: ${what}. ${size} bytes, written as they are: the size never changes, so no length → ${short(own)}.${order}`;
  }
  if (typeof t === "string") throw new TypeError(`${n.path}: a header has no ${t}`);
  if ("option" in t) {
    if (n.json === null) {
      return n.path === "epoch_mark"
        ? `epoch_mark: nothing (null): not an epoch's first block. ¿x writes just the tag 0 → 00. The whole field is one byte.${order}`
        : `${n.path}: nothing (null): no lottery closed at this block. ¿x writes just the tag 0 → 00. The whole field is one byte.${order}`;
    }
    const v = t.option;
    if (typeof v === "object" && "seqN" in v) {
      const each = n.children[0].end - n.children[0].start;
      return `${n.path}: there, so ¿x writes the tag 1 → 01, then exactly E = ${v.n} tickets, one per slot of the next epoch, with no count in front: both sides know E. Each is ${fieldsSay(v.seqN)}. 1 + ${v.n} × ${each} = ${own.length} bytes.${order}`;
    }
    const parts = n.children.map((c) => `${nameOf(c.path)} (${c.end - c.start})`).join(", ");
    const counted = n.children.filter((c) => c.prefix).map((c) => ` ${nameOf(c.path)} starts with its count → ${spaced(bytes.slice(c.start, c.start + c.prefix))}.`).join("");
    return `${n.path}: there, so ¿x writes the tag 1 → 01, then the value, its fields in order: ${parts}.${counted} 1 + ${n.children.map((c) => c.end - c.start).join(" + ")} = ${own.length} bytes.${order}`;
  }
  if ("seq" in t) {
    const k = n.children.length;
    const count = spaced(own.slice(0, n.prefix));
    if (k === 0) {
      return `${n.path}: an empty list, so just its count 0 → ${count}. The same byte as a missing maybe's tag, but this is a count: the list is there, with nothing in it.${order}`;
    }
    const each = n.children[0].end - n.children[0].start;
    const items = typeof t.seq === "object" && "record" in t.seq ? fieldsSay(t.seq) : `its ${each} bytes`;
    const why = n.path === "epoch_mark.validators"
      ? " Gray Paper 0.8.0 lets the validator count change, so the list says how long it is."
      : fieldOf(n.path) === "offenders_mark" ? ` This ${count} is a count, not a tag: a list says how many.` : "";
    return `${n.path}: ${k} of them, so first the count ${k} as a compact natural → ${count}.${why} Then each: ${items}. ${n.prefix} + ${k} × ${each} = ${own.length} bytes.${order}`;
  }
  // a record inside a list: a ticket, or a validator's keys
  const parts = n.children.map((c) =>
    isNumber(c.type) ? `${nameOf(c.path)} ${c.json} as a ${c.type} (${numberRule(c.type)}) → ${spaced(bytes.slice(c.start, c.end))}` : `${nameOf(c.path)}'s ${c.end - c.start} bytes`,
  );
  return `${n.path}: its fields in order, nothing between: ${parts.join(", then ")}. Every one is ${own.length} bytes, so no length.`;
}

/** The colour of each byte: a maybe's tag, a list's count, or a value (blue and green in turn). */
export type Shade = "tag" | "count" | "top" | "low";
export function shades(root: Node): Shade[] {
  const out: Shade[] = [];
  let k = 0;
  for (const p of pieces(root)) {
    const shade: Shade = p.role === "tag" ? "tag" : p.role === "length" ? "count" : k++ % 2 === 0 ? "top" : "low";
    for (let i = p.start; i < p.end; i++) out.push(shade);
  }
  return out;
}

/** Long values fold, as `short` writes them: their first 4 bytes, a tap for the rest, the last 3. */
export const FOLD = { over: 8, head: 4, tail: 3 };

/** What a field's strip shows: a byte, or a fold standing for the bytes start to end. */
export type Cell = { kind: "byte"; i: number } | { kind: "fold"; start: number; end: number; piece: number };

/** A field's bytes as cells, every byte either shown or counted in a fold. A value longer than
 *  FOLD.over folds unless `open` says to show it (by its first byte). */
export function cellsOf(root: Node, field: Node, open: (piece: number) => boolean): Cell[] {
  const out: Cell[] = [];
  const show = (a: number, b: number) => { for (let i = a; i < b; i++) out.push({ kind: "byte", i }); };
  for (const p of pieces(root).filter((p: Piece) => field.start <= p.start && p.end <= field.end)) {
    if (p.role !== "value" || p.end - p.start <= FOLD.over || open(p.start)) {
      show(p.start, p.end);
      continue;
    }
    show(p.start, p.start + FOLD.head);
    out.push({ kind: "fold", start: p.start + FOLD.head, end: p.end - FOLD.tail, piece: p.start });
    show(p.end - FOLD.tail, p.end);
  }
  return out;
}

/** The goals a reader's tap reaches: a field that's one byte because it's missing, a list with
 *  no length in front, the field §5 and Appendix C place differently around the author index,
 *  and the 2-byte field. */
export function goalsOf(n: Node): string[] {
  const out: string[] = [];
  if (isMissing(n)) out.push("missing");
  const t = n.type;
  if (n.json !== null && typeof t === "object" && "option" in t && typeof t.option === "object" && "seqN" in t.option) out.push("no-length");
  if (fieldOf(n.path) === "offenders_mark") out.push("order");
  if (isNumber(t) && n.end - n.start === 2) out.push("two");
  return out;
}

/** A field's value, short, for its button. */
export function valueOf(n: Node): string {
  if (n.json === null) return "null";
  if (Array.isArray(n.json)) return `${n.json.length} item${n.json.length === 1 ? "" : "s"}`;
  if (typeof n.json === "object") return "{…}";
  if (typeof n.json === "string") return n.json.length > 14 ? `${n.json.slice(0, 6)}…${n.json.slice(-4)}` : n.json;
  return String(n.json);
}

/** The parts from a top-level field down to the part a path names, outermost first:
 *  "tickets_mark[3].id" → tickets_mark, tickets_mark[3], tickets_mark[3].id. */
export function chainOf(root: Node, path: string): Node[] {
  const within = (n: Node) => path === n.path || path.startsWith(`${n.path}.`) || path.startsWith(`${n.path}[`);
  const out: Node[] = [];
  for (let n = root.children.find(within); n; n = n.children.find(within)) out.push(n);
  return out;
}
