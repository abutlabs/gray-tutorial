// Lesson 15.11's widget: the gas meter (GP App. A.4) on a small program with a loop. A basic
// block is paid for in full on the way in, at its price from lesson 15.10's model CPU
// (pipeline.ts); without the gas for it, the machine stops oog and nothing changes. Lines
// stand for ı here, instead of byte addresses. tools/widget-pipeline-gas.test.ts checks it.

import type { Ins } from "./pipeline.ts";
import { blockCost, ends, say } from "./pipeline.ts";

/** Where r0 points at the start (lesson 15.8): jumping there halts the machine. */
export const HALT_ADDRESS = 2 ** 32 - 2 ** 16;

/** The widget's program: three blocks. Count r1 down from 3, adding it into r2 each lap;
 *  then ask the host something, and return to r0, the halt address. */
export const PROGRAM: Ins[] = [
  { op: "load_imm", regs: [1], imm: 3 }, // 0: start
  { op: "load_imm", regs: [2], imm: 0 },
  { op: "fallthrough", regs: [] },
  { op: "add_64", regs: [2, 1, 2] }, // 3: the loop, r2 = r2 + r1
  { op: "add_imm_64", regs: [1, 1], imm: -1 },
  { op: "branch_ne_imm", regs: [1], imm: 0, target: 3 },
  { op: "ecalli", regs: [], imm: 0 }, // 6: the end
  { op: "jump_ind", regs: [0], imm: 0 },
];
export const LOOP = 3;

/** ϖ: where basic blocks start, line 0 and every line after a terminator. */
export const blockStarts = (program: Ins[]): number[] =>
  [0, ...program.flatMap((ins, i) => (ends(ins) && i + 1 < program.length ? [i + 1] : []))];

/** 𝔟 (GP App. A.10): a branch costs 1 if either way it can go starts with trap or unlikely. */
export function priced(program: Ins[]): Ins[] {
  const lucky = (i: number) => (program[i]?.op ?? "trap") === "trap"; // past the end: trap
  return program.map((ins, i) =>
    ins.op === "branch_ne_imm" ? { ...ins, b: lucky(i + 1) || lucky(ins.target!) ? 1 : 20 } : ins);
}

/** The block starting at line `at`: up to and including its terminator. */
export function blockAt(program: Ins[], at: number): Ins[] {
  const end = program.findIndex((ins, i) => i >= at && ends(ins));
  return program.slice(at, end === -1 ? program.length : end + 1);
}

/** ϱ^Δ for the block starting at `at`. */
export const costAt = (program: Ins[], at: number): number => blockCost(blockAt(priced(program), at));

/** How a step ends (GP's ε): carry on (▸), the host is called, halt, panic, out of gas. */
export type Exit = "▸" | "host" | "halt" | "panic" | "oog";

/** The machine: ı (a line), its registers, its gas ϱ, the flag, its steps, how it stands,
 *  and the blocks it has paid for, in order. */
export type Meter = { pc: number; regs: number[]; gas: number; paid: boolean; steps: number; exit: Exit; bought: number[] };

/** A machine at line 0 with `gas`: r0 holds the halt address, as the standard program sets. */
export const start = (gas: number): Meter =>
  ({ pc: 0, regs: [HALT_ADDRESS, ...Array(12).fill(0)], gas, paid: false, steps: 0, exit: "▸", bought: [] });

/** What one step did: the host answering first, the block paid for, the line run. */
export type Event = { resumed: boolean; charged: number | null; block: number | null; ran: number | null; exit: Exit; lines: string[] };

/** One step of Ψ₁ with gas (GP App. A.4), as lesson 15.11's stepWithGas. If the host was
 *  called, it answers first: ı moves past the ecalli. Returns the new machine and the event. */
