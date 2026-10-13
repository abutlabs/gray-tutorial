// Lessons 4.2 and 11.1's widgets: one bit per core, packed eight to a byte, least
// significant first (Gray Paper, Appendix C), and when enough of them make a report
// available (§11). tools/widgets.test.ts checks it against the lessons' own values.

/** C bits take ⌈C/8⌉ bytes. */
export const bytesFor = (cores: number): number => Math.ceil(cores / 8);

/** Bit c of a bitfield: bit c % 8 of byte ⌊c / 8⌋, counted from the lowest. Lesson 11.1's bitAt. */
export const bitAt = (bitfield: number[], c: number): boolean => ((bitfield[Math.floor(c / 8)] >> (c % 8)) & 1) === 1;

/** The bitfield with core c's bit flipped. */
export function flip(bitfield: number[], c: number): number[] {
  const next = [...bitfield];
  next[Math.floor(c / 8)] ^= 1 << (c % 8);
  return next;
}

/** The bitfield of C cores with exactly these cores set. */
export function bitfieldOf(cores: number, set: (c: number) => boolean): number[] {
  let bitfield = Array<number>(bytesFor(cores)).fill(0);
  for (let c = 0; c < cores; c++) if (set(c)) bitfield = flip(bitfield, c);
  return bitfield;
}

/** A report is available when more than two thirds of the validators assure it:
 *  assured × 3 > validators × 2, in whole numbers. */
export const isAvailable = (assured: number, validators: number): boolean => 3 * assured > 2 * validators;

/** The fewest assurances that make a report available. */
export const needed = (validators: number): number => Math.floor((2 * validators) / 3) + 1;
