// Lesson 15.10's widget: the Gray Paper's model CPU (App. A.9) running one basic block,
// cycle by cycle. The cost rows are lesson 15.9's (App. A.10), for the instructions the
// widgets use; the CPU is lesson 15.10's blockCost, step for step, keeping a frame of each
// cycle for the timeline. Lesson 15.11's widget (gas-meter.ts) prices its blocks here too.
// tools/widget-pipeline-gas.test.ts checks it against both lessons' own numbers.

/** How many of each execution unit: ALU, load, store, multiplier, divider (the GP's 𝔼). */
export type Units = [number, number, number, number, number];
export const UNIT_NAMES = ["ALU", "load", "store", "multiplier", "divider"];
const MANY = ["ALUs", "load units", "store units", "multipliers", "dividers"];
/** The model CPU's units, its decode slots and starts a cycle, its buffer, its overhead. */
export const UNITS: Units = [4, 4, 4, 1, 1];
export const DECODE_SLOTS = 4;
export const STARTS = 5;
export const BUFFER = 32;
export const OVERHEAD = 3;

/** An instruction: its name, its registers in the order the PVM decodes them (lesson 15.2),
 *  its immediate, a jump's target line, and a branch's cycles 𝔟 (20 unless set). */
export type Ins = { op: Op; regs: number[]; imm?: number; target?: number; b?: number };

/** A piece of how an instruction reads: text, register i, or the immediate. */
type Token = string | { r: number } | { imm: true };

const NONE: Units = [0, 0, 0, 0, 0];
const ALU: Units = [1, 0, 0, 0, 0];
const LOAD: Units = [1, 1, 0, 0, 0];
const STORE: Units = [1, 0, 1, 0, 0];
const MUL: Units = [1, 0, 0, 1, 0];
const DIV: Units = [1, 0, 0, 0, 1];

/** A row of lesson 15.9's table: cycles č, decode slots ď (a pair is 𝔓: does it write a
 *  register it reads?), units x̌, its layout, how it reads, and whether it ends a block (T). */
type Row = {
  cycles: number; slots: number | [number, number]; units: Units;
  layout: string; form: Token[]; ends?: boolean;
};
const r = (i: number) => ({ r: i });
const imm = { imm: true } as const;

const ROWS = {
  load_ind_u64: { cycles: 25, slots: 1, units: LOAD, layout: "regRegImm", form: [r(0), " = [", r(1), " + ", imm, "]"] },
  store_ind_u64: { cycles: 25, slots: 1, units: STORE, layout: "regRegImm", form: ["[", r(1), " + ", imm, "] = ", r(0)] },
  store_imm_ind_u64: { cycles: 25, slots: 1, units: STORE, layout: "regImmImm", form: ["[", r(0), " + ", imm, "] = 0"] },
  add_64: { cycles: 1, slots: [1, 2], units: ALU, layout: "regRegReg", form: [r(2), " = ", r(0), " + ", r(1)] },
  add_imm_64: { cycles: 1, slots: [1, 2], units: ALU, layout: "regRegImm", form: [r(0), " = ", r(1), " + ", imm] },
  and_imm: { cycles: 1, slots: [1, 2], units: ALU, layout: "regRegImm", form: [r(0), " = ", r(1), " & ", imm] },
  shlo_r_imm_alt_64: { cycles: 1, slots: 3, units: ALU, layout: "regRegImm", form: [r(0), " = ", imm, " >> ", r(1)] },
  mul_64: { cycles: 3, slots: [1, 2], units: MUL, layout: "regRegReg", form: [r(2), " = ", r(0), " × ", r(1)] },
  div_u_64: { cycles: 60, slots: 4, units: DIV, layout: "regRegReg", form: [r(2), " = ", r(0), " ÷ ", r(1)] },
  move_reg: { cycles: 0, slots: 1, units: NONE, layout: "regReg", form: [r(0), " = ", r(1)] },
  load_imm: { cycles: 1, slots: 1, units: NONE, layout: "regImm", form: [r(0), " = ", imm] },
  ecalli: { cycles: 100, slots: 4, units: ALU, layout: "imm", form: ["ecalli ", imm] },
  trap: { cycles: 2, slots: 1, units: NONE, layout: "none", form: ["trap"], ends: true },
  fallthrough: { cycles: 2, slots: 1, units: NONE, layout: "none", form: ["fallthrough"], ends: true },
  jump: { cycles: 15, slots: 1, units: NONE, layout: "offset", form: ["jump"], ends: true },
  load_imm_jump: { cycles: 15, slots: 1, units: NONE, layout: "regImmOffset", form: [r(0), " = ", imm, ", jump"], ends: true },
  jump_ind: { cycles: 22, slots: 1, units: NONE, layout: "regImm", form: ["jump to ", r(0)], ends: true },
  branch_ne_imm: { cycles: 20, slots: 1, units: ALU, layout: "regImmOffset", form: ["if ", r(0), " ≠ ", imm, " jump"], ends: true },
} satisfies Record<string, Row>;

