// Lesson 15.3's machine (GP App. A): an instruction counter ı and thirteen 64-bit registers
// φ, r0 to r12. One step, Ψ₁, runs the instruction at ı; unless it says otherwise ı moves on
// to ı + 1 + skip(ı), and ε = ▸, carry on. A step can also halt or panic; Ψ steps until ε
// isn't ▸. Only the lesson's seventeen instructions, decoded as lesson 15.2 does and run as
// the lesson's step does, on the lesson's own programs. Memory and gas come later.

import { bitAt } from "./bitfield.ts";

/** A program: its code bytes, the bitmask k (bit i set: byte i starts an instruction), the jump table. */
export type Program = { code: number[]; bitmask: number[]; jumpTable: number[] };
/** How a step ends (GP's ε): carry on (▸), finish, or fail. */
export type Exit = "continue" | "halt" | "panic";
/** The machine: the program, ı, the registers φ, and where its basic blocks start. */
export type Machine = { program: Program; pc: number; registers: bigint[]; blocks: Set<number> };

type Layout = "none" | "regExtImm" | "offset" | "regImm" | "regImmOffset" | "regReg" | "regRegImm" | "regRegOffset" | "regRegReg";

/** The lesson's seventeen instructions: opcode, GP name, and layout (GP App. A.5). */
const OPCODES: Record<number, { name: string; layout: Layout }> = {
  0: { name: "trap", layout: "none" },
  1: { name: "fallthrough", layout: "none" },
  20: { name: "load_imm_64", layout: "regExtImm" },
  40: { name: "jump", layout: "offset" },
  50: { name: "jump_ind", layout: "regImm" },
  51: { name: "load_imm", layout: "regImm" },
  81: { name: "branch_eq_imm", layout: "regImmOffset" },
  82: { name: "branch_ne_imm", layout: "regImmOffset" },
  100: { name: "move_reg", layout: "regReg" },
  149: { name: "add_imm_64", layout: "regRegImm" },
  170: { name: "branch_eq", layout: "regRegOffset" },
  171: { name: "branch_ne", layout: "regRegOffset" },
  200: { name: "add_64", layout: "regRegReg" },
  201: { name: "sub_64", layout: "regRegReg" },
  210: { name: "and", layout: "regRegReg" },
  211: { name: "xor", layout: "regRegReg" },
  212: { name: "or", layout: "regRegReg" },
};

export const WRAP = 2n ** 64n; // registers hold 64 bits: arithmetic wraps around at 2^64
/** The address that halts the machine when jumped to: where r0 points at the start. */
export const HALT_ADDRESS = 2n ** 32n - 2n ** 16n;

/** The tiny assembler of lesson 15.3: each array is one instruction's bytes. */
export function assemble(instructions: number[][]): Program {
  const code = instructions.flat();
  const bitmask: number[] = Array(Math.ceil(code.length / 8)).fill(0);
  let at = 0;
  for (const instruction of instructions) {
    bitmask[Math.floor(at / 8)] |= 1 << at % 8; // this byte starts an instruction
    at += instruction.length;
  }
  return { code, bitmask, jumpTable: [] };
}

/** Whether byte i of the code starts an instruction: bit i of k. */
export const startsInstruction = (p: Program, i: number): boolean => i < p.code.length && bitAt(p.bitmask, i);

/** skip(i) (GP App. A): bytes after the opcode at i until the next opcode, at most 24. */
export function skip(p: Program, i: number): number {
  let j = 0;
  while (j < 24 && i + 1 + j < p.code.length && !startsInstruction(p, i + 1 + j)) j++;
  return j;
}

/** One decoded instruction, its arguments in the order the GP names them (lesson 15.2). */
export type Instruction = {
  at: number; // ı: where its opcode is
  opcode: number;
  name: string;
  registers: number[];
  immediates: bigint[]; // sign-extended to 64 bits
  target?: number; // where an offset points: ı plus the signed offset
  skip: number;
  next: number; // ı + 1 + skip(ı)
};

/** n bytes from i, little-endian; past the end, zeros (GP's ζ). */
function readLE(p: Program, i: number, n: number): bigint {
  let value = 0n;
  for (let k = n - 1; k >= 0; k--) value = (value << 8n) | BigInt(p.code[i + k] ?? 0);
  return value;
}

