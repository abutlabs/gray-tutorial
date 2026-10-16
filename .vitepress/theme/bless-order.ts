// Lesson 17.13's widget: bless (Ω_B), register by register and byte by byte. φ₇ the manager,
// φ₈ the address of C assigners of 4 bytes each, φ₉ the delegator, φ₁₀ the registrar, φ₁₁
// the address of φ₁₂ always-accumulate entries, 12 bytes each: a 4-byte id and 8 bytes of
// gas. It costs 422 + 20 per entry. tools/widget-bless-order.test.ts checks it against the
// lesson's test and its bytes by hand.

export const CORES = 2;
export type Order = { manager: number; assign: number[]; delegator: number; registrar: number; free: [number, number][] };
/** The test's blessing(): manager 1, assigners 2 and 3, delegator 4, registrar 5, service 6 with 1,000 gas. */
export const TEST: Order = { manager: 1, assign: [2, 3], delegator: 4, registrar: 5, free: [[6, 1000]] };
const le = (x: number, n: number): number[] => Array.from({ length: n }, (_, k) => Math.floor(x / 256 ** k) % 256);
export const assignerBytes = (o: Order): number[][] => o.assign.map((a) => le(a, 4));
export const entryBytes = (o: Order): number[][] => o.free.map(([id, gas]) => [...le(id, 4), ...le(gas, 8)]);
export const gasOf = (o: Order): number => 422 + 20 * o.free.length;
export const REGISTERS = (o: Order) => [
  { r: "φ₇", value: String(o.manager), says: "the manager" },
  { r: "φ₈", value: "0x20000", says: `where the ${CORES} assigners are, 4 bytes each` },
  { r: "φ₉", value: String(o.delegator), says: "the delegator" },
  { r: "φ₁₀", value: String(o.registrar), says: "the registrar" },
  { r: "φ₁₁", value: "0x20010", says: "where the always-accumulate entries are, 12 bytes each" },
  { r: "φ₁₂", value: String(o.free.length), says: "how many entries" },
];
export const hx = (b: number): string => b.toString(16).padStart(2, "0");
