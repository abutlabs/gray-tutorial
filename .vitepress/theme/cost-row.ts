// Lesson 15.9's widget: one row of the gas cost table, for an instruction and registers the
// reader picks. š and ř (the registers it reads and writes), 𝔓 (does it write one it reads?),
// 𝔓_S (is D the same as A?) and 𝔟 (does either way a branch goes start with trap or
// unlikely?) decide the row. The rows and registersUsed are the lesson's gas.ts, for the
// instructions offered. tools/widget-cost-row.test.ts checks them against its tests and run.

export type Units = [number, number, number, number, number];
export type Cost = { cycles: number; slots: number; units: Units };
export const UNIT_NAMES = ["ALU", "load", "store", "mul", "div"];
const NONE: Units = [0, 0, 0, 0, 0];
const ALU: Units = [1, 0, 0, 0, 0];
const LOAD: Units = [1, 1, 0, 0, 0];
const STORE: Units = [1, 0, 1, 0, 0];
const MUL: Units = [1, 0, 0, 1, 0];
const DIV: Units = [1, 0, 0, 0, 1];
const MEMORY = 25;

/** The instructions offered: name, layout, and what its registers are called, in order. */
export const INSTRUCTIONS = [
  { name: "add_64", layout: "regRegReg", regs: ["A", "B", "D"], says: "φ_D = φ_A + φ_B" },
  { name: "mul_32", layout: "regRegReg", regs: ["A", "B", "D"], says: "φ_D = φ_A × φ_B, in 32 bits" },
  { name: "shlo_l_64", layout: "regRegReg", regs: ["A", "B", "D"], says: "φ_D = φ_A shifted left by φ_B" },
  { name: "div_u_64", layout: "regRegReg", regs: ["A", "B", "D"], says: "φ_D = φ_A ÷ φ_B" },
  { name: "cmov_iz", layout: "regRegReg", regs: ["A", "B", "D"], says: "φ_D = φ_A if φ_B is 0" },
  { name: "load_ind_u64", layout: "regRegImm", regs: ["A", "B"], says: "φ_A = memory at φ_B" },
  { name: "store_ind_u64", layout: "regRegImm", regs: ["A", "B"], says: "memory at φ_B = φ_A" },
  { name: "move_reg", layout: "regReg", regs: ["D", "A"], says: "φ_D = φ_A" },
  { name: "branch_eq", layout: "regRegOffset", regs: ["A", "B"], says: "jump if φ_A = φ_B" },
  { name: "ecalli", layout: "imm", regs: [], says: "call the host" },
] as const;
export type Name = (typeof INSTRUCTIONS)[number]["name"];

/** š and ř, as the lesson's registersUsed reads them off the layout. */
export function registersUsed(name: string, layout: string, r: number[]): { reads: number[]; writes: number[] } {
  if (/^(store|branch|jump_ind)/.test(name)) return { reads: r, writes: [] };
  if (layout === "regRegReg") return { reads: name.startsWith("cmov") ? r : r.slice(0, 2), writes: [r[2]] };
  if (layout === "regReg") return { reads: [r[1]], writes: [r[0]] };
  return { reads: name.startsWith("cmov") ? r : r.slice(1), writes: r.slice(0, 1) };
}

/** What sits where a branch can go: 𝔟 is 1 if either way starts with trap (0) or unlikely (2). */
export type Landing = "fallthrough" | "trap" | "unlikely";
export const branchCost = (next: Landing, target: Landing): number => ([next, target].some((w) => w !== "fallthrough") ? 1 : 20);

/** The instruction's row, for its registers (and, for a branch, where it can land). */
export function rowOf(name: Name, r: number[], next: Landing = "fallthrough", target: Landing = "fallthrough") {
  const ins = INSTRUCTIONS.find((i) => i.name === name)!;
  const { reads, writes } = registersUsed(name, ins.layout, r);
  const overlap = writes.some((w) => reads.includes(w));
  const p = (x: number, y: number) => (overlap ? x : y);
  const ps = (x: number, y: number) => (r[0] === r[2] ? x : y);
  const cost = (cycles: number, slots: number, units: Units): Cost => ({ cycles, slots, units });
  const rows: Record<Name, () => Cost> = {
    add_64: () => cost(1, p(1, 2), ALU),
    mul_32: () => cost(4, p(2, 3), MUL),
    shlo_l_64: () => cost(1, ps(2, 3), ALU),
    div_u_64: () => cost(60, 4, DIV),
    cmov_iz: () => cost(2, 2, ALU),
    load_ind_u64: () => cost(MEMORY, 1, LOAD),
    store_ind_u64: () => cost(MEMORY, 1, STORE),
    move_reg: () => cost(0, 1, NONE),
    branch_eq: () => cost(branchCost(next, target), 1, ALU),
    ecalli: () => cost(100, 4, ALU),
  };
  return { reads, writes, overlap, sameDA: r[0] === r[2], cost: rows[name]() };
}
export const unitsOf = (u: Units): string => UNIT_NAMES.filter((_, k) => u[k] > 0).join("+") || "none";
