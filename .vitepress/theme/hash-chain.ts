// Lesson 5.1's widget: the first four blocks of the tiny fallback trace, held together by
// their hashes. Each header is encoded (lesson 4.6's codec, as header-map.ts spells it) and
// hashed (H, Blake2b-256), and the next block's parent must equal that hash. Flip a bit of
// a header and its hash is a stranger, so the link after it breaks; flip a bit of its
// parent field and the link before it breaks too. tools/widget-hash-chain.test.ts checks the
// headers against the vectors and the links against the lesson's chain.

import { encodeMapped, flatten } from "./codec-map.ts";
import type { Json } from "./codec-map.ts";
import { FALLBACK_HEADERS } from "./fallback-headers.ts";
import { HEADER } from "./header-map.ts";
import { H } from "./hash.ts";

/** A header's encoding, with where each field went. */
export const encodeHeader = (json: Json) => encodeMapped(HEADER, json);
/** The hash of a header's bytes: what the next block names as its parent. */
export const hashOf = (bytes: number[]): number[] => H(bytes);

/** The fields a reader can flip a bit in, and where each sits in the encoding. */
export type Spot = { field: string; byte: number; bit: number };
export const SPOTS: { field: string; says: string }[] = [
  { field: "parent", says: "the link to the block before" },
  { field: "slot", says: "when the block belongs" },
  { field: "entropy_source", says: "the author's VRF output" },
  { field: "seal", says: "the author's signature" },
];
/** The first byte of a field in a header's encoding. */
export function byteOf(json: Json, field: string): number {
  const node = flatten(encodeHeader(json).root).find((n) => n.path === field);
  if (!node) throw new Error(`no field ${field}`);
  return node.start;
}

/** The chain as the widget holds it: each block's bytes, as the vector has them or flipped. */
export type Block = { n: number; slot: number; bytes: number[]; flipped: Spot[] };
export const ORIGINAL: Block[] = FALLBACK_HEADERS.map((json, i) => ({
  n: i + 1,
  slot: (json as { slot: number }).slot,
  bytes: encodeHeader(json).bytes,
  flipped: [],
}));

/** The same chain with one bit flipped in block `n`'s `field`. */
export function flip(chain: Block[], n: number, field: string): Block[] {
  return chain.map((b) => {
    if (b.n !== n) return b;
    const byte = byteOf(FALLBACK_HEADERS[n - 1], field);
    const bytes = [...b.bytes];
    bytes[byte] ^= 1;
    return { ...b, bytes, flipped: [...b.flipped, { field, byte, bit: 0 }] };
  });
}

/** A block's parent field: its first 32 bytes. */
export const parentOf = (b: Block): number[] => b.bytes.slice(0, 32);
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
/** Whether block n + 1 still holds block n: its parent is block n's hash. */
export const linkHolds = (chain: Block[], n: number): boolean => same(parentOf(chain[n]), hashOf(chain[n - 1].bytes));
/** How many of the chain's links hold. */
export const linksHolding = (chain: Block[]): number => chain.slice(1).filter((_, i) => linkHolds(chain, i + 1)).length;
/** A hash, short: its first four bytes. */
export const short = (bytes: number[]): string => `0x${bytes.slice(0, 4).map((b) => b.toString(16).padStart(2, "0")).join("")}…`;
