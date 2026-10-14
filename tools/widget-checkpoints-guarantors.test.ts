// Lesson 16.6's checkpoint widget and lesson 12.1's guarantor widget, checked against the
// values those lessons (and the ones they build on) state and check their own code with.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Exit, Step } from "../.vitepress/theme/checkpoints.ts";
import { AMOUNT, apply, collapse, keeps, keysOf, MOST_STEPS, run, same, START, VALUE } from "../.vitepress/theme/checkpoints.ts";
import {
  ACTIVE_CORES, assignCores, assignments, BLANK, byCore, E, ETA2, ETA3, KAPPA, LAMBDA, R, SEVENS, seats, shuffleSteps, turns, V, ZEROS,
} from "../.vitepress/theme/guarantors.ts";
import { lessonText } from "./lessons.ts";

const CHECKPOINTS = "16-host-calls/06-checkpoints.md";
const GUARANTORS = "12-guarantees/01-who-guarantees-what.md";

/** What a run leaves, ended `exit`: the kept context. */
const ending = (steps: Step[], exit: Exit) => collapse(run(steps).at(-1)!, exit);

test("checkpoints: the lesson's first test, a write kept by a halt and undone by a panic", () => {
  const text = lessonText(CHECKPOINTS);
  const sizes = [...text.matchAll(/after(Halt|Panic)\.get\(0\)!\.storage\.size, (\d+)\)/g)];
  assert.equal(sizes.length, 2, "read the lesson's two storage sizes");
  for (const [, how, size] of sizes) {
    const kept = ending(["write last"], how === "Halt" ? "halt" : "panic");
    assert.equal(keysOf(kept).length, Number(size), how);
  }
});

test("checkpoints: the lesson's second test and its example, only the write before the checkpoint survives", () => {
  const text = lessonText(CHECKPOINTS);
  const [, hex] = text.match(/assert\.deepEqual\(keys, \["0x([0-9a-f]+)"\]\)/)!;
  const key = Buffer.from(hex, "hex").toString(); // "last"
  assert.match(text, /a write, a checkpoint,\s+another write, then a panic: only the first write survives/);
  assert.deepEqual(keysOf(ending(["write last", "checkpoint", "write ast"], "panic")), [key]);
  assert.match(text, /"last" → 1, 2, 3/);
  assert.equal(VALUE, "01 02 03");
});

test("checkpoints: service 0 is lesson 16.5's record, and 17.3 sends a hundred", () => {
  assert.match(lessonText("16-host-calls/05-storage.md"), /2 items in 50 bytes and a balance of 1,000/);
  assert.equal(START.balance, 1000);
  assert.match(lessonText("17-accumulation/03-sending-a-transfer.md"), /service 0 sends service 1 a hundred/);
  assert.equal(AMOUNT, 100);
  // 16.5's minimum balance with both writes: 100 + 10 per item + 1 per byte, 2 + 2 items in
  // 50 + (34 + 4 + 3) + (34 + 3 + 3) bytes; the most transfers a run can send still leave more
  const minimum = 100 + 10 * (2 + 2) + (50 + 41 + 40);
  assert.ok(START.balance - MOST_STEPS * AMOUNT >= minimum, "never CASH, never FULL");
});

test("checkpoints: every host call changes X; checkpoint copies X into Y, a copy X can't reach", () => {
  const [start, wrote, saved, sent] = run(["write last", "checkpoint", "transfer"]);
  assert.ok(same(start.x, START) && same(start.y, START), "I(…)²: the start, twice");
  assert.deepEqual([keysOf(wrote.x), keysOf(wrote.y)], [["last"], []]);
  assert.ok(same(saved.x, saved.y), "Y′ = X");
  assert.notEqual(saved.x, saved.y, "a copy, not the same object");
  assert.deepEqual([sent.x.balance, sent.y.balance, sent.x.sent, sent.y.sent], [900, 1000, [100], []]);
  const after = apply(saved, "write ast");
  assert.deepEqual(keysOf(after.y), ["last"], "a write after the checkpoint leaves Y alone");
});

test("checkpoints: C keeps X on a halt, Y on a panic or out of gas", () => {
  assert.deepEqual((["halt", "panic", "out of gas"] as Exit[]).map(keeps), ["X", "Y", "Y"]);
  const steps: Step[] = ["write last", "transfer", "checkpoint", "write ast", "transfer"];
  const halted = ending(steps, "halt");
  assert.deepEqual([keysOf(halted), halted.balance, halted.sent], [["last", "ast"], 800, [100, 100]]);
  for (const exit of ["panic", "out of gas"] as Exit[]) {
    const kept = ending(steps, exit);
    assert.deepEqual([keysOf(kept), kept.balance, kept.sent], [["last"], 900, [100]], exit);
  }
  // no checkpoint: a failed run changes nothing (17.3: send, then panic, and the money stays)
  assert.ok(same(ending(["transfer", "write last", "write ast"], "panic"), START));
  assert.ok(same(ending(["checkpoint", "transfer"], "out of gas"), START), "a checkpoint before anything keeps nothing");
});

