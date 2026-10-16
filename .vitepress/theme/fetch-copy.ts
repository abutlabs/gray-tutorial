// Lesson 16.2's first widget: fetch (Ω_Y) copying part of an item into memory. f = min(φ₈,
// |v|) and l = min(φ₉, |v| − f) clamp the window; v[f..f+l) lands at φ₇; φ₇ becomes |v|. A
// missing item is NONE; an address with no writable page, a panic. The gas is the item's
// base plus a rate per 1,024 bytes asked for. tools/widget-fetch-copy.test.ts checks every
// case against the lesson's tests.

import { CONSTANTS_TINY } from "./protocol-constants.ts";

export const NONE = 2n ** 64n - 1n;
export const BUDGET = 10_000n;
export const BLOCK_COST = 100n;
/** The items accumulation's host has, as the tests give them: the constants, 32 sevens; 7 is a refinement item. */
export const ITEMS: { kind: number; says: string; bytes: number[] | null }[] = [
  { kind: 0, says: "0: the protocol constants", bytes: CONSTANTS_TINY },
  { kind: 1, says: "1: the entropy, 32 sevens", bytes: Array(32).fill(7) },
  { kind: 7, says: "7: a work-package (refinement only)", bytes: null },
];
/** Fetch's gas for the items here: [base, rate per 1,024 bytes asked for]. */
export const FETCH_GAS: Record<number, [number, number]> = { 0: [390, 0], 1: [103, 0], 7: [85, 96] };
const memoryGas = (rate: number, length: bigint) => (BigInt(rate) * length + 1023n) / 1024n;
/** The writable page the tests add. */
export const PAGE = 0x20000;

export type Result = { gas: bigint; exit: "halt" | "panic" | "oog"; r7: bigint; f: number; l: number; landed: number[] };
/** fetch item `kind` with φ₇ = o, φ₈ = from, φ₉ = z, then the return. */
export function fetchItem(kind: number, o: number, from: bigint, z: bigint): Result {
  const item = ITEMS.find((i) => i.kind === kind)!;
  const [base, rate] = FETCH_GAS[kind];
  const gas = BUDGET - BLOCK_COST - BigInt(base) - memoryGas(rate, z);
  if (gas < 0n) return { gas, exit: "oog", r7: BigInt(o), f: 0, l: 0, landed: [] };
  const v = item.bytes;
  if (v === null) return { gas, exit: "halt", r7: NONE, f: 0, l: 0, landed: [] };
  const f = from < BigInt(v.length) ? Number(from) : v.length;
  const l = z < BigInt(v.length - f) ? Number(z) : v.length - f;
  const writable = o >= PAGE && o + l <= PAGE + 4096;
  if (l > 0 && !writable) return { gas, exit: "panic", r7: BigInt(o), f, l, landed: [] };
  return { gas, exit: "halt", r7: BigInt(v.length), f, l, landed: v.slice(f, f + l) };
}
export const show = (x: bigint): string => (x === NONE ? "NONE" : x.toLocaleString("en-US"));
