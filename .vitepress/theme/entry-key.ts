// Lesson 19.3's widget: where a service keeps each kind of entry. A marker in front says the
// kind (2^32 − 1 for storage, 2^32 − 2 for a preimage, the length l for a request); the
// marker and the key are hashed together, and the owner's id is woven into bytes 0, 2, 4, 6
// of the 31-byte state key (lesson 6.2's C(s, h)). A request's value is its history: the
// count, then each slot in 4 bytes. tools/widget-entry-key.test.ts checks it against the
// lessons' code and checks.

import { encodeFixed } from "./bytes.ts";
import { H } from "./hash.ts";
import { wovenKey } from "./state-keys.ts";
import type { Cell } from "./state-keys.ts";

export type Kind = "storage" | "preimage" | "request";
export const MARKER: Record<Kind, (l: number) => number> = { storage: () => 2 ** 32 - 1, preimage: () => 2 ** 32 - 2, request: (l) => l };
export const KEYS: Record<Kind, { label: string; bytes: number[] }> = {
  storage: { label: '"hello", the storage key', bytes: [...new TextEncoder().encode("hello")] },
  preimage: { label: "h, a preimage's hash (32 bytes of 05)", bytes: Array(32).fill(5) },
  request: { label: "h, the hash asked for (32 bytes of 05)", bytes: Array(32).fill(5) },
};
/** The marker's 4 bytes, then what follows: what C(s, …) hashes. */
export const markedOf = (kind: Kind, l: number): number[] => [...encodeFixed(BigInt(MARKER[kind](l)), 4), ...KEYS[kind].bytes];
export const keyOf = (kind: Kind, s: number, l = 8): Cell[] => wovenKey(s, H(markedOf(kind, l)));
/** A request's value: the count, then each slot in 4 bytes, low byte first. */
export const historyBytes = (slots: number[]): number[] => [slots.length, ...slots.flatMap((t) => encodeFixed(BigInt(t), 4))];
export const hx = (b: number): string => b.toString(16).padStart(2, "0");
