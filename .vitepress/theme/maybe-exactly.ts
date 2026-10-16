// Lesson 4.5's widget: the codec's last two shapes. ¿x is the byte 0 for nothing, or 1
// then the value; ⟦T⟧ₙ is exactly n items with no count in front, because everyone knows
// n. tools/widget-maybe-exactly.test.ts checks every byte against the lesson's tests.

import { encodeFixed, spacedHex } from "./bytes.ts";
import { compact } from "./compact.ts";

/** One byte of an encoding and its job. */
export type Cell = { byte: number; job: "tag" | "value" | "count" | "item"; says: string };
export const dump = spacedHex;

/** option(u32): nothing, or a value. */
export function optionCells(value: bigint | null): Cell[] {
  if (value === null) return [{ byte: 0, job: "tag", says: "the tag: nothing, and that's all" }];
  return [
    { byte: 1, job: "tag", says: "the tag: there is a value, and here it comes" },
    ...encodeFixed(value, 4).map((byte, i) => ({ byte, job: "value" as const, says: `${value} as a u32, byte ${i + 1} of 4` })),
  ];
}

/** The lesson's list, 1, 2, 3 as u16s: as seq (its count first) or as seqN (no count). */
export const ITEMS = [1n, 2n, 3n];
export function listCells(exactly: boolean): Cell[] {
  const items = ITEMS.flatMap((x) => encodeFixed(x, 2).map((byte, i) => ({ byte, job: "item" as const, says: `${x} as a u16, byte ${i + 1} of 2` })));
  if (exactly) return items;
  return [...compact(BigInt(ITEMS.length)).bytes.map((byte) => ({ byte, job: "count" as const, says: `the count: ${ITEMS.length} items` })), ...items];
}

/** The largest value option(u32) holds. */
export const U32_MAX = (1n << 32n) - 1n;
