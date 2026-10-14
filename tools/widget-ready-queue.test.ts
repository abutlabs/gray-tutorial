// Lesson 17.2's ReadyQueue widget: its queue and history against the lesson's own example,
// the lesson's own edit and unlock, and the chain vectors' blocks transcribed as letters.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import type { QueueState, Report, Waiter } from "../.vitepress/theme/ready-queue.ts";
import { block, chainStart, describe, E, edit, emptyState, goalsMet, lessonStart, listOf, unlock } from "../.vitepress/theme/ready-queue.ts";
import { lessonText, lessonCode } from "./lessons.ts";

const LESSON = "17-accumulation/02-waiting-reports.md";

/** Blocks one after another from `state`: [slot, reports] each. */
function blocks(state: QueueState, ...runs: [number, Report[]][]) {
  const steps = [];
  for (const [slot, reports] of runs) {
    const step = block(state, slot, reports);
    steps.push(step);
    state = step.state;
  }
  return steps;
}
/** ω as letters: each non-empty list, "7: B←A E←CD". */
const ringOf = (s: QueueState) =>
  s.ready.flatMap((l, i) => (l.length ? [`${i}: ${l.map((w) => `${w.pkg}←${w.deps.join("")}`).join(" ")}`] : []));
const r = (pkg: string, ...deps: string[]): Report => ({ pkg, deps });

test("the ready queue widget runs 17.2's example: D waits at slot 43 in list 7, and goes with A at 44", () => {
  const text = lessonText(LESSON);
  const [, at, e, list] = /a report arriving at slot (\d+) on tiny waits in list\s+\1 mod (\d+) = (\d+)/.exec(text)!;
  assert.equal(E, Number(e));
  assert.equal(listOf(Number(at)), Number(list));
  const [, since, needs, slot] = /D has been waiting since\s+slot (\d+) for package (\w); the block at slot (\d+) brings \2; both go/.exec(text)!;
  const [, after, one, two] = /after the block at slot (\d+), its newest set holds (\w) and (\w)/.exec(text)!;
  assert.equal(after, slot);

  const { state, incoming } = lessonStart();
  assert.deepEqual(incoming, [r("D", needs)]);
  const [first, second] = blocks(state, [Number(since), incoming], [Number(slot), [r(needs)]]);
  assert.deepEqual(ringOf(first.state), [`${list}: D←A`]); // the lesson's test: one waiting
  assert.equal(first.waiting.length, 1);
  assert.equal(second.state.ready.flat().length, 0); // D has gone
  assert.deepEqual([...second.state.history.at(-1)!.pkgs].sort(), [one, two]); // A and D
  assert.equal(second.accumulated.length, 2);
  const words = describe(second, first.state);
  assert.ok(words.includes("A waits for nothing: it goes now."), words.join("\n"));
  assert.ok(words.includes("That unlocks: D (waiting for A since slot 43)."), words.join("\n"));
  assert.deepEqual(goalsMet(first), ["wait"]);
  assert.deepEqual(goalsMet(second), ["same"]);
});

test("the widget's edit and unlock are the lesson's E and Q, on every small queue", () => {
  const code = lessonCode("17.2");
  const pick = (name: string) => new RegExp(`export function ${name}\\([\\s\\S]*?\\n}\\n`).exec(code)![0];
  // the lesson's two functions, types taken out, run on letters: a report is its package
  const plain = (pick("edit") + pick("unlock"))
    .replaceAll("export ", "")
    .replace(/: (Waiting|WorkReport)\[\]/g, "")
    .replace(/: Set<string>/g, "");
  type Theirs = { report: string; dependencies: Set<string> }[];
  const lesson: { edit: (q: Theirs, d: Set<string>) => Theirs; unlock: (q: Theirs) => string[] } =
    new Function("packageOf", `${plain}\nreturn { edit, unlock };`)((x: string) => x);
  const letters = "ABCD";
  let checked = 0;
  for (let n = 0; n < 4 ** 7; n++) {
    // n spells a queue of up to three waiters, each a package and at most one dependency
    const digits = [...n.toString(4).padStart(7, "0")].map(Number);
    const queue: Waiter[] = [];
    for (let i = 0; i < digits[0] % 4; i++) {
      const deps = digits[2 * i + 2] === digits[2 * i + 1] ? [] : [letters[digits[2 * i + 2]]];
      queue.push({ pkg: letters[digits[2 * i + 1]], deps, wanted: deps, since: 0 });
    }
    const theirs = queue.map((w) => ({ report: w.pkg, dependencies: new Set(w.deps) }));
    for (const done of [new Set<string>(), new Set(["A"]), new Set(["A", "C"])]) {
      const ours = edit(queue, done).map((w) => [w.pkg, w.deps]);
      assert.deepEqual(ours, lesson.edit(theirs, done).map((w) => [w.report, [...w.dependencies]]));
    }
    assert.deepEqual(unlock(queue).waves.flat().map((w) => w.pkg), lesson.unlock(theirs), JSON.stringify(queue));
    checked++;
  }
  assert.equal(checked, 4 ** 7);
});