/** X_n: n bytes sign-extended to 64 bits. */
const signExtend = (n: number, x: bigint): bigint => (n > 0 && x >> BigInt(8 * n - 1) === 1n ? x + (WRAP - 2n ** BigInt(8 * n)) : x);
/** Z_n: n bytes read as a signed number. */
const signed = (n: number, x: bigint): bigint => (n > 0 && x >= 2n ** BigInt(8 * n - 1) ? x - 2n ** BigInt(8 * n) : x);

/** Decodes the instruction at i: its opcode, then its layout's arguments. */
export function decode(p: Program, i: number): Instruction {
  const opcode = p.code[i];
  const info = OPCODES[opcode];
  if (!info) throw new Error(`opcode ${opcode} isn't one of lesson 15.3's instructions`);
  const l = skip(p, i);
  const byte = (k: number) => p.code[i + k] ?? 0;
  const low = Math.min(12, byte(1) % 16); // a register in the low four bits
  const high = Math.min(12, Math.floor(byte(1) / 16)); // and one in the high four
  const imm = (at: number, n: number) => signExtend(n, readLE(p, i + at, n));
  const offset = (at: number, n: number) => i + Number(signed(n, readLE(p, i + at, n)));
  const ins: Instruction = { at: i, opcode, name: info.name, registers: [], immediates: [], skip: l, next: i + 1 + l };
  const rest = Math.min(4, Math.max(0, l - 1)); // an immediate after one register byte
  switch (info.layout) {
    case "none":
      break;
    case "regExtImm":
      ins.registers = [low];
      ins.immediates = [readLE(p, i + 2, 8)];
      break;
    case "offset":
      ins.target = offset(1, Math.min(4, l));
      break;
    case "regImm":
      ins.registers = [low];
      ins.immediates = [imm(2, rest)];
      break;
    case "regImmOffset": {
      const lX = Math.min(4, Math.floor(byte(1) / 16) % 8);
      ins.registers = [low];
      ins.immediates = [imm(2, lX)];
      ins.target = offset(2 + lX, Math.min(4, Math.max(0, l - lX - 1)));
      break;
    }
    case "regReg":
      ins.registers = [low, high]; // r_D, then r_A
      break;
    case "regRegImm":
      ins.registers = [low, high]; // r_A, then r_B
      ins.immediates = [imm(2, rest)];
      break;
    case "regRegOffset":
      ins.registers = [low, high];
      ins.target = offset(2, rest);
      break;
    case "regRegReg":
      ins.registers = [low, high, Math.min(12, byte(2))]; // r_A, r_B, r_D
      break;
  }
  return ins;
}

/** T (GP App. A.3): the instructions that end a basic block (all of them, not just 15.3's). */
const TERMINATORS = new Set([0, 1, 40, 50, 80, 180, 170, 171, 172, 173, 174, 175, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90]);

/** ϖ (GP App. A.3): where basic blocks start, at 0 and just after every terminator. */
export function basicBlocks(p: Program): Set<number> {
  const starts = new Set<number>([0]);
  for (let i = 0; i < p.code.length; i++) {
    if (startsInstruction(p, i) && TERMINATORS.has(p.code[i])) starts.add(i + 1 + skip(p, i));
  }
  return new Set([...starts].filter((n) => startsInstruction(p, n) && p.code[n] in OPCODES));
}

/** A machine at ı = 0, every register 0 unless given. */
export function newMachine(p: Program, registers: bigint[] = []): Machine {
  return { program: p, pc: 0, registers: Array.from({ length: 13 }, (_, i) => registers[i] ?? 0n), blocks: basicBlocks(p) };
}

export const copyMachine = (m: Machine): Machine => ({ ...m, registers: [...m.registers] });

/** The register an instruction writes, if it writes one. */
export function writes(ins: Instruction): number | undefined {
  const [a, , d] = ins.registers;
  if (["load_imm", "load_imm_64", "move_reg", "add_imm_64"].includes(ins.name)) return a;
  if (["add_64", "sub_64", "and", "or", "xor"].includes(ins.name)) return d;
  return undefined;
}

