// Lesson 15.3's PVM stepper, checked against the programs, results and run the lesson
// itself states, so the machine a reader steps runs as the lesson's code does.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assemble, basicBlocks, decode, explain, HALT_ADDRESS, listing, newMachine, PROGRAMS, say, skip, step, SUM, trace, writes,
} from "../.vitepress/theme/pvm-stepper.ts";
import type { Exit } from "../.vitepress/theme/pvm-stepper.ts";
import { lessonText } from "./lessons.ts";

const MACHINE = "15-the-pvm/03-the-machine.md";

/** `[51, 0x02], [1], …` as the lesson writes instructions: one array of numbers each. */
const parse = (list: string): number[][] => [...list.matchAll(/\[([^\[\]]+)\]/g)].map((m) => m[1].split(",").map((n) => Number(n.trim())));
const program = (id: string) => PROGRAMS.find((p) => p.id === id)!;
const runOf = (id: string) => trace(newMachine(assemble(program(id).instructions), program(id).registers));

test("SUM is the lesson's, and its run halts with r2 = 55 and r3 = 0, as the lesson's first test says", () => {
  const text = lessonText(MACHINE);
  const sums = [...text.matchAll(/const SUM = assemble\(\[\n([\s\S]+?)\n\]\);/g)].map((m) => parse(m[1].replace(/\/\/.*$/gm, "")));
  assert.equal(sums.length, 2, "the test's SUM and bin/run.ts's");
  for (const sum of sums) assert.deepEqual(SUM, sum);
  assert.deepEqual(program("sum").instructions, SUM);
  const [, exit] = text.match(/const exit: Exit = run\(machine\);\s+assert\.equal\(exit, "(\w+)"\)/)!;
  const final = Object.fromEntries([...text.matchAll(/assert\.equal\(machine\.registers\[(\d+)\], (\d+)n\)/g)].map(([, r, v]) => [r, BigInt(v)]));
  assert.deepEqual(Object.keys(final), ["2", "3"]);
  assert.match(text, /newMachine\(SUM, \[HALT_ADDRESS\]\)/);
  assert.deepEqual(program("sum").registers, [HALT_ADDRESS], "r0 starts at the halt address");
  const steps = runOf("sum");
  const end = steps[steps.length - 1];
  assert.equal(end.exit, exit);
  for (const [r, v] of Object.entries(final)) assert.equal(end.after.registers[Number(r)], v, `r${r}`);
});

test("SUM's run, step by step, is bin/run.ts's: where, what, the registers changed, and 34 steps", () => {
  const text = lessonText(MACHINE);
  const lines = [...text.matchAll(/^step +(\d+) +at +(\d+) +(\w+) *(.*)$/gm)];
  assert.ok(lines.length >= 12, "the lesson's run");
  const steps = runOf("sum");
  for (const [, n, at, name, changed] of lines) {
    const s = steps[Number(n) - 1];
    const shown = s.after.registers.flatMap((v, r) => (v !== s.before.registers[r] ? [`r${r} = ${v}`] : []));
    assert.deepEqual([s.ins.at, s.ins.name, shown.join(", ")], [Number(at), name, changed.trim()], `step ${n}`);
  }
  const [, count] = text.match(/^(\d+) steps: two loads/m)!;
  assert.equal(steps.length, Number(count));
  assert.match(text, /the machine stops: halt, with r2 = 55/);
});

test("without its fallthrough the loop runs once, r2 reaches 10, and the branch back to 5 panics", () => {
  const text = lessonText(MACHINE);
  const [, r2] = text.match(/The loop runs\s+once, r2 reaches (\d+), and then the branch back panics/)!;
  const [, target] = text.match(/its target, now (\d+), follows a\s+`load_imm`/)!;
  const steps = runOf("no-fallthrough");
  const end = steps[steps.length - 1];
  assert.deepEqual([end.exit, end.ins.name, end.ins.target], ["panic", "branch_ne_imm", Number(target)]);
  assert.equal(end.after.registers[2], BigInt(r2));
  assert.ok(!basicBlocks(assemble(program("no-fallthrough").instructions)).has(Number(target)));
  assert.match(explain(end), new RegExp(`^${target} doesn't start a basic block`));
});

test("the lesson's second test: a jump to 0 carries on, a jump to 3 (after a load_imm) panics", () => {
  const text = lessonText(MACHINE);
  const [, toStart] = text.match(/newMachine\(assemble\((\[\[.+?\]\])\)\); \/\/ jumps to 0/)!;
  const [, middle] = text.match(/const program: Program = assemble\((\[\[.+?\]\])\); \/\/ jumps to 3/)!;
  const looping = newMachine(assemble(parse(toStart)));
  assert.deepEqual([step(looping), step(looping), looping.pc], ["continue", "continue", 0]);
  assert.deepEqual(program("middle").instructions, parse(middle));
  const [, expected] = text.match(/assert\.deepEqual\(steps, \[("\w+", "\w+", "\w+")\]\)/)!;
  assert.deepEqual(runOf("middle").map((s) => s.exit), expected.split(", ").map((e) => e.slice(1, -1)));
  assert.equal(runOf("middle")[2].ins.target, 3);
});