test("the chain vectors, as letters: ω and ξ after each block are their post-states", () => {
  // enqueue_and_unlock_chain-1 to -4: A 38b7a75b, B 774935b6, C 18176cfb, D 6af0ea4c,
  // E d54f4257, F a7a66c16, G f5983aaa (the first four hex digits of each package's hash)
  const steps = blocks(emptyState(42),
    [43, [r("B", "A"), r("E", "C", "D")]],
    [44, [r("D", "B"), r("G", "F")]],
    [46, [r("C", "A"), r("F")]],
    [47, [r("A")]]);
  assert.deepEqual(steps.map((s) => ringOf(s.state)), [
    ["7: B←A E←CD"],
    ["7: B←A E←CD", "8: D←B G←F"],
    ["7: B←A E←CD", "8: D←B", "10: C←A"],
    [],
  ]);
  assert.deepEqual(steps.map((s) => s.state.history.at(-1)!.pkgs), [[], [], ["F", "G"], ["A", "B", "C", "D", "E"]]);
  assert.deepEqual(steps[3].state.history.at(-2)!.pkgs, ["F", "G"]); // ξ moved on one block
  assert.deepEqual(steps[3].waves.map((w) => w.map((x) => x.pkg)), [["B", "C"], ["D"], ["E"]]);
  assert.deepEqual(chainStart().state, steps[2].state); // the widget's start is chain-3's end
  assert.deepEqual(goalsMet(steps[3]), ["same", "chain"]);
});

test("a waiter is given up after an epoch, or when its slot is skipped, but can still go that block", () => {
  const [, , third] = blocks(emptyState(42), [43, [r("B", "A")]], [44, [r("C", "A")]], [46, []]);
  assert.deepEqual(ringOf(third.state), ["7: B←A", "8: C←A"]); // skipping slot 45 empties only list 9
  const atEpoch = block(third.state, 55, []); // list 7 again: B has waited 12 slots
  assert.deepEqual(atEpoch.givenUp.map((w) => w.pkg), ["B"]);
  assert.deepEqual(ringOf(atEpoch.state), ["8: C←A"]);
  const later = block(third.state, 56, []); // past list 8 too, and list 7 was skipped
  assert.deepEqual(later.givenUp.map((w) => w.pkg), ["C", "B"]);
  assert.deepEqual(ringOf(later.state), []);
  assert.ok(describe(later, third.state).includes("9 slots skipped since slot 46: their lists are emptied."));
  const rescued = block(third.state, 56, [r("A")]); // read before they're given up
  assert.deepEqual(rescued.accumulated, ["A", "C", "B"]); // the ring from list 8: C, then B
  assert.deepEqual(rescued.givenUp, []);
});

test("ξ remembers: a report needing a package done earlier goes at once, and done packages' reports are dropped", () => {
  const [, step] = blocks(emptyState(42), [43, [r("A")]], [44, [r("X", "A"), r("A", "B")]]);
  assert.deepEqual(step.cleared, [{ pkg: "X", deps: ["A"] }]);
  assert.deepEqual(step.accumulated, ["X"]);
  assert.deepEqual(step.dropped.map((d) => [d.w.pkg, d.why]), [["A", "remembered"]]);
  assert.deepEqual(goalsMet(step), ["history"]);
  // a waiter whose package arrives with no dependencies of its own is dropped, not run twice
  const [, again] = blocks(emptyState(42), [43, [r("D", "A")]], [44, [r("D")]]);
  assert.deepEqual(again.accumulated, ["D"]);
  assert.deepEqual(again.dropped.map((d) => [d.w.pkg, d.why]), [["D", "went"]]);
  assert.deepEqual(goalsMet(again), []);
});
