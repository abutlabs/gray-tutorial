// Lesson 15.4's second widget: a register stored little-endian, lowest byte first, and
// loaded back in every width, signed or not: load_i8 reads one byte back sign-extended to
// 64 bits, so 0x80 becomes −128. tools/widget-store-load.test.ts checks every value
// against the lesson's test and run.

export const R2 = 0x1122334455667780n;
export const BASE = 0x20000;
/** The eight bytes store_ind_u64 writes at 0x20000: the register's bytes, lowest first. */
export const CELLS: number[] = Array.from({ length: 8 }, (_, k) => Number((R2 >> BigInt(8 * k)) & 0xffn));
export type Load = { name: string; width: number; signed: boolean };
export const LOADS: Load[] = [
  { name: "load_ind_u8", width: 1, signed: false }, { name: "load_ind_i8", width: 1, signed: true },
  { name: "load_ind_u16", width: 2, signed: false }, { name: "load_ind_i16", width: 2, signed: true },
  { name: "load_ind_u32", width: 4, signed: false }, { name: "load_ind_i32", width: 4, signed: true },
  { name: "load_ind_u64", width: 8, signed: false },
];
/** The register a load leaves: the bytes read, little-endian, sign-extended if signed. */
export function load(l: Load, cells = CELLS): bigint {
  let v = 0n;
  for (let k = l.width - 1; k >= 0; k--) v = (v << 8n) | BigInt(cells[k]);
  if (!l.signed) return v;
  const top = v >> BigInt(8 * l.width - 1);
  return top === 1n ? v + (2n ** 64n - 2n ** BigInt(8 * l.width)) : v;
}
export const hex64 = (x: bigint): string => `0x${x.toString(16).padStart(16, "0")}`;
export const asSigned = (x: bigint): bigint => (x >= 2n ** 63n ? x - 2n ** 64n : x);
export const hex = (b: number): string => b.toString(16).padStart(2, "0");