export type Op = keyof typeof ROWS;
export const OPS = Object.keys(ROWS) as Op[];
const row = (op: Op): Row => ROWS[op];

/** Does it end a basic block (lesson 15.3's T)? */
export const ends = (ins: Ins): boolean => row(ins.op).ends === true;

/** How many registers an instruction names. */
export const registerCount = (op: Op): number => row(op).form.filter((t) => typeof t === "object" && "r" in t).length;

/** The instruction as it reads: "r2 = [r1 + 0]", "[r1 + 1432] = r0". */
export function say(ins: Ins): string {
  return row(ins.op).form.map((t) => {
    if (typeof t === "string") return t;
    if ("r" in t) return `r${ins.regs[t.r]}`;
    return String(ins.imm ?? 0);
  }).join("").replace(" + 0]", "]").replace(/\+ -(\d)/, "− $1");
}

/** Its pieces, for a builder: text, which register slot goes there, or "n" for the
 *  immediate (left out of an address when it's 0, as `say` does). */
export function tokens(ins: Ins): (string | number)[] {
  const pieces = row(ins.op).form.map((t) => (typeof t === "string" ? t : "r" in t ? t.r : "n"));
  const plus = pieces.findIndex((t, i) => t === " + " && pieces[i + 1] === "n" && String(pieces[i + 2]).startsWith("]"));
  return plus !== -1 && !ins.imm ? [...pieces.slice(0, plus), ...pieces.slice(plus + 2)] : pieces;
}

/** š and ř (GP App. A.9), as lesson 15.9's registersUsed: what it reads and writes. */
export function registersUsed(ins: Ins): { reads: number[]; writes: number[] } {
  const { op, regs } = ins;
  const { layout } = row(op);
  if (/^(store|branch|jump_ind)/.test(op)) return { reads: regs, writes: [] };
  if (layout === "regRegReg") return { reads: op.startsWith("cmov") ? regs : regs.slice(0, 2), writes: [regs[2]] };
  if (layout === "regReg") return { reads: [regs[1]], writes: [regs[0]] };
  return { reads: regs.slice(1), writes: regs.slice(0, 1) };
}

/** An instruction's cost row: č, ď and x̌. */
export function cost(ins: Ins): { cycles: number; slots: number; units: Units } {
  const { cycles, slots, units } = row(ins.op);
  const { reads, writes } = registersUsed(ins);
  const overlap = writes.some((w) => reads.includes(w));
  return {
    cycles: ins.op === "branch_ne_imm" ? (ins.b ?? 20) : cycles,
    slots: typeof slots === "number" ? slots : overlap ? slots[0] : slots[1],
    units,
  };
}

/** A reorder buffer entry's state: decoded, waiting, executing, finished, or retired. */
type State = "DEC" | "WAIT" | "EXE" | "FIN" | null;
/** What it waits on: register `reg`, made by entry `from`. */
type Need = { reg: number; from: number };
type Entry = { line: number; state: State; cycles: number; needs: Need[]; regs: number[]; made: number[]; units: Units };
type Cpu = { next: number | null; cycles: number; decode: number; start: number; units: Units; rob: Entry[] };

/** What a line of the block is at the start of a cycle, and what happens to it in it.
 *  `mark`: "" not yet decoded, W, E, F as the lesson prints them, "·" retired, "m" a
 *  move_reg (never in the buffer). `event`: decoded, or started, during this cycle. */
export type Mark = "" | "W" | "E" | "F" | "·" | "m";
export type Cell = { mark: Mark; event: "decoded" | "started" | null; left: number; why: string; wait?: "register" | "unit" | "start" };
/** The CPU at the start of a cycle (just after the clock ticks, as the lesson's watcher sees
 *  it), with what the cycle then does: one cell a line. `row` is the lesson's printout. */
