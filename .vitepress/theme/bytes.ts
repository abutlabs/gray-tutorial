// Lessons 1.1 and 2.1's widgets: a byte as two hex digits, a number as any count of bits and
// the bytes they take, and ℰ_l (Gray Paper, Appendix C) one byte at a time.
// tools/widgets.test.ts checks it against the lessons' own values.

export const HEX_DIGITS = "0123456789abcdef";

/** x in binary, most significant bit first, padded with zeros to width bits. */
export const bitsOf = (x: bigint | number, width: number): string => x.toString(2).padStart(width, "0");

/** Bytes as the vectors write them: 0x, then two hex digits per byte. */
export const toHex = (bytes: number[]): string => `0x${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;

/** A byte's two hex digits: its high 4 bits and its low 4 bits, each 0 to 15. */
export const nibbles = (byte: number): { high: number; low: number } => ({ high: byte >> 4, low: byte & 0xf });

/** ℰ_l(x) as the Gray Paper's recursion runs it: each step writes x mod 256 and hands
 *  ⌊x / 256⌋ to the next. `rest` is what the step starts from. */
export function fixedSteps(x: bigint, l: number): { rest: bigint; byte: number }[] {
  const steps = [];
  let rest = x;
  for (let i = 0; i < l; i++) {
    steps.push({ rest, byte: Number(rest & 0xffn) }); // x mod 256
    rest >>= 8n; // ⌊x / 256⌋
  }
  return steps;
}

/** ℰ_l(x): x in exactly l bytes, least significant first. */
export const encodeFixed = (x: bigint, l: number): number[] => fixedSteps(x, l).map((s) => s.byte);

/** What ℰ_l can't write when x doesn't fit in l bytes: ⌊x / 256^l⌋, 0 when it fits. */
export const leftOver = (x: bigint, l: number): bigint => x >> BigInt(8 * l);

/** The most bits the bits-and-bytes playground holds: a u64's. */
export const MAX_BITS = 64;

/** The whole bytes n bits take: 8 to a byte, and a byte only part used is still a byte. */
export const byteCount = (bits: number): number => Math.ceil(bits / 8);

/** How many bits x needs: 300 needs 9 (100101100). 0 still takes one. */
export const bitLength = (x: bigint): number => x.toString(2).length;

/** Bits with a _ between bytes, counted from the right, as JavaScript allows: 1_00101100. */
export const groupBits = (bits: string): string => bits.replace(/\B(?=([01]{8})+$)/g, "_");

/** x's l bytes as the number reads, biggest first: ℰ_l's bytes the other way round. */
export const bigFirst = (x: bigint, l: number): number[] => encodeFixed(x, l).reverse();

/** Bytes as a row of hex pairs, a space between bytes, no 0x: "2c 01". */
export const spacedHex = (bytes: number[]): string => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");

/** A number typed as JavaScript writes one: 16, 0x10 (hex) or 0b10000 (bits), spaces and
 *  _ between digits allowed. Undefined if it isn't one, or is negative. */
export function readNumber(text: string): { x: bigint; base: "decimal" | "hex" | "bits" } | undefined {
  const t = text.replace(/[\s_]/g, "").toLowerCase();
  if (!/^(0x[0-9a-f]+|0b[01]+|\d+)$/.test(t)) return undefined;
  return { x: BigInt(t), base: t.startsWith("0x") ? "hex" : t.startsWith("0b") ? "bits" : "decimal" };
}

/** The playground's goals: a width in bits and a value, and what reaching it shows. */
export const PLAYGROUND_GOALS = [
  { bits: 8, x: 128n, say: "the bits 0b10000000: one byte, 128, written 0x80" },
  { bits: 8, x: 16n, say: "the byte 0x10: it's 16, and its bits are 0b00010000" },
  { bits: 32, x: 16n, say: "16 in 4 bytes: 00 00 00 10, which JAM writes 10 00 00 00" },
  { bits: 9, x: 256n, say: "256 in 9 bits: one bit too many for a byte, so 2 bytes" },
  { bits: 16, x: 65535n, say: "the biggest 2 bytes hold: 16 ones, 0xffff, 65,535" },
];

/** Digits typed with no 0x or 0b, read every way they can be: 10 is ten, but 0x10 is 16 and
 *  0b10 is 2. Only 0s and 1s read three ways; other decimal digits two. */
export function readings(text: string): { written: string; base: "decimal" | "hex" | "bits"; x: bigint }[] {
  const digits = text.replace(/[\s_]/g, "");
  if (!/^\d+$/.test(digits)) return [];
  const all = [
    { written: digits, base: "decimal" as const, x: BigInt(digits) },
    { written: `0x${digits}`, base: "hex" as const, x: BigInt(`0x${digits}`) },
  ];
  return /^[01]+$/.test(digits) ? [...all, { written: `0b${digits}`, base: "bits" as const, x: BigInt(`0b${digits}`) }] : all;
}
