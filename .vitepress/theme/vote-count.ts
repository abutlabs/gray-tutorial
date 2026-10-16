// Lesson 4.4's widget: how many votes a verdict carries, ⌊2V/3⌋ + 1, for any validator
// count V, and the compact bytes that count takes in front of the votes: one byte on tiny
// (05), two on full (82 ab). tools/widget-vote-count.test.ts checks the numbers against the
// lesson's text, its decode Output and its check questions.

import { compact } from "./compact.ts";
import { spacedHex } from "./bytes.ts";

/** The validator counts of the two sizes (4.2). */
export const TINY_V = 6;
export const FULL_V = 1023;
/** V steps by 3: JAM's sizes are built on thirds. */
export const STEP = 3;

/** Two thirds of the validators, rounded down. */
export const twoThirds = (v: number): number => Math.floor((2 * v) / 3);
/** A verdict's votes: two thirds, plus one. */
export const votesFor = (v: number): number => twoThirds(v) + 1;
/** The compact natural the votes list writes in front: its count. */
export const countBytes = (v: number): number[] => compact(BigInt(votesFor(v))).bytes;
export const dump = spacedHex;

/** The smallest V whose vote count needs two bytes: the count reaches 128. */
export const TWO_BYTES_FROM: number = (() => {
  for (let v = TINY_V; v <= FULL_V; v += STEP) if (countBytes(v).length === 2) return v;
  throw new Error("no V needs two bytes");
})();