export type Frame = { cycle: number; cells: Cell[]; row: string; buffer: number; retired: number; free: Units };
export type Run = { frames: Frame[]; cost: number; cycles: number };

const plus = (a: Units, b: Units, sign = 1) => a.map((u, k) => u + sign * b[k]) as Units;
const fits = (need: Units, free: Units) => need.every((u, k) => u <= free[k]);
const ready = (cpu: Cpu, e: Entry) => e.needs.every((n) => cpu.rob[n.from].cycles === 0);

/** S (GP App. A.9): the first waiting entry whose units are free and inputs ready. */
function readyToStart(cpu: Cpu): number | null {
  const i = cpu.rob.findIndex((e) => e.state === "WAIT" && fits(e.units, cpu.units) && ready(cpu, e));
  return i === -1 ? null : i;
}

/** X′ (GP App. A.9): decode one instruction; X^mov for a move_reg, X^dec for the rest. */
function decode(cpu: Cpu, block: Ins[], line: number): void {
  const ins = block[line];
  const { reads, writes } = registersUsed(ins);
  const after = ends(ins) || line + 1 >= block.length ? null : line + 1;
  if (ins.op === "move_reg") {
    // whatever makes the register it reads now makes its destination too
    for (const e of cpu.rob) {
      const feeds = e.regs.some((x) => reads.includes(x));
      e.regs = feeds ? [...e.regs, ...writes] : e.regs.filter((x) => !writes.includes(x));
    }
    cpu.next = after;
    cpu.decode -= 1;
    return;
  }
  const { cycles, slots, units } = cost(ins);
  const needs = reads.flatMap((reg) => cpu.rob.flatMap((e, from) => (e.regs.includes(reg) ? [{ reg, from }] : [])));
  for (const e of cpu.rob) e.regs = e.regs.filter((x) => !writes.includes(x));
  cpu.rob.push({ line, state: "DEC", cycles, needs, regs: [...writes], made: [...writes], units });
  cpu.next = after;
  cpu.decode -= slots;
}

/** X‴ (GP App. A.9): one tick of the clock; finished entries retire in order. */
function tick(cpu: Cpu): void {
  cpu.cycles += 1;
  cpu.decode = DECODE_SLOTS;
  cpu.start = STARTS;
  let retiring = true;
  for (const e of cpu.rob) {
    retiring &&= e.state === "FIN" || e.state === null;
    const executing = e.state === "EXE";
    if (executing && e.cycles === 1) cpu.units = plus(cpu.units, e.units); // done: units free
    if (retiring) e.state = null;
    else if (e.state === "DEC") e.state = "WAIT";
    else if (executing && e.cycles === 0) e.state = "FIN";
    if (executing && e.cycles > 0) e.cycles -= 1;
  }
}

const LETTER = { DEC: "D", WAIT: "W", EXE: "E", FIN: "F" } as const;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The start of a cycle, before anything happens in it. */
function opening(cpu: Cpu, block: Ins[]): Frame {
  const cells: Cell[] = block.map(() => ({ mark: "", event: null, left: 0, why: "" }));
  for (const e of cpu.rob) {
    cells[e.line].mark = e.state === null ? "·" : (LETTER[e.state] as Mark);
    cells[e.line].left = e.cycles;
  }
  const decoded = cpu.next === null ? block.length : cpu.next;
  block.forEach((ins, i) => { if (ins.op === "move_reg" && i < decoded) cells[i].mark = "m"; });
  return {
    cycle: cpu.cycles,
    cells,
    row: cpu.rob.map((e) => (e.state === null ? "." : LETTER[e.state])).join(" "),
    buffer: cpu.rob.filter((e) => e.state !== null).length,
    retired: cpu.rob.filter((e) => e.state === null).length,
    free: [...cpu.units] as Units,
  };
}

