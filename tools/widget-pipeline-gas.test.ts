// Lessons 15.10 and 15.11's widgets: the model CPU (PipelineCycles) against the blocks and
// costs the lessons' own tests and printouts give, and the gas meter (GasMeter) against
// 15.11's own runs and the meter's rules: oog changes nothing, each block entry charges
// exactly its cost, and a loop pays once a lap.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Ins, Op } from "../.vitepress/theme/pipeline.ts";
import { blockCost, columns, cost, goalsMet, nextChange, PRESETS, say, simulate, UNIT_NAMES } from "../.vitepress/theme/pipeline.ts";
import type { Event, Meter } from "../.vitepress/theme/gas-meter.ts";
import * as meter from "../.vitepress/theme/gas-meter.ts";
import { lessonText } from "./lessons.ts";

const COSTS = "15-the-pvm/09-what-instructions-cost.md";
const PIPELINE = "15-the-pvm/10-the-pipeline.md";
const GAS = "15-the-pvm/11-the-gas-meter.md";

/** The few instructions the lessons' tests assemble by hand, from their bytes (lesson 15.2). */
function decode(bytes: number[]): Ins | null {
  const [opcode, b1 = 0, b2 = 0] = bytes;
  const [lo, hi] = [b1 % 16, Math.floor(b1 / 16)];
  const table: Record<number, () => Ins> = {
    0: () => ({ op: "trap", regs: [] }),
    10: () => ({ op: "ecalli", regs: [], imm: b1 }),
    40: () => ({ op: "jump", regs: [] }),
    100: () => ({ op: "move_reg", regs: [lo, hi] }), // [D, A]
    123: () => ({ op: "store_ind_u64", regs: [lo, hi], imm: 0 }), // [A, B]
    130: () => ({ op: "load_ind_u64", regs: [lo, hi], imm: 0 }),
    200: () => ({ op: "add_64", regs: [lo, hi, b2] }), // [A, B, D]
    202: () => ({ op: "mul_64", regs: [lo, hi, b2] }),
    203: () => ({ op: "div_u_64", regs: [lo, hi, b2] }),
  };
  return table[opcode]?.() ?? null;
}
/** "[130, 0x12], [0]" as byte arrays. */
const byteLists = (args: string): number[][] =>
  JSON.parse(`[${args.replace(/0x[0-9a-f]+/gi, (h) => String(parseInt(h, 16))).replace(/,\s*$/, "")}]`);

/** Every `const x: number = gas(...)` in lesson 15.10's tests, with the cost it asserts. */
function lessonBlocks(): Map<string, { block: Ins[]; cost: number }> {
  const text = lessonText(PIPELINE);
  const found = new Map<string, { block: Ins[]; cost: number }>();
  for (const [, name, args, n] of text.matchAll(/const (\w+): number = gas\(([\s\S]*?)\);[^\n]*\n\s*assert\.equal\(\1, (\d+)\)/g)) {
    found.set(name, { block: byteLists(args).map((b) => decode(b)!), cost: Number(n) });
  }
  return found;
}

test("the model CPU prices every block of lesson 15.10's tests as the lesson does", () => {
  const blocks = lessonBlocks();
  assert.equal(blocks.size, 10); // trap, jump, 1/4/5 loads, chains of 2 and 3, the move, 1 and 2 divides
  for (const [name, { block, cost: n }] of blocks) assert.equal(blockCost(block), n, name);
  const strip = (b: Ins[]) => b.map((i) => ({ op: i.op, regs: i.regs }));
  const same = { four: "fourLoads", five: "fiveLoads", chain: "chainOfThree", move: "throughMove", divides: "twoDivides" };
  for (const [id, name] of Object.entries(same)) {
    const preset = PRESETS.find((p) => p.id === id)!;
    assert.deepEqual(strip(preset.block), strip(blocks.get(name)!.block), id); // the widget's blocks are the lesson's
  }
});

