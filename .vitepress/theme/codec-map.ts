// The encoder the byte-map widgets share (lessons 2.6 and 4.6): it writes a vector's JSON by
// its type with Appendix C's rules, and the same walk records which bytes each part became,
// so a map of the bytes can't be faked. vector-map.ts and header-map.ts build on it.

import { encodeFixed } from "./bytes.ts";
import { compact } from "./compact.ts";

/** A part's type, as the lessons' codecs spell it: a fixed-width number; a compact natural;
 *  a 32-byte hash or n bytes as they are; a blob; a work result (O: tag 0 + blob, or an
 *  error's tag); a list (with its count in front, or exactly n with none); a maybe (¿x);
 *  or a record's fields in order. */
export type Type =
  | "u8" | "u16" | "u32" | "u64" | "natural" | "hash" | "blob" | "result"
  | { bytes: number }
  | { seq: Type }
  | { seqN: Type; n: number }
  | { option: Type }
  | { record: [string, Type][] };

/** The vectors' JSON for a value: numbers, "0x..." strings, lists, objects, null for nothing. */
export type Json = number | string | null | Json[] | { [field: string]: Json };

/** A value in the map: where its bytes start and end (end not included), and its parts. */
export interface Node {
  path: string; // "import_segments[2].index"; "" for the whole value
  type: Type;
  json: Json;
  start: number;
  end: number;
  tag: number; // a maybe's discriminator in front (¿x), or a result's tag (O): 1 byte; else 0
  prefix: number; // bytes of length or count after the tag: a blob's or a sequence's, else 0
  children: Node[];
}

/** The six ways refine can fail, in tag order 1 to 6 (lesson 3.2's ERRORS). */
export const ERRORS = ["out_of_gas", "panic", "bad_exports", "output_oversize", "bad_code", "code_oversize"];

/** The fixed-width numbers' byte counts: ℰ₁, ℰ₂, ℰ₄, ℰ₈. */
export const WIDTH = { u8: 1, u16: 2, u32: 4, u64: 8 } as const;
/** Whether a type is a fixed-width number, written least significant byte first. */
export const isNumber = (t: Type): t is keyof typeof WIDTH => typeof t === "string" && t in WIDTH;

/** "0x0102" → [1, 2]. */
export const fromHex = (hex: string): number[] => (hex.slice(2).match(/../g) ?? []).map((h) => parseInt(h, 16));

/** Bytes as a hex dump writes them: "04 03 02 01". */
export const spaced = (bytes: number[]): string => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");

/** Long runs of bytes, shortened as the lessons' diagrams do: "70 a5 08 29 … 9e 53 2e". */
export const short = (bytes: number[]): string =>
  bytes.length <= 8 ? spaced(bytes) : `${spaced(bytes.slice(0, 4))} … ${spaced(bytes.slice(-3))}`;