/** The end of the cycle: why each line is where it is, in plain words. */
function closing(frame: Frame, cpu: Cpu, block: Ins[]): void {
  const lineOf = (k: number) => cpu.rob[k].line + 1;
  for (const e of cpu.rob) {
    const cell = frame.cells[e.line];
    if (cell.event === "started") { cell.why = `ready: starts this cycle, ${plural(e.cycles, "cycle")} to run`; continue; }
    if (cell.event === "decoded") { cell.why = "decoded this cycle: it can start from the next"; continue; }
    if (cell.mark === "W") {
      const missing = e.needs.filter((n) => cpu.rob[n.from].cycles > 0);
      const busy = e.units.flatMap((u, k) => (u > cpu.units[k] ? [k] : []));
      if (missing.length) {
        cell.wait = "register";
        cell.why = `waits for ${missing.map((n) => {
          const via = cpu.rob[n.from].made.includes(n.reg) ? "" : " (through a move_reg)";
          return `r${n.reg}, which line ${lineOf(n.from)} is still making${via}`;
        }).join(", and ")}`;
      } else if (busy.length) {
        cell.wait = "unit";
        const which = busy.map((k) => (UNITS[k] === 1 ? `the one ${UNIT_NAMES[k]}` : `all ${UNITS[k]} ${MANY[k]}`));
        cell.why = `waits for a unit: ${which.join(" and ")} ${which.length === 1 && UNITS[busy[0]] === 1 ? "is" : "are"} busy`;
      } else {
        cell.wait = "start";
        cell.why = `waits: ${STARTS} instructions have started this cycle already`;
      }
    } else if (cell.mark === "E") {
      cell.why = e.cycles > 0
        ? `running: ${plural(e.cycles, "cycle")} to go`
        : "its cycles are done: what waits on it can start now; it's marked finished at the next tick";
    } else if (cell.mark === "F") {
      const ahead = cpu.rob.find((x) => x.state !== null && x.state !== "FIN" && x.line < e.line);
      cell.why = ahead ? `finished; retires once line ${ahead.line + 1} ahead of it has` : "finished; retires at the next tick";
    } else if (cell.mark === "·") {
      cell.why = "retired";
    }
  }
  block.forEach((ins, i) => {
    const cell = frame.cells[i];
    if (ins.op !== "move_reg" || (cell.mark !== "m" && cell.event !== "decoded")) return;
    const [d, a] = ins.regs;
    cell.why = cell.event === "decoded"
      ? `decoded this cycle, and it never enters the buffer: from now on, whatever makes r${a} makes r${d} too`
      : `free: never in the buffer; r${d} is r${a}'s value`;
  });
  if (cpu.next !== null) {
    const cell = frame.cells[cpu.next];
    const live = cpu.rob.filter((e) => e.state !== null).length;
    cell.why = live >= BUFFER
      ? `not decoded yet: the buffer is full (${BUFFER})`
      : `not decoded yet: it needs ${plural(cost(block[cpu.next]).slots, "decode slot")}, and ${cpu.decode} ${cpu.decode === 1 ? "is" : "are"} left this cycle`;
    for (let i = cpu.next + 1; i < block.length; i++) frame.cells[i].why = "not decoded yet: decoding goes in order";
  }
}

/**
 * ϱ^Δ (GP App. A.9), as lesson 15.10's blockCost, keeping each cycle's frame. Decode up to 4
 * slots a cycle, start up to 5, run them on (4, 4, 4, 1, 1) units, retire in order; the cost
 * is the cycles until all are retired, less 3, and at least 1. `block` ends at a terminator.
 */
export function simulate(block: Ins[]): Run {
  const cpu: Cpu = { next: 0, cycles: 0, decode: DECODE_SLOTS, start: STARTS, units: [...UNITS], rob: [] };
  const frames: Frame[] = [];
  let frame = opening(cpu, block);
  for (;;) {
    const live = cpu.rob.filter((e) => e.state !== null).length;
    const next = cpu.next;
    const starting = readyToStart(cpu);
    if (next !== null && cost(block[next]).slots <= cpu.decode && live < BUFFER) {
      decode(cpu, block, next);
      frame.cells[next].event = "decoded";
    } else if (starting !== null && cpu.start > 0) {
      const e = cpu.rob[starting];
      cpu.start -= 1;
      cpu.units = plus(cpu.units, e.units, -1);
      e.state = "EXE";
      frame.cells[e.line].event = "started";
    } else if (next === null && live === 0) {
      closing(frame, cpu, block);
      frames.push(frame);
      return { frames, cost: Math.max(cpu.cycles - OVERHEAD, 1), cycles: cpu.cycles };
    } else {
      closing(frame, cpu, block);
      frame.free = [...cpu.units] as Units;
      frames.push(frame);
      tick(cpu);
      frame = opening(cpu, block);
    }
  }
}

