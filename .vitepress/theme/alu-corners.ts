// Lesson 15.5's widget: the arithmetic corners on numbers of your own. Every result is
// modulo 2^64; 32-bit forms sign-extend their low 32 bits; division by zero gives all ones;
// signed division rounds towards zero and the remainder keeps the dividend's sign; shar
// keeps the sign, shlo fills with zeros. The operations are the lesson's, line for line.
// tools/widget-alu-corners.test.ts checks every case against the lesson's tests and run.

const M32 = 2n ** 32n;
const M64 = 2n ** 64n;
const mod = (x: bigint, n: bigint) => ((x % n) + n) % n;
const signExtend = (n: number, x: bigint) => (x >> BigInt(8 * n - 1) === 1n ? x + (M64 - 2n ** BigInt(8 * n)) : x);
const signed = (n: number, x: bigint) => (x < 2n ** BigInt(8 * n - 1) ? x : x - 2n ** BigInt(8 * n));
const ext32 = (x: bigint) => signExtend(4, mod(x, M32));
const s32 = (x: bigint) => signed(4, mod(x, M32));
const s64 = (x: bigint) => signed(8, x);
const u64 = (x: bigint) => mod(x, M64);
const rotateRight = (x: bigint, k: bigint, n: bigint) => mod((x >> k) | (x << (n - k)), 2n ** n);

/** The operations the widget offers, by the lesson's names, each as the lesson writes it. */
export const OPERATIONS: Record<string, (p: bigint, q: bigint) => bigint> = {
  add_32: (p, q) => ext32(p + q),
  add_64: (p, q) => mod(p + q, M64),
  sub_64: (p, q) => mod(p - q, M64),
  mul_64: (p, q) => mod(p * q, M64),
  div_u_64: (p, q) => (q === 0n ? M64 - 1n : p / q),
  div_s_64: (p, q) => { const [a, b] = [s64(p), s64(q)]; if (b === 0n) return M64 - 1n; if (a === -(2n ** 63n) && b === -1n) return p; return u64(a / b); },
  rem_u_64: (p, q) => (q === 0n ? p : p % q),
  rem_s_64: (p, q) => { const [a, b] = [s64(p), s64(q)]; if (a === -(2n ** 63n) && b === -1n) return 0n; return u64(b === 0n ? a : a % b); },
  shlo_r_64: (p, q) => p >> mod(q, 64n),
  shar_r_64: (p, q) => u64(s64(p) >> mod(q, 64n)),
  shlo_l_64: (p, q) => mod(p << mod(q, 64n), M64),
  rot_r_64: (p, q) => rotateRight(p, mod(q, 64n), 64n),
  mul_upper_u_u: (p, q) => (p * q) >> 64n,
  div_s_32: (p, q) => { const [a, b] = [s32(p), s32(q)]; if (b === 0n) return M64 - 1n; if (a === -(2n ** 31n) && b === -1n) return u64(a); return u64(a / b); },
};
export const NAMES = Object.keys(OPERATIONS);
/** Whether an operation works in 32 bits: its low 32 bits are sign-extended back. */
export const is32 = (name: string): boolean => name.endsWith("_32");

export const neg = (x: bigint): bigint => M64 - x;
export const asSigned = (x: bigint): bigint => (x >= 2n ** 63n ? x - M64 : x);
export const hex64 = (x: bigint): string => `0x${x.toString(16).padStart(16, "0")}`;
export const bits64 = (x: bigint): string => x.toString(2).padStart(64, "0");
/** A number as a reader types it, signed or unsigned, into a 64-bit register. */
export function parse(text: string): bigint | null {
  const t = text.trim().replace(/−/g, "-").replace(/[_,]/g, "");
  if (/^-?\d+$/.test(t)) return mod(BigInt(t), M64);
  if (/^0x[0-9a-f]+$/i.test(t)) return mod(BigInt(t), M64);
  return null;
}

/** The lesson's run: nine corners, each an instruction on r0 and r1. */
export const CASES: { name: string; r0: bigint; r1: bigint; what: string }[] = [
  { name: "add_32", r0: 0x7fffffffn, r1: 1n, what: "2^31 − 1 + 1, in 32 bits" },
  { name: "div_u_64", r0: 5n, r1: 0n, what: "5 ÷ 0, unsigned" },
  { name: "div_s_64", r0: 2n ** 63n, r1: neg(1n), what: "−2^63 ÷ −1: too big to fit" },
  { name: "div_s_64", r0: neg(7n), r1: 2n, what: "−7 ÷ 2: towards zero" },
  { name: "rem_s_64", r0: neg(7n), r1: 2n, what: "−7 rem 2: the dividend's sign" },
  { name: "shar_r_64", r0: neg(8n), r1: 1n, what: "−8 >> 1, arithmetic" },
  { name: "shlo_r_64", r0: neg(8n), r1: 1n, what: "−8 >> 1, logical" },
  { name: "rot_r_64", r0: 1n, r1: 1n, what: "1 rotated right by 1" },
  { name: "mul_upper_u_u", r0: neg(1n), r1: neg(1n), what: "(2^64 − 1)², upper 64 bits" },
];
