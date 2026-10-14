// Lesson 6.2's widget: the three recipes C that make every 31-byte state key (Gray Paper,
// Appendix D), each byte tagged with where it came from. tools/widget-trie.test.ts checks them
// against the keys lessons 6.1 and 6.2 print.

import { encodeFixed } from "./bytes.ts";

/** Where a key's byte came from: the leading byte (i, or 255 for an account), byte n_index of
 *  ℰ₄(s), byte a_index of the hash H(h), or a zero the recipe puts there. */
export type Source = { kind: "lead" | "n" | "a" | "zero"; index: number };
export type Cell = { byte: number; from: Source };

export const KEY_BYTES = 31;
/** C(s, h) uses the hash's bytes a₀ to a₂₆: 27 of its 32. */
export const HASH_BYTES_USED = 27;

const zeros = (count: number): Cell[] => Array.from({ length: count }, () => ({ byte: 0, from: { kind: "zero", index: 0 } }));
const service = (s: number): Cell[] => encodeFixed(BigInt(s), 4).map((byte, index) => ({ byte, from: { kind: "n", index } }));

/** C(i): the key of state component i. The byte i, then 30 zeros. */
export const componentKey = (i: number): Cell[] => [{ byte: i, from: { kind: "lead", index: 0 } }, ...zeros(KEY_BYTES - 1)];

/** C(255, s): the key of service s's account. 255, then ℰ₄(s) with a zero after each byte,
 *  then zeros. */
export function accountKey(s: number): Cell[] {
  const key: Cell[] = [{ byte: 255, from: { kind: "lead", index: 0 } }];
  for (const n of service(s)) key.push(n, ...zeros(1));
  return [...key, ...zeros(KEY_BYTES - key.length)];
}

/** C(s, h): the key of something service s keeps, given a = H(h). ℰ₄(s) takes turns with the
 *  hash's first four bytes, n₀ a₀ n₁ a₁ n₂ a₂ n₃ a₃, then a₄ to a₂₆ follow. */
export function wovenKey(s: number, a: number[]): Cell[] {
  if (a.length < HASH_BYTES_USED) throw new Error(`C(s, h) needs ${HASH_BYTES_USED} bytes of H(h)`);
  const hash: Cell[] = a.slice(0, HASH_BYTES_USED).map((byte, index) => ({ byte, from: { kind: "a", index } }));
  return [...service(s).flatMap((n, i) => [n, hash[i]]), ...hash.slice(4)];
}

/** 6.1's first woven key, 0x001f00d8…, is C(0, h) for a hash starting with these 27 bytes:
 *  a₀ to a₂₆, read back out of the key. */
export const LESSON_HASH = "1f d8 20 0f 54 ba ff 5d f8 25 4c d8 56 5b 0a e7 12 84 94 d2 75 95 b5 ff 15 c6 65";

/** A key's bytes alone. */
export const bytesOf = (key: Cell[]): number[] => key.map((c) => c.byte);

/** The state's 16 components, by i in C(i), with their Gray Paper letters: 6.2's table. */
export const COMPONENTS = [
  "",
  "α, the authorizer pool",
  "ϕ, the authorizer queue",
  "β, recent blocks",
  "γ, Safrole's state: the ticket lottery",
  "ψ, past judgements, from disputes",
  "η, entropy",
  "ι, the next validators",
  "κ, the validators",
  "λ, the previous validators",
  "ρ, reports awaiting availability",
  "τ, the time",
  "χ, privileged services",
  "π, statistics",
  "ω, reports ready to accumulate",
  "ξ, recently accumulated packages",
  "θ, the last accumulation outputs",
];

/** A whole number from what the reader typed, decimal or 0x hex, if it is at most max. */
export function parseNumber(text: string, max: number): number | null {
  const t = text.trim().replaceAll(",", "").replaceAll("_", "");
  if (!/^(\d+|0x[0-9a-f]+)$/i.test(t)) return null;
  const x = Number(t); // Number reads 0x hex too
  return Number.isSafeInteger(x) && x <= max ? x : null;
}

/** Hash bytes from typed hex (spaces and a 0x allowed), at most the 27 the key uses. */
export function parseHashBytes(text: string): number[] | null {
  const hex = text.trim().replace(/^0x/i, "").replaceAll(" ", "");
  if (!/^([0-9a-f]{2})*$/i.test(hex) || hex.length > 2 * HASH_BYTES_USED) return null;
  return Array.from({ length: hex.length / 2 }, (_, i) => parseInt(hex.slice(2 * i, 2 * i + 2), 16));
}

/** The typed hash bytes, with zeros standing in for any not typed, to make up 27. */
export const padHash = (typed: number[]): number[] => [...typed, ...Array<number>(Math.max(0, HASH_BYTES_USED - typed.length)).fill(0)];
