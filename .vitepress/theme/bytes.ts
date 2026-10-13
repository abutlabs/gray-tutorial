// Lessons 1.1 and 2.1's widgets: a byte as two hex digits, and ℰ_l (Gray Paper, Appendix C)
// one byte at a time. tools/widgets.test.ts checks it against the lessons' own values.

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