/** ϱ^Δ alone. */
export const blockCost = (block: Ins[]): number => simulate(block).cost;

/** Two frames that look the same in the timeline: same marks, nothing happening. */
export const sameLook = (a: Frame, b: Frame): boolean =>
  a.cells.every((c, i) => c.mark === b.cells[i].mark && !c.event && !b.cells[i].event);

/** The timeline's columns: runs of frames that look the same, up to frame `upTo`. */
export function columns(frames: Frame[], upTo: number): { from: number; to: number }[] {
  const cols: { from: number; to: number }[] = [];
  for (let i = 0; i <= upTo && i < frames.length; i++) {
    const last = cols.at(-1);
    if (last && sameLook(frames[last.to], frames[i])) last.to = i;
    else cols.push({ from: i, to: i });
  }
  return cols;
}

/** The next frame after `at` that looks different, or the last. */
export function nextChange(frames: Frame[], at: number): number {
  for (let i = at + 1; i < frames.length; i++) if (!sameLook(frames[i], frames[at])) return i;
  return frames.length - 1;
}

/** Lesson 15.10's own blocks (its tests), plus 15.9's real one; each ends with its terminator. */
const load = (d: number, base: number): Ins => ({ op: "load_ind_u64", regs: [d, base], imm: 0 });
const div = (a: number, b: number, d: number): Ins => ({ op: "div_u_64", regs: [a, b, d] });
const trap: Ins = { op: "trap", regs: [] };
export const PRESETS: { id: string; say: string; block: Ins[] }[] = [
  { id: "four", say: "four loads", block: [load(2, 1), load(3, 1), load(4, 1), load(5, 1), trap] },
  { id: "five", say: "five loads", block: [load(2, 1), load(3, 1), load(4, 1), load(5, 1), load(6, 1), trap] },
  { id: "chain", say: "a chain", block: [load(2, 1), load(3, 2), load(4, 3), trap] },
  { id: "move", say: "through move_reg", block: [load(2, 1), { op: "move_reg", regs: [5, 2] }, load(3, 5), trap] },
  { id: "divides", say: "two divides", block: [div(0, 1, 2), div(0, 1, 3), trap] },
  {
    id: "real", say: "15.9's real block", block: [
      { op: "add_imm_64", regs: [1, 1], imm: -1440 },
      { op: "store_ind_u64", regs: [0, 1], imm: 1432 },
      { op: "store_ind_u64", regs: [5, 1], imm: 1424 },
      { op: "store_ind_u64", regs: [6, 1], imm: 1416 },
      { op: "move_reg", regs: [5, 8] },
      { op: "move_reg", regs: [6, 7] },
      { op: "load_imm_jump", regs: [0], imm: 2558 },
    ],
  },
];

/** What the builder offers: a line's instruction, and the block's last. */
export const BODY_OPS: Op[] = ["load_ind_u64", "store_ind_u64", "add_64", "mul_64", "div_u_64", "move_reg", "load_imm"];
export const END_OPS: Op[] = ["trap", "jump"];
export const MOST_LINES = 10;

/** A fresh instruction of kind `op`, keeping what registers it can from `old`. */
export function retype(op: Op, old?: Ins): Ins {
  const n = registerCount(op);
  const fallback = [2, 1, 3];
  const regs = Array.from({ length: n }, (_, i) => old?.regs[i] ?? fallback[i]);
  return { op, regs, ...(row(op).form.includes(imm) ? { imm: 0 } : {}) };
}

/** The widget's tasks, ticked by what the reader steps to, never by a click on the task. */
export const GOALS = [
  { id: "together", say: "find a cycle where two instructions run at once" },
  { id: "register", say: "make one wait for a register another is still making" },
  { id: "unit", say: "make one wait for a busy unit (the one divider, say)" },
  { id: "cost", say: "step to the end: find the block's cost ϱ^Δ" },
];

/** The goals frame `at` of a run shows. */
export function goalsMet(run: Run, at: number): string[] {
  const { cells } = run.frames[at];
  const met: string[] = [];
  if (cells.filter((c) => c.mark === "E" && c.left > 0).length >= 2) met.push("together");
  if (cells.some((c) => c.wait === "register")) met.push("register");
  if (cells.some((c) => c.wait === "unit")) met.push("unit");
  if (at === run.frames.length - 1) met.push("cost");
  return met;
}