test("the lesson's third test: trap panics, and so does jump_ind to 8 with no jump table", () => {
  const text = lessonText(MACHINE);
  assert.match(text, /step\(newMachine\(assemble\(\[\[0\]\]\)\)\);\s+assert\.equal\(trapped, "panic"\)/);
  assert.equal(step(newMachine(assemble([[0]]))), "panic");
  assert.match(text, /run\(newMachine\(assemble\(\[\[50, 0x00\]\]\), \[8n\]\)\); \/\/ r0 = 8/);
  assert.equal(trace(newMachine(assemble([[50, 0x00]]), [8n]))[0].exit, "panic");
  assert.equal(trace(newMachine(assemble([[50, 0x00]]), [HALT_ADDRESS]))[0].exit, "halt");
  assert.match(text, /special: 2\^32 − 2\^16/);
  assert.equal(HALT_ADDRESS, 4294901760n);
});

test("the widget offers one program that halts and two that panic, each stopping", () => {
  const ends: Exit[] = PROGRAMS.map((p) => runOf(p.id).at(-1)!.exit);
  assert.deepEqual(ends, ["halt", "panic", "panic"]);
});

test("decoding and skip: lesson 15.3's notes on SUM's bytes, and lesson 15.2's napkin program", () => {
  const sum = assemble(SUM);
  const ins = listing(sum);
  assert.deepEqual(ins.map((i) => i.at), [0, 2, 5, 6, 9, 12, 15], "the addresses in SUM's comments");
  assert.deepEqual(ins.map((i) => i.skip), [1, 2, 0, 2, 2, 2, 1]);
  assert.deepEqual(ins.map((i) => i.next), ins.map((i) => i.at + 1 + skip(sum, i.at)));
  // "0x32 packs two registers, r2 and r3. 0xff is −1, sign-extended. 0xfa is −6, the jump back."
  assert.deepEqual(ins[3].registers, [2, 3, 2], "add_64: r_A = r2, r_B = r3, r_D = r2");
  assert.equal(ins[4].immediates[0], 2n ** 64n - 1n);
  assert.equal(ins[5].target, 12 - 6);
  assert.deepEqual(ins.map(say), [
    "load 0 into r2", "load 10 into r3", "fallthrough: carry on", "r2 = r2 + r3", "r3 = r3 + (−1)", "if r3 ≠ 0, go to 6",
    "go to the address r0 + 0",
  ]);
  assert.deepEqual(ins.map(writes), [2, 3, undefined, 2, 3, undefined, undefined], "add_64 its third, add_imm_64 its first");
  // 15.2: load_imm r1, −1 | add_64 r3 = r1 + r2 | jump back 3 bytes | trap
  const napkin = assemble([[51, 0x01, 0xff], [200, 0x21, 0x03], [40, 0xfd], [0]]);
  assert.deepEqual(decode(napkin, 0).immediates, [2n ** 64n - 1n]);
  assert.deepEqual([decode(napkin, 3).registers, decode(napkin, 3).next], [[1, 2, 3], 6]);
  assert.equal(decode(napkin, 6).target, 3);
});

test("arithmetic wraps around at 2^64", () => {
  const max = 2n ** 64n - 1n;
  const m = newMachine(assemble([[149, 0x11, 0xff], [200, 0x11, 0x02], [201, 0x43, 0x05], [100, 0x16], [0]]), [0n, 0n, 0n, 0n, 1n]);
  const s = trace(m);
  assert.equal(s[0].after.registers[1], max, "0 + (−1) is 2^64 − 1");
  assert.equal(s[1].after.registers[2], max - 1n, "(2^64 − 1) + (2^64 − 1) wraps to 2^64 − 2");
  assert.equal(s[2].after.registers[5], max, "0 − 1 wraps to 2^64 − 1");
  assert.equal(s[3].after.registers[6], max, "move_reg r6 = r1");
  assert.equal(s.at(-1)!.exit, "panic");
  assert.match(explain(runOf("sum")[4]), /^r3 = 9: 10 \+ \(2\^64 − 1\), wrapped round 2\^64\. ı moves on to/);
});

test("basic blocks: 0, and right after every terminator; a branch checks both ways", () => {
  assert.deepEqual([...basicBlocks(assemble(SUM))].sort((a, b) => a - b), [0, 6, 15]);
  // branch_eq_imm r2, 0 → 0: its next, 3, follows a terminator, so both ways start blocks
  const ok = newMachine(assemble([[81, 0x02, 0x00], [0]]));
  assert.deepEqual([step(ok), ok.pc], ["continue", 0]);
  // the same branch alone: taken, to 0, but its next (3) is past the end and starts nothing
  const alone = newMachine(assemble([[81, 0x02, 0x00]]));
  assert.deepEqual([decode(alone.program, 0).target, step(alone)], [0, "panic"]);
});
