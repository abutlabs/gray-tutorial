// Lesson 15.7's widget: one register, ten answers. The operations are the lesson's
// BIT_OPERATIONS, and `counted` says which of the register's bits each one looked at, so
// the widget can light them. tools/widget-bit-counts.test.ts checks every answer against
// the lesson's tests and run.

const M64 = 2n ** 64n;
/** x's lowest n bits, the highest first (the lesson's bits). */
const bits = (x: bigint, n: number) => BigInt.asUintN(n, x).toString(2).padStart(n, "0");
const ones = (s: string) => BigInt(s.replaceAll("0", "").length);
const leadingZeros = (s: string) => BigInt(/^0*/.exec(s)![0].length);
const trailingZeros = (s: string) => BigInt(/0*$/.exec(s)![0].length);
const signExtend = (n: number, x: bigint) => (x >> BigInt(8 * n - 1) === 1n ? x + (M64 - 2n ** BigInt(8 * n)) : x);
const reverse8 = (x: bigint) => {
  let out = 0n;
  for (let k = 0; k < 8; k++) out = (out << 8n) | ((x >> BigInt(8 * k)) & 0xffn);
  return out;
};

/** The lesson's BIT_OPERATIONS, by name, in opcode order 101 to 110. */
export const BIT_OPERATIONS: Record<string, (x: bigint) => bigint> = {
  count_set_bits_64: (x) => ones(bits(x, 64)),
  count_set_bits_32: (x) => ones(bits(x, 32)),
  leading_zero_bits_64: (x) => leadingZeros(bits(x, 64)),
  leading_zero_bits_32: (x) => leadingZeros(bits(x, 32)),
  trailing_zero_bits_64: (x) => trailingZeros(bits(x, 64)),
  trailing_zero_bits_32: (x) => trailingZeros(bits(x, 32)),
  sign_extend_8: (x) => signExtend(1, BigInt.asUintN(8, x)),
  sign_extend_16: (x) => signExtend(2, BigInt.asUintN(16, x)),
  zero_extend_16: (x) => BigInt.asUintN(16, x),
  reverse_bytes: (x) => reverse8(x),
};
export const NAMES = Object.keys(BIT_OPERATIONS);

/** The bits an instruction looked at, by position (0 is the lowest): the 1s it counted, the
 *  run of 0s above the highest 1 or below the lowest, or the low byte or two it kept. */
export function counted(name: string, x: bigint): Set<number> {
  const width = name.endsWith("_32") ? 32 : 64;
  const at = (k: number) => ((x >> BigInt(k)) & 1n) === 1n;
  const out = new Set<number>();
  if (name.startsWith("count_set_bits")) for (let k = 0; k < width; k++) if (at(k)) out.add(k);
  if (name.startsWith("leading_zero_bits")) for (let k = width - 1; k >= 0 && !at(k); k--) out.add(k);
  if (name.startsWith("trailing_zero_bits")) for (let k = 0; k < width && !at(k); k++) out.add(k);
  if (name === "sign_extend_8") for (let k = 0; k < 8; k++) out.add(k);
  if (name === "sign_extend_16" || name === "zero_extend_16") for (let k = 0; k < 16; k++) out.add(k);
  if (name === "reverse_bytes") for (let k = 0; k < 64; k++) out.add(k);
  return out;
}

/** What an instruction did, in words, on this register. */
export function says(name: string, x: bigint): string {
  const v = BIT_OPERATIONS[name](x);
  const w = name.endsWith("_32") ? "the low 32 bits" : "all 64 bits";
  if (name.startsWith("count_set_bits")) return `${v} bits are 1, counted across ${w}.`;
  if (name.startsWith("leading_zero_bits")) return v === BigInt(name.endsWith("_32") ? 32 : 64) ? `No 1 at all in ${w}: every bit counts, ${v}.` : `${v} zeros above the highest 1, in ${w}.`;
  if (name.startsWith("trailing_zero_bits")) return v === BigInt(name.endsWith("_32") ? 32 : 64) ? `No 1 at all in ${w}: every bit counts, ${v}.` : `${v} zeros below the lowest 1, in ${w}.`;
  if (name === "sign_extend_8") { const b = x & 0xffn; return `The lowest byte, 0x${b.toString(16).padStart(2, "0")}, read signed: ${b >= 128n ? `${b} − 256 = ${b - 256n}` : `${b}`}, written into all 64 bits.`; }
  if (name === "sign_extend_16") { const b = x & 0xffffn; return `The lowest two bytes, 0x${b.toString(16).padStart(4, "0")}, read signed: ${b >= 32768n ? `${b} − 65,536 = ${b - 65536n}` : `${b}`}.`; }
  if (name === "zero_extend_16") return `The lowest two bytes kept as they are, 0x${(x & 0xffffn).toString(16).padStart(4, "0")}, and the rest cleared.`;
  return "The 8 bytes turned round: the lowest byte becomes the highest.";
}

export const hex64 = (x: bigint): string => `0x${x.toString(16).padStart(16, "0")}`;
export const asSigned = (x: bigint): bigint => (x >= 2n ** 63n ? x - M64 : x);
/** A register as a reader types it: decimal, negative, or hex. */
export function parse(text: string): bigint | null {
  const t = text.trim().replace(/−/g, "-").replace(/[_,\s]/g, "");
  if (!/^-?\d+$/.test(t) && !/^0x[0-9a-f]+$/i.test(t)) return null;
  return BigInt.asUintN(64, BigInt(t));
}
export const PRESETS = [
  { x: 0x1f0n, says: "0x1f0, the run's" },
  { x: 0b1011n, says: "0b1011" },
  { x: 1n, says: "1" },
  { x: 0n, says: "0" },
  { x: M64 - 1n, says: "−1, all ones" },
  { x: 0x0102030405060708n, says: "0x0102…08" },
  { x: 0xdeadbeefn, says: "0xdeadbeef" },
];
