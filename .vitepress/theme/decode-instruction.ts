// Lesson 15.2's widget: one instruction read off its bytes, on the lesson's napkin program,
// load_imm r1, −1 | add_64 r3 = r1 + r2 | jump back 3 | trap. An instruction is its opcode's
// layout read up to the next instruction start: register nibbles, an immediate whose length
// is what skip(ı) leaves, sign-extended (X), or an offset read signed (Z) and added to ı.
// tools/widget-decode-instruction.test.ts checks every value against the lesson's tests and
// check questions.

export const CODE: number[] = [51, 0x01, 0xff, 200, 0x21, 0x03, 40, 0xfd, 0];
export const BITMASK: number[] = [0x49, 0x01]; // bits 0, 3, 6 and 8: where instructions start
export const startsInstruction = (i: number): boolean => i < CODE.length && ((BITMASK[Math.floor(i / 8)] >> i % 8) & 1) === 1;
export const STARTS: number[] = CODE.map((_, i) => i).filter(startsInstruction);

/** The opcodes the napkin uses, by name and layout. */
export const OPCODES: Record<number, { name: string; layout: "regImm" | "regRegReg" | "offset" | "none" }> = {
  51: { name: "load_imm", layout: "regImm" },
  200: { name: "add_64", layout: "regRegReg" },
  40: { name: "jump", layout: "offset" },
  0: { name: "trap", layout: "none" },
};
/** skip(ı): bytes after the opcode until the next one, at most 24. */
export function skip(code: number[], i: number): number {
  let j = 0;
  while (j < 24 && i + 1 + j < code.length && !startsInstruction(i + 1 + j)) j++;
  return j;
}
const readLE = (code: number[], i: number, n: number): bigint => { let v = 0n; for (let k = n - 1; k >= 0; k--) v = (v << 8n) | BigInt(code[i + k] ?? 0); return v; };
/** X_n: an n-byte value sign-extended to 64 bits, as an unsigned number. */
export function signExtend(n: number, x: bigint): bigint {
  if (n === 0) return 0n;
  const negative = x >> BigInt(8 * n - 1) === 1n;
  return negative ? x + (2n ** 64n - 2n ** BigInt(8 * n)) : x;
}
/** Z_n: an n-byte value read as a signed number. */
export const signed = (n: number, x: bigint): bigint => (n === 0 ? 0n : x < 2n ** BigInt(8 * n - 1) ? x : x - 2n ** BigInt(8 * n));
/** A 64-bit unsigned value as a person writes it: negative if its top bit is set. */
export const asSigned = (x: bigint): bigint => (x >= 2n ** 63n ? x - 2n ** 64n : x);

export type Decoded = {
  at: number; opcode: number; name: string; layout: string; skip: number; next: number;
  registers: number[]; nibbles?: { low: number; high: number };
  immediate?: { bytes: number[]; raw: bigint; extended: bigint };
  offset?: { bytes: number[]; signed: bigint; target: number; lands: boolean };
};
/** Decodes the instruction at i of `code`, the napkin's bitmask telling where the next starts. */
export function decode(code: number[], i: number): Decoded {
  const opcode = code[i];
  const info = OPCODES[opcode];
  if (!info) throw new Error(`no instruction has opcode ${opcode}`);
  const l = skip(code, i);
  const byte = (k: number) => code[i + k] ?? 0;
  const low = Math.min(12, byte(1) % 16), high = Math.min(12, Math.floor(byte(1) / 16));
  const out: Decoded = { at: i, opcode, name: info.name, layout: info.layout, skip: l, next: i + 1 + l, registers: [] };
  if (info.layout === "regImm") {
    const n = Math.min(4, Math.max(0, l - 1));
    out.registers = [low]; out.nibbles = { low, high };
    const raw = readLE(code, i + 2, n);
    out.immediate = { bytes: code.slice(i + 2, i + 2 + n), raw, extended: signExtend(n, raw) };
  } else if (info.layout === "regRegReg") {
    out.registers = [low, high, Math.min(12, byte(2))]; out.nibbles = { low, high };
  } else if (info.layout === "offset") {
    const n = Math.min(4, l);
    const raw = readLE(code, i + 1, n), s = signed(n, raw);
    const target = i + Number(s);
    out.offset = { bytes: code.slice(i + 1, i + 1 + n), signed: s, target, lands: target >= 0 && startsInstruction(target) };
  }
  return out;
}