test("15.9's real block: its cost sheet, its 91 cycles, 26 gas, and 15.10's printout cycle by cycle", () => {
  const real = PRESETS.find((p) => p.id === "real")!.block;
  // lesson 15.9's sheet: each line's name, cycles, slots and units
  const sheet = [...lessonText(COSTS).matchAll(/^(\w+)\s+cycles\s+(\d+)\s+slots (\d)\s+([\w+]+)$/gm)];
  assert.equal(sheet.length, real.length);
  const UNITS = { ALU: "ALU", load: "load", store: "store", mul: "multiplier", div: "divider" } as Record<string, string>;
  sheet.forEach(([, name, cycles, slots, units], i) => {
    const c = cost(real[i]);
    const ours = UNIT_NAMES.filter((_, k) => c.units[k] > 0).join("+") || "none";
    assert.deepEqual([real[i].op, c.cycles, c.slots, ours], [name, Number(cycles), Number(slots), units.split("+").map((u) => UNITS[u] ?? u).join("+")]);
  });
  const [, adds] = /Add up its cycles and you\s+get (\d+)/.exec(lessonText(COSTS))!;
  assert.equal(real.reduce((sum, ins) => sum + cost(ins).cycles, 0), Number(adds));

  const text = lessonText(PIPELINE);
  const [, gas] = /the block at \d+ costs (\d+) gas/.exec(text)!;
  const run = simulate(real);
  assert.equal(run.cost, Number(gas));
  // the lesson's watcher prints the buffer after each tick, when it changes
  const printed = [...text.matchAll(/^cycle\s+(\d+)  ([WEF. ]+)$/gm)].map(([, c, row]) => `${c} ${row}`);
  const ours: string[] = [];
  let last = "";
  for (const f of run.frames) if (f.row !== last) { ours.push(`${f.cycle} ${f.row}`); last = f.row; }
  assert.deepEqual(ours, printed);
  // the timeline folds the same-looking cycles into one column, as the printout does
  const label = (c: { from: number; to: number }) => (c.from === c.to ? `${c.from}` : `${c.from}–${c.to}`);
  assert.deepEqual(columns(run.frames, run.frames.length - 1).map(label), ["0", "1", "2", "3", "4–17", "18–27", "28", "29"]);
  assert.equal(nextChange(run.frames, 4), 18);
});

test("lesson 15.9's rows: add_64 in place or not, a load, a store, a divide, ecalli", () => {
  const text = lessonText(COSTS);
  let checked = 0;
  for (const [, name, args] of text.matchAll(/const (\w+): Cost = costOf\(([\[\]\dxa-f, ]+)\);/g)) {
    const ins = decode(byteLists(args)[0]);
    if (!ins) continue; // a branch: its 𝔟 is lesson 15.11's program's business, below
    const c = cost(ins);
    const whole = new RegExp(`assert\\.deepEqual\\(${name}, \\{ cycles: (\\d+), slots: (\\d+), units: \\[([\\d, ]+)\\] \\}\\)`).exec(text);
    if (whole) assert.deepEqual([c.cycles, c.slots, c.units.join(", ")], [Number(whole[1]), Number(whole[2]), whole[3]], name);
    for (const [, field, n] of text.matchAll(new RegExp(`assert\\.equal\\(${name}\\.(cycles|slots), (\\d+)\\)`, "g"))) {
      assert.equal(c[field as "cycles" | "slots"], Number(n), `${name}.${field}`);
    }
    checked++;
  }
  assert.equal(checked, 6);
});

test("the timeline says why a line waits: a register, the one divider, the load units", () => {
  const why = (id: string) => {
    const run = simulate(PRESETS.find((p) => p.id === id)!.block);
    return { run, says: run.frames.flatMap((f) => f.cells.map((c) => c.why)) };
  };
  const chain = why("chain");
  assert.ok(chain.says.includes("waits for r2, which line 1 is still making"));
  assert.ok(why("move").says.includes("waits for r5, which line 1 is still making (through a move_reg)"));
  assert.ok(why("divides").says.includes("waits for a unit: the one divider is busy"));
  assert.ok(why("five").says.includes("waits for a unit: all 4 ALUs and all 4 load units are busy"));
  assert.ok(why("real").says.includes("not decoded yet: it needs 1 decode slot, and 0 are left this cycle"));
  // goals: the reader's stepping lands on frames that show them
  const met = (id: string) => {
    const { run } = why(id);
    return new Set(run.frames.flatMap((_, at) => goalsMet(run, at)));
  };
  assert.deepEqual([...met("four")].sort(), ["cost", "together"]);
  assert.deepEqual([...met("chain")].sort(), ["cost", "register", "together"]); // the trap runs beside the first load
  assert.deepEqual([...met("divides")].sort(), ["cost", "together", "unit"]);
  const alone = simulate([{ op: "trap", regs: [] }]);
  assert.deepEqual(alone.frames.flatMap((_, at) => goalsMet(alone, at)), ["cost"]);
  assert.deepEqual(goalsMet(chain.run, 0), []); // cycle 0: nothing shown yet
  assert.equal(say(PRESETS[5].block[0]), "r1 = r1 − 1440");
  assert.equal(say(PRESETS[5].block[1]), "[r1 + 1432] = r0");
});

