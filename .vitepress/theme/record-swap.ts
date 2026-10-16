// Lesson 2.5's widget: a record is its fields' bytes in the fields' order, nothing else.
// Slot 42 (a u32) and gas 7 (a u64) are twelve bytes; decode them with the fields swapped
// and both read the wrong bytes, with no error. A list, unlike a record, says how long it
// is. tools/widget-record-swap.test.ts checks every byte here against the lesson's tests
// and check questions.

import { encodeFixed, spacedHex } from "./bytes.ts";
import { compact } from "./compact.ts";
import { decodeFixed } from "./reader-walk.ts";

/** The lesson's record: a slot of 42 as a u32, a gas amount of 7 as a u64. */
export const SLOT = 42n;
export const GAS = 7n;
export type Field = { name: "slot" | "gas"; codec: "u32" | "u64"; width: number };
export const FIELDS: Field[] = [
  { name: "slot", codec: "u32", width: 4 },
  { name: "gas", codec: "u64", width: 8 },
];
/** The twelve bytes, written in the fields' order: ℰ₄(42) ⌢ ℰ₈(7). */
export const RECORD_BYTES: number[] = [...encodeFixed(SLOT, 4), ...encodeFixed(GAS, 8)];

/** One field read from the bytes: where it started, how many it took, what it got. */
export type Read = { field: Field; from: number; to: number; value: bigint };
/** The bytes decoded with the fields in the given order: each takes its width, in turn. */
export function decodeAs(order: Field[]): Read[] {
  let at = 0;
  return order.map((field) => {
    const r = { field, from: at, to: at + field.width, value: decodeFixed(RECORD_BYTES.slice(at, at + field.width)) };
    at += field.width;
    return r;
  });
}
/** The fields the other way round: gas first. */
export const swapped = (order: Field[]): Field[] => [...order].reverse();
/** Whether an order reads the values the writer wrote. */
export const faithful = (reads: Read[]): boolean => reads.every((r) => r.value === (r.field.name === "slot" ? SLOT : GAS));

/** The lesson's list, 1, 2, 3 as u16s: its count in front, then each item. */
export const ITEMS = [1n, 2n, 3n];
export const SEQ_BYTES: { role: "count" | "item"; bytes: number[]; says: string }[] = [
  { role: "count", bytes: compact(BigInt(ITEMS.length)).bytes, says: `the count, ${ITEMS.length} items` },
  ...ITEMS.map((x) => ({ role: "item" as const, bytes: encodeFixed(x, 2), says: `${x} as a u16` })),
];
export const dump = spacedHex;