/** Ψ₁ (GP App. A.4), as the lesson's step runs it: ı moves on first, then the instruction may override. */
export function step(m: Machine): Exit {
  const ins = decode(m.program, m.pc);
  m.pc = ins.next; // most instructions just move on
  const [a, b, c] = ins.registers;
  const [x] = ins.immediates;
  const reg = m.registers;
  const jumpTo = (to: number): Exit => {
    if (!m.blocks.has(to)) return "panic"; // a jump must land at the start of a basic block
    m.pc = to;
    return "continue";
  };
  const branch = (taken: boolean): Exit => {
    if (!m.blocks.has(ins.target!) || !m.blocks.has(ins.next)) return "panic"; // both ways must start blocks
    m.pc = taken ? ins.target! : ins.next;
    return "continue";
  };
  switch (ins.name) {
    case "trap":
      return "panic";
    case "fallthrough":
      return jumpTo(ins.next);
    case "jump":
      return jumpTo(ins.target!);
    case "jump_ind": {
      const address = (reg[a] + x) % 2n ** 32n;
      if (address === HALT_ADDRESS) return "halt";
      const table = m.program.jumpTable;
      if (address === 0n || address > BigInt(table.length * 2) || address % 2n !== 0n) return "panic";
      return jumpTo(table[Number(address / 2n) - 1]);
    }
    case "load_imm":
    case "load_imm_64":
      reg[a] = x;
      return "continue";
    case "move_reg":
      reg[a] = reg[b];
      return "continue";
    case "add_imm_64":
      reg[a] = (reg[b] + x) % WRAP;
      return "continue";
    case "add_64":
      reg[c] = (reg[a] + reg[b]) % WRAP;
      return "continue";
    case "sub_64":
      reg[c] = (reg[a] + WRAP - reg[b]) % WRAP;
      return "continue";
    case "and":
      reg[c] = reg[a] & reg[b];
      return "continue";
    case "or":
      reg[c] = reg[a] | reg[b];
      return "continue";
    case "xor":
      reg[c] = reg[a] ^ reg[b];
      return "continue";
    case "branch_eq":
      return branch(reg[a] === reg[b]);
    case "branch_ne":
      return branch(reg[a] !== reg[b]);
    case "branch_eq_imm":
      return branch(reg[a] === x);
    case "branch_ne_imm":
      return branch(reg[a] !== x);
  }
  throw new Error(`${ins.name} isn't built`);
}

/** One step as the reader sees it: where it ran, what, how it ended, the machine after. */
export type Taken = { n: number; ins: Instruction; exit: Exit; before: Machine; after: Machine };

/** Steps a copy of m once. */
export function stepOnce(m: Machine, n: number): Taken {
  const after = copyMachine(m);
  const ins = decode(m.program, m.pc);
  const exit = step(after);
  return { n, ins, exit, before: m, after };
}

/** Ψ: steps until ε isn't ▸ (or `limit` steps, a guard: every program here stops long before). */
export function trace(m: Machine, limit = 1000): Taken[] {
  const steps: Taken[] = [];
  let now = m;
  while (steps.length < limit) {
    const s = stepOnce(now, steps.length + 1);
    steps.push(s);
    if (s.exit !== "continue") break;
    now = s.after;
  }
  return steps;
}

/** An immediate as a person would write it: negative if its top bit is set. */
export const asSigned = (x: bigint): string => String(x >= 2n ** 63n ? x - WRAP : x).replace("-", "−");
const plus = (x: bigint) => (x >= 2n ** 63n ? `+ (${asSigned(x)})` : `+ ${x}`);

/** An instruction in plain words. */
export function say(ins: Instruction): string {
  const [a, b, d] = ins.registers.map((r) => `r${r}`);
  const [x] = ins.immediates;
  switch (ins.name) {
    case "trap": return "trap: panic";
    case "fallthrough": return "fallthrough: carry on";
    case "jump": return `go to ${ins.target}`;
    case "jump_ind": return `go to the address ${a} ${plus(x)}`;
    case "load_imm":
    case "load_imm_64": return `load ${asSigned(x)} into ${a}`;
    case "move_reg": return `${a} = ${b}`;
    case "add_imm_64": return `${a} = ${b} ${plus(x)}`;
    case "add_64": return `${d} = ${a} + ${b}`;
    case "sub_64": return `${d} = ${a} − ${b}`;
    case "and": case "or": case "xor": return `${d} = ${a} ${ins.name} ${b}`;
    case "branch_eq": return `if ${a} = ${b}, go to ${ins.target}`;
    case "branch_ne": return `if ${a} ≠ ${b}, go to ${ins.target}`;
    case "branch_eq_imm": return `if ${a} = ${x}, go to ${ins.target}`;
    case "branch_ne_imm": return `if ${a} ≠ ${x}, go to ${ins.target}`;
  }
  return ins.name;
}

