// Lesson 3.2's widget: a work result is output bytes or one of six errors, and Appendix C's
// O writes which with a tag in front; then a digest's five load numbers, as compact
// naturals. tools/widget-results-shards.test.ts checks it against the lesson's own code.

import { compact, MAX } from "./compact.ts";

/** The six ways refine can fail, in tag order 1 to 6, as the lesson's ERRORS list names them. */
export const ERRORS = ["out_of_gas", "panic", "bad_exports", "output_oversize", "bad_code", "code_oversize"] as const;
export type WorkError = (typeof ERRORS)[number];

/** What refine produced: its output, or why there is none. */
export type WorkResult = { ok: number[] } | { error: WorkError };

/** The lesson's plain names for the seven cases, by tag: 0 is success, 1 to 6 the errors. */
export const CASE_NAMES = ["ok", "out of gas", "panic", "bad exports", "oversize", "BAD", "BIG"] as const;

/** A result's tag: 0 for output, else the error's place in ERRORS plus one. */
export const tagOf = (r: WorkResult): number => ("ok" in r ? 0 : ERRORS.indexOf(r.error) + 1);

/** The result a tag stands for; the output only matters for tag 0. */
export const resultOf = (tag: number, output: number[]): WorkResult => (tag === 0 ? { ok: output } : { error: ERRORS[tag - 1] });

/** O(result), in its parts: the tag, then for output its length (a compact natural) and the bytes. */
export interface Encoded {
  tag: number[];
  length: number[]; // empty for an error
  output: number[]; // empty for an error
  bytes: number[]; // all of it, in order
}

export function encodeResult(r: WorkResult): Encoded {
  const tag = compact(BigInt(tagOf(r))).bytes;
  const length = "ok" in r ? compact(BigInt(r.ok.length)).bytes : [];
  const output = "ok" in r ? [...r.ok] : [];
  return { tag, length, output, bytes: [...tag, ...length, ...output] };
}

/** How the vectors' JSON writes a result: one key, named after the case. */
export const jsonOf = (r: WorkResult): string =>
  "ok" in r ? `{"ok": "0x${r.ok.map((b) => b.toString(16).padStart(2, "0")).join("")}"}` : `{"${r.error}": null}`;

/** Reads the compact natural ℰ(x) at `at` (the inverse of compact.ts's rule): the leading ones
 *  of the first byte count the bytes after it. Null when the bytes stop too soon. */
export function readCompact(bytes: number[], at: number): { value: bigint; next: number } | null {
  if (at >= bytes.length) return null;
  const first = bytes[at];
  let l = 0;
  while (l < 8 && first & (0x80 >> l)) l++;
  if (at + 1 + l > bytes.length) return null;
  let low = 0n;
  for (let i = l - 1; i >= 0; i--) low = (low << 8n) | BigInt(bytes[at + 1 + i]); // lowest byte first
  const top = l === 8 ? 0n : BigInt(first & ((1 << (7 - l)) - 1)); // the first byte's bits after the marker
  return { value: (top << BigInt(8 * l)) | low, next: at + 1 + l };
}

/** What decoding a byte string as a result finds: the case and how many bytes it took, or why not. */
export type Decoded =
  | { ok: true; tag: number; result: WorkResult; used: number; rest: number }
  | { ok: false; tag: bigint | null; why: string };

/** Decodes a result from the front of `bytes`, as the lesson's WorkResult codec does. */
export function decodeResult(bytes: number[]): Decoded {
  const tag = readCompact(bytes, 0);
  if (!tag) return { ok: false, tag: null, why: "no bytes, so no tag" };
  if (tag.value > 6n) return { ok: false, tag: tag.value, why: `no case has tag ${tag.value}: they go 0 to 6` };
  const t = Number(tag.value);
  if (t > 0) return { ok: true, tag: t, result: resultOf(t, []), used: tag.next, rest: bytes.length - tag.next };
  const length = readCompact(bytes, tag.next);
  if (!length) return { ok: false, tag: 0n, why: "tag 0 says output follows, but its length is missing" };
  const end = length.next + Number(length.value);
  if (end > bytes.length) {
    const have = bytes.length - length.next;
    return { ok: false, tag: 0n, why: `the length says ${length.value} bytes of output, but only ${have} follow` };
  }
  return { ok: true, tag: 0, result: { ok: bytes.slice(length.next, end) }, used: end, rest: bytes.length - end };
}

/** "0x0003aabbcc", "00 03 aa", or "0003AABBCC" as bytes; null if it isn't whole bytes of hex. */
export function parseHex(text: string): number[] | null {
  const digits = text.trim().replace(/^0x/i, "").replace(/\s+/g, "");
  if (!/^([0-9a-fA-F]{2})*$/.test(digits)) return null;
  return (digits.match(/../g) ?? []).map((h) => parseInt(h, 16));
}

/** The largest natural32 (the lesson's code keeps the four counts as JS numbers). */
export const MAX32 = 2n ** 32n - 1n;

/** The digest's load, in the order Appendix C writes it, with the lesson's field names. */
export const LOAD = [
  { field: "gas_used", say: "gas used", max: MAX },
  { field: "imports", say: "segments imported", max: MAX32 },
  { field: "extrinsic_count", say: "extrinsics read", max: MAX32 },
  { field: "extrinsic_size", say: "their total size", max: MAX32 },
  { field: "exports", say: "segments exported", max: MAX32 },
] as const;

/** Values a slider can step through, up to max: a few small ones, then each side of every
 *  length's edge (2^7k − 1 and 2^7k), so each step can add or keep a byte. */
export function stops(max: bigint): bigint[] {
  const all = [0n, 1n, 42n, 300n, 100_000n, max];
  for (let k = 1n; k <= 9n; k++) all.push((1n << (7n * k)) - 1n, 1n << (7n * k));
  return [...new Set(all.filter((x) => x <= max))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The slider position for a value: the last stop at or below it. */
export const stopIndex = (list: bigint[], x: bigint): number => list.findLastIndex((s) => s <= x);

/** The load's bytes: its five compact naturals, one after another. */
export const loadBytes = (values: bigint[]): number[] => values.flatMap((x) => compact(x).bytes);
