// Lesson 2.4's widget: one value, five codecs, five byte strings. The codec decides the
// bytes, not the value: ℰ₁, ℰ₂, ℰ₄ and ℰ₈ spend their width whatever the number, ℰ shrinks
// to fit, a blob carries its length and a hash does not. tools/widget-codec-picker.test.ts
// checks every byte string here against the lesson's tests and check questions.

import { encodeFixed, readNumber, spacedHex } from "./bytes.ts";
import { compact, MAX } from "./compact.ts";

/** The integer codecs lesson 2.4 writes, with the width each spends: null for ℰ, which fits. */
export const CODECS: { name: string; rule: string; width: number | null; says: string }[] = [
  { name: "u8", rule: "ℰ₁", width: 1, says: "one byte, whatever the number: 0 to 255" },
  { name: "u16", rule: "ℰ₂", width: 2, says: "two bytes, little end first: 0 to 65,535" },
  { name: "u32", rule: "ℰ₄", width: 4, says: "four bytes, little end first: timeslots, service ids" },
  { name: "u64", rule: "ℰ₈", width: 8, says: "eight bytes, however small the number: gas, balances" },
  { name: "natural", rule: "ℰ", width: null, says: "as few bytes as the number needs, a marker in front" },
];

/** The values the lesson's tests and check questions encode. */
export const PRESETS: bigint[] = [7n, 4807n, 16909060n, 42n, 128n, 16384n];

/** A value under a codec: its bytes, or null when the codec can't hold it. */
export function bytesUnder(name: string, x: bigint): number[] | null {
  const codec = CODECS.find((c) => c.name === name)!;
  if (codec.width === null) return x > MAX ? null : compact(x).bytes;
  return x >= 1n << BigInt(8 * codec.width) ? null : encodeFixed(x, codec.width);
}
/** The largest value a codec holds. */
export const limitOf = (name: string): bigint => {
  const w = CODECS.find((c) => c.name === name)!.width;
  return w === null ? MAX : (1n << BigInt(8 * w)) - 1n;
};
/** Bytes as the lesson's table writes them: "c7 12". */
export const dump = (bytes: number[] | null): string => (bytes === null ? "doesn't fit" : spacedHex(bytes));

/** The bytes the lesson's blob test uses, and how a blob and n fixed bytes each write them. */
export const FIVE: number[] = [1, 2, 3, 4, 5];
export const asBlob = (b: number[]): number[] => [...compact(BigInt(b.length)).bytes, ...b];
export const asFixedBytes = (b: number[]): number[] => [...b];
/** A hash: 32 bytes as they are, no length, since everyone knows it's 32. */
export const HASH_BYTES = 32;

/** A typed value, as bytes.ts reads the playground's: decimal, 0x… or 0b…; nothing for junk. */
export const parse = (text: string): bigint | undefined => {
  const r = readNumber(text.trim());
  return r && r.x >= 0n ? r.x : undefined;
};