/** A program's instructions, in order, by walking `next` from 0. */
export function listing(p: Program): Instruction[] {
  const all: Instruction[] = [];
  for (let i = 0; i < p.code.length; i = all[all.length - 1].next) all.push(decode(p, i));
  return all;
}

/** Adding a negative immediate: it's 2^64 − k as 64 bits, so the sum wraps round 2^64 (or not, from below k). */
const negative = (from: bigint, x: bigint, result: bigint) =>
  `: ${from} + (2^64 − ${WRAP - x})${result < from ? ", wrapped round 2^64" : ""}`;

/** Where ı went, in words: on by skip, or somewhere an instruction sent it. */
export function explain(s: Taken): string {
  const { ins, exit, before, after } = s;
  const moved = `ı + 1 + skip(ı) = ${ins.at} + 1 + ${ins.skip} = ${ins.next}`;
  const address = () => (before.registers[ins.registers[0]] + ins.immediates[0]) % 2n ** 32n; // jump_ind's
  if (exit === "halt") return `That's ${address()} = 2^32 − 2^16, the halt address: ε = halt, and the machine stops.`;
  if (exit === "panic") {
    if (ins.name === "trap") return "ε = panic: the machine stops.";
    const bad = [ins.target, ins.next].find((t) => t !== undefined && !before.blocks.has(t));
    if (ins.name === "jump_ind") return `That's ${address()}: not the halt address, nor a jump-table entry. ε = panic.`;
    return `${bad} doesn't start a basic block, so ε = panic: the machine stops.`;
  }
  const w = writes(ins);
  const [x] = ins.immediates;
  const why =
    w === undefined ? "" :
    after.registers[w] === before.registers[w] ? " (it already was)" :
    ins.name === "add_imm_64" && x >= 2n ** 63n ? negative(before.registers[ins.registers[1]], x, after.registers[w]) : "";
  const wrote = w === undefined ? "" : `r${w} = ${after.registers[w]}${why}. `;
  if (ins.target !== undefined || ins.name === "fallthrough") {
    const sent = after.pc === ins.next ? `ı moves on to ${moved}` : `ı goes to ${after.pc}${after.pc < ins.at ? ", back" : ""}`;
    return `${wrote}${sent}. ε = ▸.`;
  }
  return `${wrote}ı moves on to ${moved}. ε = ▸.`;
}

/** The lesson's SUM: adds 10 + 9 + … + 1 into r2, then returns through r0. */
export const SUM = [[51, 0x02], [51, 0x03, 10], [1], [200, 0x32, 0x02], [149, 0x33, 0xff], [82, 0x03, 0xfa], [50, 0x00]];

/** The programs a reader can step: each the lesson's own. */
export const PROGRAMS: { id: string; name: string; about: string; instructions: number[][]; registers: bigint[] }[] = [
  {
    id: "sum",
    name: "the loop",
    about: "The lesson's SUM: adds 10 + 9 + … + 1 into r2, then returns through r0, which starts at the halt address.",
    instructions: SUM,
    registers: [HALT_ADDRESS],
  },
  {
    id: "no-fallthrough",
    name: "the loop, no fallthrough",
    about: "SUM with its fallthrough deleted, as in Break it on purpose: the loop now starts at 5, which follows a load_imm.",
    instructions: SUM.filter((i) => i[0] !== 1),
    registers: [HALT_ADDRESS],
  },
  {
    id: "middle",
    name: "a jump into the middle",
    about: "The lesson's second test: two loads, then a jump back to 3, the second load, which starts no basic block.",
    instructions: [[51, 0x02, 1], [51, 0x03, 2], [40, 0xfd]],
    registers: [],
  },
];