// ---- the gas meter ----

/** Runs to the end, the host answering each ecalli: the machine and every step's event. */
function runAll(program: Ins[], gas: number): { m: Meter; events: Event[]; history: Meter[] } {
  let m = meter.start(gas);
  const events: Event[] = [];
  const history: Meter[] = [m];
  for (let n = 0; !["halt", "panic", "oog"].includes(m.exit); n++) {
    assert.ok(n < 10_000, "the machine never stops");
    const s = meter.step(program, m);
    m = s.m;
    events.push(s.event);
    history.push(m);
  }
  return { m, events, history };
}

test("15.11's own runs: a jump to itself pays 15 a lap, and a block is paid in full or not at all", () => {
  const text = lessonText(GAS);
  const [, lap] = /each lap pays (\d+)/.exec(text)!;
  const [, budget] = /newMachine\(assemble\(\[\[40, 0\]\]\), \[\], new Map\(\), (\d+)n\)/.exec(text)!;
  const [, left] = /assert\.equal\(machine\.gas, (\d+)n\); \/\/ (\w+) laps paid for/.exec(text)!;
  const loop: Ins[] = [{ op: "jump", regs: [], target: 0 }];
  assert.equal(meter.costAt(loop, 0), Number(lap));
  const ran = runAll(loop, Number(budget));
  assert.equal(ran.m.exit, "oog");
  assert.equal(ran.m.gas, Number(left));
  assert.equal(ran.m.bought.length, 6); // "six laps paid for"

  const [, price] = /load_imm r2, 7; trap: (\d+) gas/.exec(text)!;
  const block: Ins[] = [{ op: "load_imm", regs: [2], imm: 7 }, { op: "trap", regs: [] }];
  assert.equal(meter.costAt(block, 0), Number(price));
  const poor = runAll(block, Number(price) - 1);
  assert.deepEqual([poor.m.exit, poor.m.regs[2], poor.m.gas], ["oog", 0, Number(price) - 1]); // not even the load_imm ran
  const rich = runAll(block, Number(price));
  assert.deepEqual([rich.m.exit, rich.m.regs[2], rich.m.gas], ["panic", 7, 0]);
});

test("15.11's bootstrap path: the model CPU prices its five blocks 15, 26, 27, 73 and 102", () => {
  // the blocks the bootstrap service's accumulation pays for, as reference/ decodes them
  const ins = (op: Op, regs: number[], imm?: number): Ins => ({ op, regs, imm });
  const stores = (offset: number, ...regs: number[]) => regs.map((r, i) => ins("store_ind_u64", [r, 1], offset - 8 * i));
  const blocks: [number, Ins[]][] = [
    [5, [ins("jump", [])]],
    [92078, PRESETS.find((p) => p.id === "real")!.block],
    [123687, [ins("add_imm_64", [1, 1], -248), ...stores(240, 0, 5, 6), ins("store_imm_ind_u64", [1], 176),
      ins("add_imm_64", [7, 1], 200), ins("add_imm_64", [8, 1], 176), ins("load_imm_jump", [0], 3154)]],
    [121410, [ins("add_imm_64", [1, 1], -64), ...stores(56, 0, 5, 6, 7), ins("load_ind_u64", [10, 8], 0),
      ins("load_ind_u64", [9, 8], 8), ins("load_ind_u64", [8, 8], 16), ins("load_imm", [11], 0),
      ins("shlo_r_imm_alt_64", [7, 10], 20359), ins("and_imm", [7, 7], 1), ins("load_imm", [12], 0),
      { op: "branch_ne_imm", regs: [7], imm: 0, b: 20 }]],
    [121467, [ins("store_ind_u64", [8, 1], 8), ins("store_ind_u64", [9, 1], 16), ins("load_imm", [6], -9),
      ins("load_imm", [7], 0), ins("load_imm", [8], 0), ins("load_imm", [9], 0), ins("store_ind_u64", [10, 1], 24),
      ins("load_imm", [0], 3134), ins("ecalli", [], 2), ins("fallthrough", [])]],
  ];
  const text = lessonText(GAS);
  const out = text.slice(text.indexOf("with 1000 gas:"));
  const printed = [...out.matchAll(/block at\s+(\d+) costs (\d+)/g)].slice(0, 5).map(([, at, n]) => [Number(at), Number(n)]);
  assert.deepEqual(blocks.map(([at, b]) => [at, blockCost(b)]), printed);
  const [, spent] = /having spent (\d+)/.exec(out)!;
  assert.equal(printed.reduce((sum, [, n]) => sum + n, 0), Number(spent));
});

