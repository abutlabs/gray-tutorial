// Lesson 5.1's widget: H(x), Blake2b with a 32-byte output, and what one flipped input bit
// does to it. Lesson 5.2's widget hashes with the same H. tools/widget-hashes.test.ts checks
// it against the lesson's own known answer.

import { blake2b } from "@noble/hashes/blake2.js";
import { bitsOf, encodeFixed } from "./bytes.ts";
import { compact } from "./compact.ts";

/** H(x) (GP §3): Blake2b, asked for JAM's 32 bytes, as the client's src/hash.ts does. */
export const H = (bytes: number[]): number[] => Array.from(blake2b(Uint8Array.from(bytes), { dkLen: 32 }));

/** Bytes as a hex dump writes them: "c7 12". */
export const spaced = (bytes: number[]): string => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");

/** A byte's 8 bits, most significant first, as 0s and 1s. */
export const bitsOfByte = (byte: number): number[] => [...bitsOf(byte, 8)].map(Number);

/** Every bit of some bytes, most significant first: 32 bytes give 256. */
export const allBits = (bytes: number[]): number[] => bytes.flatMap(bitsOfByte);

/** The bytes with one bit flipped: bit 0 is the byte's most significant (its 128s). */
export function flipBit(bytes: number[], byte: number, bit: number): number[] {
  const out = [...bytes];
  out[byte] ^= 128 >> bit;
  return out;
}

/** Which bits differ between two byte strings of the same length, one flag per bit. */
export function changedBits(a: number[], b: number[]): boolean[] {
  if (a.length !== b.length) throw new RangeError(`${a.length} bytes against ${b.length}`);
  return a.flatMap((x, i) => bitsOfByte(x ^ b[i]).map((d) => d === 1));
}

/** How many bits differ between two byte strings of the same length. */
export const bitsChanged = (a: number[], b: number[]): number => changedBits(a, b).filter(Boolean).length;

/** How many input bits a change touched, or null when it changed the length. */
export const inputBitsChanged = (a: number[], b: number[]): number | null => (a.length === b.length ? bitsChanged(a, b) : null);

/** Hex as a reader types it ("c7 12", "0xc712", "C712"), or null if it isn't whole bytes. */
export function parseHex(text: string): number[] | null {
  const digits = text.trim().replace(/^0x/i, "").replace(/[\s,]+/g, "");
  if (digits.length % 2 || /[^0-9a-f]/i.test(digits)) return null;
  return (digits.match(/../g) ?? []).map((h) => parseInt(h, 16));
}

/** Text as its UTF-8 bytes. */
export const textBytes = (text: string): number[] => Array.from(new TextEncoder().encode(text));

/** The ways Part 2 writes a number: ℰ (compact), ℰ₄ (a u32), ℰ₈ (a u64). */
export type Encoding = "compact" | "u32" | "u64";
export const ENCODINGS: { id: Encoding; say: string }[] = [
  { id: "compact", say: "ℰ" },
  { id: "u32", say: "ℰ₄" },
  { id: "u64", say: "ℰ₈" },
];

/** A number's bytes in one of Part 2's encodings. */
export function encodeNumber(x: number, how: Encoding): number[] {
  if (how === "compact") return compact(BigInt(x)).bytes;
  return encodeFixed(BigInt(x), how === "u32" ? 4 : 8);
}

/** The biggest number all three encodings can write: ℰ₄'s 2^32 − 1. */
export const MAX_NUMBER = 2 ** 32 - 1;
