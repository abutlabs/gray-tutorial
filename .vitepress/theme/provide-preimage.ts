// Lesson 14.1's widget: a block hands preimages over. A preimage is welcome only if its
// service has a request under requestKey(s, H(data), length) whose history is []; then the
// data is stored and the history becomes [τ′]. The block is the preimages trace's block 8,
// as the lesson's run prints it, plus two preimages the rule skips.
// tools/widget-provide-preimage.test.ts checks every line against the lesson's run, tests
// and check questions.

import { encodeFixed, spacedHex } from "./bytes.ts";
import { compact } from "./compact.ts";

export const SLOT = 8;
export type Preimage = { service: number; bytes: number; hash: string; history: number[] | null };
/** Block 8's four preimages, each with a request still waiting; then two the rule skips. */
export const PREIMAGES: Preimage[] = [
  { service: 0, bytes: 143, hash: "0x6ae18b8b…", history: [] },
  { service: 0, bytes: 3, hash: "0xd0c7d4d8…", history: [] },
  { service: 0, bytes: 84, hash: "0x70e9dc78…", history: [] },
  { service: 0, bytes: 223, hash: "0x35c3078c…", history: [] },
  { service: 0, bytes: 16, hash: "0xaaaa0001…", history: [5] },
  { service: 7, bytes: 16, hash: "0xaaaa0002…", history: null },
];
/** The request's key, as lesson 6.2's recipe takes it: the service, the data's hash, its length. */
export const keyOf = (p: Preimage): string => `requestKey(${p.service}, ${p.hash}, ${p.bytes})`;
/** What I does with a preimage: provided, or skipped and why. */
export function provide(p: Preimage): { provided: boolean; after: number[] | null; why: string } {
  if (p.history === null) return { provided: false, after: null, why: "no request under that key: never asked for, so skipped" };
  if (p.history.length !== 0) return { provided: false, after: p.history, why: `the request isn't waiting: its history is [${p.history.join(", ")}], so skipped` };
  return { provided: true, after: [SLOT], why: `stored under preimageKey(${p.service}, data), and the request marked [${SLOT}]` };
}
/** A history as the state encodes it: its count, then each slot as a u32. */
export const historyBytes = (h: number[]): string => spacedHex([...compact(BigInt(h.length)).bytes, ...h.flatMap((s) => encodeFixed(BigInt(s), 4))]);
/** The lesson's table of what a history means. */
export const MEANS = (h: number[]): string =>
  h.length === 0 ? "asked for, still waiting" : h.length === 1 ? `provided at slot ${h[0]}` : h.length === 2 ? `provided at ${h[0]}, forgotten at ${h[1]}` : `available again from ${h[2]}, after ${h[0]} until ${h[1]}`;