test("the meter's rules on the widget's program, for every starting gas from 0 to 200", () => {
  const program = meter.PROGRAM;
  const starts = meter.blockStarts(program);
  assert.deepEqual(starts, [0, meter.LOOP, 6]);
  const price = starts.map((at) => meter.costAt(program, at));
  assert.equal(meter.costAt(program, meter.LOOP), blockCost(program.slice(3, 6).map((i) => ({ ...i, b: 20 }))));
  const least = price[0] + 3 * price[1] + price[2]; // start, three laps, the end
  assert.equal(meter.leastToHalt(program), least);
  for (let gas = 0; gas <= 200; gas++) {
    const { m, events, history } = runAll(program, gas);
    let charged = 0;
    events.forEach((e, i) => {
      const [before, after] = [history[i], history[i + 1]];
      if (e.exit === "oog") {
        // nothing changes: no instruction, the gas, ı, the registers and the flag as they were
        assert.equal(e.ran, null);
        assert.deepEqual({ ...after, steps: 0, exit: "" }, { ...before, steps: 0, exit: "", pc: e.resumed ? before.pc + 1 : before.pc });
        assert.ok(before.gas < meter.costAt(program, before.pc));
      } else if (e.charged !== null) {
        // a block entry: the flag was off, ı starts a block, and it pays exactly that block's cost
        assert.equal(before.paid, false);
        assert.ok(starts.includes(e.block!));
        assert.equal(e.charged, meter.costAt(program, e.block!));
        assert.equal(after.gas, before.gas - e.charged);
        charged += e.charged;
      } else {
        assert.equal(after.gas, before.gas); // paid already: free
      }
    });
    assert.equal(m.gas, gas - charged);
    const laps = events.filter((e) => e.charged !== null && e.block === meter.LOOP).length;
    const backs = events.filter((e) => e.ran === 5 && history[events.indexOf(e) + 1].pc === meter.LOOP).length;
    if (m.exit === "halt") {
      assert.equal(laps, 3); // once a lap
      assert.equal(m.gas, gas - least);
      assert.deepEqual(m.regs.slice(1, 3), [0, 6]); // 3 + 2 + 1
    } else {
      assert.equal(m.exit, "oog");
      assert.ok(gas < least);
    }
    assert.ok(laps === backs || laps === backs + 1); // entered from the start, then once per jump back
  }
});

test("the meter's goals: oog at a lap's door, the least gas that halts, and a host call paying nothing", () => {
  const program = meter.PROGRAM;
  const reached = (gas: number) => {
    const { events, history } = runAll(program, gas);
    return new Set(events.flatMap((e, i) => meter.goalsMet(history[i + 1], e)));
  };
  const least = meter.leastToHalt(program);
  assert.deepEqual([...reached(least)].sort(), ["host", "least"]);
  assert.deepEqual([...reached(least + 1)], ["host"]); // halts, with 1 left over
  assert.deepEqual([...reached(least - 1)], []); // can't pay for the end: oog at its door
  assert.deepEqual([...reached(50)], ["lap"]); // the start, one lap, 27 left... two laps, 6 left: the third can't
  assert.deepEqual([...reached(10)], []); // oog at the first lap: no lap paid yet
  const end = runAll(program, least - 1);
  assert.deepEqual([end.m.pc, end.m.gas, end.m.bought.length], [6, least - 1 - (least - meter.costAt(program, 6)), 4]);
  // the step after the ecalli: the host answers, ı moves on, and nothing is charged
  const run = runAll(program, least);
  const after = run.events.find((e) => e.resumed)!;
  assert.deepEqual([after.charged, after.ran, after.exit], [null, 7, "halt"]);
});
