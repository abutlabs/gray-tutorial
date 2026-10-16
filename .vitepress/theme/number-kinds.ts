// Lesson 1.2's widget: one value as a JavaScript number and as a bigint. A number is exact
// up to 2^53 − 1 and rounds above it, silently; a bigint is exact at any size. And the
// bitwise operators read a number as a signed 32-bit integer, so all 32 bits set is −1.
// tools/widget-number-kinds.test.ts checks every value here against the lesson's tests.

/** The largest whole number a JavaScript number holds exactly: 2^53 − 1. */
export const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** The values the lesson's tests and check questions turn on. */
export const VALUES: { name: string; value: bigint }[] = [
  { name: "2^53 − 1", value: 2n ** 53n - 1n },
  { name: "2^53 + 1", value: 2n ** 53n + 1n },
  { name: "2^64 − 70", value: 2n ** 64n - 70n },
  { name: "2^64", value: 2n ** 64n },
];
/** The nudges a reader can give a value. */
export const NUDGES = [-70n, -1n, 1n, 70n];

/** The value as a number prints it: 2^64 − 70 comes out "18446744073709552000". */
export const asNumber = (x: bigint): string => Number(x).toString();
/** The value as a bigint prints it, exact, with its n. */
export const asBigint = (x: bigint): string => `${x}n`;
/** Whether a number holds the value exactly: below 2^53 it does. */
export const exact = (x: bigint): boolean => x <= MAX_SAFE;
/** Whether, as numbers, the value and the one `by` away are the same float. */
export const sameAsNumber = (x: bigint, by: bigint): boolean => Number(x) === Number(x + by);
/** The digits of the number's printing that differ from the exact value, by position. */
export function wrongDigits(x: bigint): boolean[] {
  const [got, want] = [asNumber(x), `${x}`];
  return [...got].map((d, i) => d !== want[i]);
}

/** A 32-bit pattern the lesson's third test reads two ways. */
export const PATTERNS: { name: string; value: number }[] = [
  { name: "0xffffffff", value: 0xffffffff },
  { name: "0x80000000", value: 0x80000000 },
  { name: "0x7fffffff", value: 0x7fffffff },
];
/** `| 0`: the bits read as a signed 32-bit integer, the top bit worth −2^31. */
export const signed = (v: number): number => v | 0;
/** `>>> 0`: the same bits read unsigned again. */
export const unsigned = (v: number): number => signed(v) >>> 0;
/** The 32 bits, most significant first. */
export const bitsOf = (v: number): string => (v >>> 0).toString(2).padStart(32, "0");