export function step(program: Ins[], before: Meter): { m: Meter; event: Event } {
  const m: Meter = { ...before, regs: [...before.regs], bought: [...before.bought] };
  const event: Event = { resumed: false, charged: null, block: null, ran: null, exit: m.exit, lines: [] };
  if (["halt", "panic", "oog"].includes(m.exit)) return { m: before, event };
  if (m.exit === "host") {
    m.pc += 1; // the host has answered; the block is still paid for
    m.exit = "▸";
    event.resumed = true;
    event.lines.push(`The host answers: ı moves past the ecalli, to line ${m.pc + 1}.`);
  }
  m.steps += 1;
  if (!m.paid) {
    const cost = costAt(program, m.pc);
    event.block = m.pc;
    if (m.gas < cost) {
      // out of gas: nothing else changes, not ı, not the registers, not the gas
      event.exit = "oog";
      event.lines.push(`The block at line ${m.pc + 1} costs ${cost}, and only ${m.gas} is left: oog. Nothing runs, and the gas stays ${m.gas}.`);
      return { m: { ...m, exit: "oog" }, event };
    }
    m.gas -= cost;
    m.paid = true;
    m.bought.push(m.pc);
    event.charged = cost;
    event.lines.push(`The block at line ${m.pc + 1} isn't paid for: it costs ${cost}, ${m.gas + cost} → ${m.gas}. Paid.`);
  } else {
    event.lines.push("The block is paid for already: no charge.");
  }
  const ins = program[m.pc];
  event.ran = m.pc;
  m.exit = run(m, ins);
  event.exit = m.exit;
  if (m.exit === "▸" && ends(ins)) {
    m.paid = false; // wherever it landed is a new block
    event.lines.push(`Line ${event.ran + 1}, ${say(ins)}, ends the block: ı goes to line ${m.pc + 1}, and the flag goes off.`);
  } else {
    event.lines.push(`Line ${event.ran + 1}: ${say(ins)}. ${outcome(m, ins)}`.trim());
  }
  return { m, event };
}

/** What a line does to the machine (lesson 15.3's step, for the instructions used here). */
function run(m: Meter, ins: Ins): Exit {
  const [x, y, z] = ins.regs;
  const n = ins.imm ?? 0;
  switch (ins.op) {
    case "load_imm": m.regs[x] = n; break;
    case "add_64": m.regs[z] = m.regs[x] + m.regs[y]; break;
    case "add_imm_64": m.regs[x] = m.regs[y] + n; break;
    case "fallthrough": break;
    case "jump": m.pc = ins.target ?? m.pc; return "▸";
    case "branch_ne_imm": m.pc = m.regs[x] !== n ? ins.target! : m.pc + 1; return "▸";
    case "ecalli": return "host"; // ı stays on it; the host moves it on
    case "jump_ind": return (m.regs[x] + n) % 2 ** 32 === HALT_ADDRESS ? "halt" : "panic";
    case "trap": return "panic";
    default: throw new Error(`the meter's machine doesn't run ${ins.op}`);
  }
  m.pc += 1;
  return "▸";
}

function outcome(m: Meter, ins: Ins): string {
  if (m.exit === "host") return "The machine stops to ask the host; ı stays on the ecalli.";
  if (m.exit === "halt") return "r0 is the halt address: halt.";
  if (m.exit === "panic") return "panic.";
  if (!["add_64", "add_imm_64"].includes(ins.op)) return "";
  const w = ins.regs[ins.op === "add_64" ? 2 : 0];
  return `r${w} is now ${m.regs[w]}.`;
}

/** Steps until the machine stops: halts, panics, runs out of gas, or calls the host. */
export function runToStop(program: Ins[], m: Meter): { m: Meter; events: Event[] } {
  const events: Event[] = [];
  for (let i = 0; i < 1000; i++) {
    const s = step(program, m);
    m = s.m;
    events.push(s.event);
    if (m.exit !== "▸") break;
  }
  return { m, events };
}

/** The least gas that halts: every block it pays for, added up. */
export function leastToHalt(program: Ins[]): number {
  let m = start(Number.MAX_SAFE_INTEGER);
  for (let n = 0; n < 100 && (m.exit === "▸" || m.exit === "host"); n++) m = runToStop(program, m).m;
  return m.bought.reduce((sum, at) => sum + costAt(program, at), 0);
}

/** The widget's tasks, ticked by what the reader's run does. */
export const GOALS = [
  { id: "lap", say: "run out of gas at the start of a lap, after paying for at least one" },
  { id: "least", say: "find the least gas that halts" },
  { id: "host", say: "see the step after a host call charge nothing" },
];

/** The goals a step brought about, from the machine after it and what it did. */
export function goalsMet(after: Meter, event: Event): string[] {
  const met: string[] = [];
  if (event.exit === "oog" && event.block === LOOP && after.bought.includes(LOOP)) met.push("lap");
  if (event.exit === "halt" && after.gas === 0) met.push("least");
  if (event.resumed && event.charged === null && event.ran !== null) met.push("host");
  return met;
}
