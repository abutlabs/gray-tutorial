// Lesson 15.6's second widget: the same 64 bits, read unsigned and signed. Every branch's
// comparison is the lesson's COMPARISONS; the reader sets r0 and r1 and sees which jump.
// tools/widget-signed-branches.test.ts checks them against the lesson's code and run.

const M64 = 2n ** 64n;
/** Z₈: 64 bits read as a signed number (lesson 15.2's signed(8, x)). */
export const signed = (x: bigint): bigint => (x < 2n ** 63n ? x : x - M64);

/** The lesson's COMPARISONS, line for line. */
export const COMPARISONS: Record<string, (p: bigint, q: bigint) => boolean> = {
  eq: (p, q) => p === q,
  ne: (p, q) => p !== q,
  lt_u: (p, q) => p < q,
  le_u: (p, q) => p <= q,
  ge_u: (p, q) => p >= q,
  gt_u: (p, q) => p > q,
  lt_s: (p, q) => signed(p) < signed(q),
  le_s: (p, q) => signed(p) <= signed(q),
  ge_s: (p, q) => signed(p) >= signed(q),
  gt_s: (p, q) => signed(p) > signed(q),
};
/** The grid: each test, unsigned beside signed; eq and ne have no twin. */
export const ROWS: { op: string; sign: string; twins: [string, string] | [string] }[] = [
  { op: "lt", sign: "<", twins: ["lt_u", "lt_s"] },
  { op: "le", sign: "≤", twins: ["le_u", "le_s"] },
  { op: "ge", sign: "≥", twins: ["ge_u", "ge_s"] },
  { op: "gt", sign: ">", twins: ["gt_u", "gt_s"] },
  { op: "eq", sign: "=", twins: ["eq"] },
  { op: "ne", sign: "≠", twins: ["ne"] },
];
/** Which comparisons exist with two registers: no le or gt (swap them and use ge or lt). */
export const WITH_REGISTERS = new Set(["eq", "ne", "lt_u", "lt_s", "ge_u", "ge_s"]);

/** A register as a reader types it, signed, unsigned or hex, into 64 bits. */
export function parse(text: string): bigint | null {
  const t = text.trim().replace(/−/g, "-").replace(/[_,\s]/g, "");
  if (/^-?\d+$/.test(t) || /^0x[0-9a-f]+$/i.test(t)) {
    const v = BigInt(t);
    return ((v % M64) + M64) % M64;
  }
  if (t === "2^63") return 2n ** 63n;
  return null;
}
export const flipSign = (x: bigint): bigint => x ^ (2n ** 63n);
export const hex64 = (x: bigint): string => `0x${x.toString(16).padStart(16, "0")}`;
export const fmt = (x: bigint): string => x.toLocaleString("en-US");

export const PRESETS: { r0: bigint; r1: bigint; says: string }[] = [
  { r0: M64 - 1n, r1: 1n, says: "−1 and 1" },
  { r0: 3n, r1: 3n, says: "3 and 3" },
  { r0: 2n ** 63n, r1: 0n, says: "2^63 and 0" },
  { r0: 5n, r1: 7n, says: "5 and 7" },
];