/** Encodes a value onto `out` and returns where each of its parts went. */
function encodeInto(type: Type, json: Json, path: string, out: number[]): Node {
  const start = out.length;
  const node = (prefix: number, children: Node[] = []): Node => ({ path, type, json, start, end: out.length, tag: 0, prefix, children });
  const at = (i: number | string) => (typeof i === "number" ? `${path}[${i}]` : path ? `${path}.${i}` : i);
  if (isNumber(type)) {
    out.push(...encodeFixed(BigInt(json as number), WIDTH[type])); // ℰ_l: least significant first
    return node(0);
  }
  if (type === "natural") {
    out.push(...compact(BigInt(json as number)).bytes); // a compact natural: as many bytes as it needs
    return node(0);
  }
  if (type === "hash") {
    out.push(...fromHex(json as string)); // 32 bytes, as they are
    return node(0);
  }
  if (type === "result") {
    const [name, value] = Object.entries(json as { [field: string]: Json })[0]; // {"ok": "0x…"} or {"panic": null}
    if (name === "ok") {
      out.push(0); // O: the tag 0, then the output as a blob
      const bytes = fromHex(value as string);
      const length = compact(BigInt(bytes.length)).bytes;
      out.push(...length, ...bytes);
      return { ...node(length.length), tag: 1 };
    }
    out.push(ERRORS.indexOf(name) + 1); // O: an error is its tag, 1 to 6, and nothing more
    return { ...node(0), tag: 1 };
  }
  if (type === "blob") {
    const bytes = fromHex(json as string);
    const length = compact(BigInt(bytes.length)).bytes; // ↕: its length first, a compact natural
    out.push(...length, ...bytes);
    return node(length.length);
  }
  if ("bytes" in type) {
    const bytes = fromHex(json as string);
    if (bytes.length !== type.bytes) throw new RangeError(`${path}: ${bytes.length} bytes, not ${type.bytes}`);
    out.push(...bytes); // a fixed size, as they are: no length
    return node(0);
  }
  if ("option" in type) {
    if (json === null) {
      out.push(0); // ¿x: nothing is the byte 0, and that's all
      return { ...node(0), tag: 1 };
    }
    out.push(1); // ¿x: the byte 1, then the value
    const value = encodeInto(type.option, json, path, out);
    return { ...value, type, start, tag: 1 };
  }
  if ("seq" in type) {
    const items = json as Json[];
    const count = compact(BigInt(items.length)).bytes; // how many, a compact natural
    out.push(...count);
    const children = items.map((item, i) => encodeInto(type.seq, item, at(i), out));
    return node(count.length, children);
  }
  if ("seqN" in type) {
    const items = json as Json[];
    if (items.length !== type.n) throw new RangeError(`${path}: ${items.length} items, not exactly ${type.n}`);
    const children = items.map((item, i) => encodeInto(type.seqN, item, at(i), out)); // no count: everyone knows n
    return node(0, children);
  }
  const fields = json as { [field: string]: Json };
  const children = type.record.map(([name, t]) => encodeInto(t, fields[name], at(name), out));
  return node(0, children); // a record: its fields in order, nothing between
}

/** A value's encoding and the map of it. */
export function encodeMapped(type: Type, json: Json): { bytes: number[]; root: Node } {
  const out: number[] = [];
  const root = encodeInto(type, json, "", out);
  return { bytes: out, root };
}

/** Every node under (and including) root, in byte order. */
export const flatten = (root: Node): Node[] => [root, ...root.children.flatMap(flatten)];

/** A run of bytes one node owns outright: a maybe's tag, a length or count, or a value. */
export interface Piece { start: number; end: number; path: string; role: "tag" | "length" | "value" }

/** The bytes cut into pieces that tile them: tags, lengths and counts, and each part's value. */
export function pieces(root: Node): Piece[] {
  const own: Piece[] = [];
  const body = root.start + root.tag + root.prefix;
  if (root.tag) own.push({ start: root.start, end: root.start + root.tag, path: root.path, role: "tag" });
  if (root.prefix) own.push({ start: root.start + root.tag, end: body, path: root.path, role: "length" });
  if (root.children.length) return [...own, ...root.children.flatMap(pieces)];
  if (root.end > body) own.push({ start: body, end: root.end, path: root.path, role: "value" });
  return own;
}

/** The path of the node a byte belongs to: a tag or count byte belongs to its maybe or list. */
export function ownerOf(root: Node, byte: number): string | null {
  return pieces(root).find((p) => p.start <= byte && byte < p.end)?.path ?? null;
}

const fmt = (n: number | bigint) => n.toLocaleString("en-US");
const SUB = "₀₁₂₃₄₅₆₇₈₉";

/** A fixed-width number's rule: ℰ₄ for a u32. */
export const numberRule = (t: keyof typeof WIDTH): string => `ℰ${SUB[WIDTH[t]]}`;

/** What a number's ℰ_l writes, in words, on its real value. */
export function numberSay(node: Node, bytes: number[]): string {
  const t = node.type as keyof typeof WIDTH;
  const v = BigInt(node.json as number);
  const digits = v.toString(16);
  const hex = v >= 10n ? ` = 0x${digits.padStart(digits.length + (digits.length % 2), "0")}` : "";
  const used = Math.ceil(digits.length / 2);
  const fill = v === 0n ? (WIDTH[t] > 1 ? ", all zeros" : "") : used < WIDTH[t] ? ", zeros to fill" : "";
  const size = WIDTH[t] === 1 ? "1 byte" : `${WIDTH[t]} bytes, least significant first`;
  return `${node.path} = ${fmt(v)}${hex}, a ${t} (${numberRule(t)}): ${size}${fill} → ${spaced(bytes)}`;
}
