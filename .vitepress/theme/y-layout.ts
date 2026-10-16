// Lesson 15.8's widget: Y lays out a standard program's memory. o one zone up, w and the
// heap a zone after o's zones, the stack below 2^32 − 2·2^16 − 2^24, the arguments at
// 2^32 − 2^16 − 2^24, empty space between, and r0, r1, r7, r8. The arithmetic is the
// lesson's standardProgram; tools/widget-y-layout.test.ts checks it against the lesson's
// test addresses and the start run's four ranges.

export const PAGE_SIZE = 4096;
/** Z_Z and Z_I. */
export const ZONE = 2 ** 16;
export const INPUT_SIZE = 2 ** 24;
export const HALT_ADDRESS = 2 ** 32 - 2 ** 16;
const roundUp = (x: number, size: number) => Math.ceil(x / size) * size;

/** What Y needs: the sizes of o, w and a, the heap pages z, and the stack size s. */
export interface Sizes { o: number; w: number; z: number; s: number; a: number }
export const PRESETS: { name: string; sizes: Sizes }[] = [
  { name: "TINY_PROGRAM, the test's", sizes: { o: 3, w: 2, z: 1, s: 100, a: 1 } },
  { name: "the bootstrap service", sizes: { o: 9904, w: 48, z: 2, s: 8192, a: 3 } },
];

/** A stretch of the address space: a section with its access, or nothing. */
export interface Row { name: string; from: number; to: number; access: "R" | "W" | null; says: string }

/** Y's memory, top to bottom of the address space, gaps included; and its registers. */
export function layout({ o, w, z, s, a }: Sizes): { rows: Row[]; registers: { r0: number; r1: number; r7: number; r8: number } } {
  const oEnd = ZONE + roundUp(o, PAGE_SIZE);
  const heap = 2 * ZONE + roundUp(o, ZONE);
  const heapEnd = heap + roundUp(w, PAGE_SIZE) + z * PAGE_SIZE;
  const stackTop = 2 ** 32 - 2 * ZONE - INPUT_SIZE;
  const stack = stackTop - roundUp(s, PAGE_SIZE);
  const input = 2 ** 32 - ZONE - INPUT_SIZE;
  const inputEnd = input + roundUp(a, PAGE_SIZE);
  const sections: Row[] = [
    { name: "nothing may live here", from: 0, to: ZONE, access: null, says: "below 2^16: a touch here is a panic, never a fault" },
    { name: "o, the read-only data", from: ZONE, to: oEnd, access: "R", says: `${o.toLocaleString("en-US")} bytes, padded to whole pages, one zone up` },
    { name: "w, then the heap", from: heap, to: heapEnd, access: "W", says: `${w.toLocaleString("en-US")} bytes of w padded to pages, then ${z} heap page${z === 1 ? "" : "s"}; it starts at 2 · 2^16 + Z(${o.toLocaleString("en-US")})` },
    { name: "the stack", from: stack, to: stackTop, access: "W", says: `${s.toLocaleString("en-US")} bytes rounded up to pages, below 2^32 − 2 · 2^16 − 2^24; it grows down from r1` },
    { name: "the arguments", from: input, to: inputEnd, access: "R", says: `${a.toLocaleString("en-US")} byte${a === 1 ? "" : "s"}, padded to a page, at 2^32 − 2^16 − 2^24` },
  ];
  const rows: Row[] = [];
  let at = 0;
  for (const sec of sections) {
    if (sec.from > at) rows.push({ name: "no pages", from: at, to: sec.from, access: null, says: "empty: a touch here faults" });
    if (sec.to > sec.from) rows.push(sec);
    at = Math.max(at, sec.to);
  }
  rows.push({ name: "no pages", from: at, to: 2 ** 32, access: null, says: "empty, to the top of the address space" });
  return { rows, registers: { r0: HALT_ADDRESS, r1: stackTop, r7: input, r8: a } };
}

/** What touching an address does: a section's access, or a fault at its page, or a panic. */
export function touch(rows: Row[], address: number): string {
  const row = rows.find((r) => r.from <= address && address < r.to)!;
  if (address < ZONE) return "a panic: below 2^16";
  if (!row.access) return `no page: a fault at ${hex(Math.floor(address / PAGE_SIZE) * PAGE_SIZE)}`;
  return row.access === "R" ? "readable, not writable" : "readable and writable";
}

export const hex = (x: number): string => `0x${x.toString(16).padStart(8, "0")}`;
export const pages = (r: Row): number => (r.to - r.from) / PAGE_SIZE;
/** A gap's size in words a reader can picture. */
export function size(bytes: number): string {
  if (bytes >= 2 ** 30) return `${(bytes / 2 ** 30).toFixed(2)} GiB`;
  if (bytes >= 2 ** 20) return `${(bytes / 2 ** 20).toFixed(1)} MiB`;
  if (bytes >= 2 ** 10) return `${(bytes / 2 ** 10).toFixed(0)} KiB`;
  return `${bytes} bytes`;
}
