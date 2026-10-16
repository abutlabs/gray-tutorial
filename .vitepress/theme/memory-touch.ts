// Lesson 15.4's first widget: touching memory. Pages of 4,096 are R, W or absent; a bad
// touch below 2^16 panics, otherwise faults at the page's start, and nothing changes. The
// map has the lesson's tests' pages: one writable at 0x20000, one read-only at 0x10000.
// tools/widget-memory-touch.test.ts checks every outcome against the lesson's tests.

export const PAGE_SIZE = 4096;
export const PANIC_BELOW = 2 ** 16;
export type Access = "R" | "W";
/** The pages the lesson's tests add. */
export const PAGES: { start: number; access: Access }[] = [
  { start: 0x10000, access: "R" },
  { start: 0x20000, access: "W" },
];
export const pageOf = (address: number): number => Math.floor(address / PAGE_SIZE);
export const accessAt = (address: number): Access | null => PAGES.find((p) => pageOf(p.start) === pageOf(address))?.access ?? null;

export type Outcome = { ok: true } | { ok: false; panic: true } | { ok: false; fault: number };
/** ε^μ: the lowest address that can't be used decides; below 2^16 it's a panic. */
export function touch(address: number, n: number, write: boolean): Outcome {
  const bad: number[] = [];
  for (let k = 0; k < n; k++) {
    const i = (address + k) % 2 ** 32;
    const access = accessAt(i);
    if (access === null || (write && access !== "W")) bad.push(i);
  }
  if (bad.length === 0) return { ok: true };
  const lowest = Math.min(...bad);
  if (lowest < PANIC_BELOW) return { ok: false, panic: true };
  return { ok: false, fault: pageOf(lowest) * PAGE_SIZE };
}
export const hex = (n: number): string => `0x${n.toString(16)}`;
/** The addresses the lesson tries. */
export const PRESETS: { address: number; write: boolean; width: number; says: string }[] = [
  { address: 0x20000, write: false, width: 8, says: "load 8 bytes at 0x20000: the writable page" },
  { address: 0x30005, write: false, width: 1, says: "load at 0x30005: no page there" },
  { address: 0x0100, write: false, width: 1, says: "load at 0x0100: below 2^16" },
  { address: 0x10000, write: true, width: 1, says: "store at 0x10000: the read-only page" },
  { address: 0x10000, write: false, width: 1, says: "load at 0x10000: reading is fine" },
  { address: 0x20ffc, write: false, width: 8, says: "load 8 bytes at 0x20ffc: runs off the page" },
];
export const WIDTHS = [1, 2, 4, 8];