test("guarantors: tiny's sizes are the lesson's", () => {
  const code = lessonText(GUARANTORS);
  const tiny = code.match(/export const TINY: Config = \{([^}]+)\}/)![1];
  const field = (name: string) => Number(tiny.match(new RegExp(`${name}: (\\d+)`))![1]);
  assert.deepEqual([V, E, R], [field("validators_count"), field("epoch_length"), field("rotation_period")]);
  assert.equal(ACTIVE_CORES, field("core_count"));
  assert.deepEqual(seats(V), [0, 0, 0, 1, 1, 1]);
});

test("guarantors: the lesson's run of report_prev_rotation-1, M and M* at slot 14", () => {
  const text = lessonText(GUARANTORS);
  const [, slot, rotation] = text.match(/^slot (\d+), rotation (\d+)$/m)!.map(Number);
  const cores = (line: string) => [...line.matchAll(/core \d: ([\d ]+?)(?= \||$)/gm)].map((m) => m[1].split(" ").map(Number));
  const now = cores(text.match(/^ {2}this rotation: (.+)$/m)![1]);
  const then = cores(text.match(/^ {2}the last one: +(.+)$/m)![1]);
  assert.equal(Math.floor(slot / R), rotation);
  const { current, last } = assignments(slot, ETA2, []);
  assert.deepEqual(byCore(current.cores), now);
  assert.deepEqual(byCore(last.cores), then);
  assert.deepEqual([last.slot, last.set, last.entropy], [10, "λ′", ETA3], "slot 10: the previous epoch's λ′ and η′₃");
  // "λ′'s 2 (key 0x4418…) is κ′'s 0 now, on core 1 … back then core 0 was its job"
  const [, key] = text.match(/λ′'s\s+2 \(key `0x([0-9a-f]{4})…`\) is κ′'s 0 now, on core 1/)!;
  assert.deepEqual([LAMBDA[2], KAPPA[0]], [key, key]);
  assert.deepEqual([current.cores[0], last.cores[2]], [1, 0]);
});

test("guarantors: the lesson's first test, three per core and everyone one core on after R slots", () => {
  assert.match(lessonText(GUARANTORS), /assignCores\(TINY, 6, e, 4\); \/\/ R = 4 slots later/);
  const now = assignCores(SEVENS, 0);
  assert.deepEqual(byCore(now).map((c) => c.length), [3, 3]);
  assert.deepEqual(assignCores(SEVENS, 4), now.map((c) => (c + 1) % 2));
});

test("guarantors: the shuffle is the reference client's, for every entropy the widget offers", () => {
  // the reference's shuffleWithHash([0, 1, 2, 3, 4, 5], e) and assignCores(TINY, 6, e, t)
  const order = (e: typeof ETA2) => shuffleSteps([0, 1, 2, 3, 4, 5], e.numbers).map((s) => s.picked);
  assert.deepEqual([ETA2, ETA3, SEVENS, ZEROS].map(order), [[5, 0, 4, 3, 2, 1], [3, 2, 1, 4, 5, 0], [4, 2, 1, 5, 0, 3], [5, 2, 1, 4, 3, 0]]);
  assert.deepEqual(assignCores(SEVENS, 9), [1, 0, 0, 1, 0, 1]);
  assert.deepEqual(assignCores(ZEROS, 17), [0, 1, 1, 0, 0, 1]);
  // each pick: r mod (what's left), and the last item fills the gap
  const steps = shuffleSteps([0, 1, 2, 3, 4, 5], ETA2.numbers);
  assert.deepEqual(steps.map((s) => s.pool.length), [6, 5, 4, 3, 2, 1]);
  assert.deepEqual(steps[1].pool, [0, 1, 2, 3, 4], "seat 5 picked first, nothing to fill");
  assert.deepEqual(steps[2].pool, [4, 1, 2, 3], "seat 0 picked, seat 4 fills the gap");
});

test("guarantors: rotations, M* in the same epoch, and a full rotation coming back", () => {
  assert.deepEqual([12, 15, 16, 19, 20, 23].map(turns), [0, 0, 1, 1, 2, 2]);
  for (let slot = 16; slot < 24; slot++) {
    const { current, last } = assignments(slot, ETA2, []);
    assert.equal(last.set, "κ′", `${slot}: τ′ − R is in the same epoch`);
    assert.deepEqual(current.cores, last.cores.map((c) => (c + 1) % ACTIVE_CORES), `${slot}: everyone one core on`);
  }
  assert.deepEqual(assignCores(ETA2, 20), assignCores(ETA2, 12), "two moves round two cores: back where they began");
  for (let slot = 12; slot < 16; slot++) assert.equal(assignments(slot, ETA2, []).last.set, "λ′", `${slot}`);
});

test("guarantors: an offender keeps its seat, its key blanked in M and M*, as the reference's Φ does", () => {
  const { current, last } = assignments(14, ETA2, ["4418"]);
  assert.deepEqual(current.cores, assignments(14, ETA2, []).current.cores);
  assert.deepEqual(current.keys, [BLANK, "ad93", "cab2", "f30a", "8b8c", "ab00"]);
  assert.deepEqual(last.keys, ["cab2", "ab00", BLANK, "8b8c", "ad93", "f30a"]);
});
