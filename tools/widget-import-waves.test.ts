// Lesson 19.1's import-waves widget, checked against the lesson's own graph and its plan's
// printed waves, so the dependency graph a reader taps is the one the lesson's code runs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  BEFORE, BLOCK, LAST_WAVE, MOST_INPUTS, NAMES, PARTS, STEPS, WAVES, builtIn, dependentsOf, inputsOf, isLongestChain,
  keyOf, latestInput, makerOf, nextTrail, stepName, symbolParts, waveOf, wavesOf,
} from "../.vitepress/theme/import-waves.ts";
import type { Step } from "../.vitepress/theme/import-waves.ts";
import { LESSONS, lessonText } from "./lessons.ts";

const LESSON = "19-block-import/01-the-order-of-things.md";
const text = lessonText(LESSON);
const symbols = (list: string) => list.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));

test("the widget's graph is the lesson's STEPS, line for line, lessons and all", () => {
  const array = /export const STEPS: Step\[\] = \[([\s\S]*?)\n\];/.exec(text)![1];
  const steps = [...array.matchAll(/makes: \[([^\]]*)\],\s*from: \[([^\]]*)\],\s*lesson: "([^"]*)"/g)]
    .map(([, makes, from, lesson]) => ({ makes: symbols(makes), from: symbols(from), lesson }));
  assert.equal(steps.length, 16, "the Gray Paper's sixteen lines");
  assert.deepEqual(STEPS, steps);
});

test("the ≺ lines the lesson spells out are in the graph", () => {
  const lines = [...text.matchAll(/^- (\S+) ≺ \(([^)]*)\)/gm)];
  assert.equal(lines.length, 2, "ρ‡ and γ′");
  for (const [, made, from] of lines) assert.deepEqual(makerOf(made)?.from, symbols(from), made);
});

test("the waves are the lesson's plan: bin/plan.ts's waves, step for step", () => {
  const plan = text.slice(text.indexOf("node bin/plan.ts\n```"));
  const printed: { makes: string[]; from: string[] }[][] = [];
  for (const line of plan.split("\n")) {
    if (/^wave \d+:$/.test(line)) printed.push([]);
    const step = /^ {2}(.+) ← (.+?) {2}\(lesson .+\)$/.exec(line);
    if (step) printed.at(-1)!.push({ makes: symbols(step[1]), from: symbols(step[2]) });
  }
  assert.equal(printed.length, 4, "the plan's four waves");
  assert.deepEqual(WAVES.map((w) => w.map((s) => ({ makes: s.makes, from: s.from }))), printed);
  assert.equal(LAST_WAVE, 4);
});

test("the glossary's wave 1 is the widget's", () => {
  const [, list] = /wave 1 is ([^.]+)\./.exec(lessonText("glossary.md").replace(/\s+/g, " "))!;
  assert.deepEqual(WAVES[0].map((s) => s.makes[0]), list.replace(" and ", ", ").split(", "));
});

test("the graph has no loop, and a loop is caught", () => {
  assert.doesNotThrow(() => wavesOf(STEPS));
  const loop: Step[] = [
    { makes: ["a′"], from: ["x", "b′"], lesson: "" },
    { makes: ["b′"], from: ["a′"], lesson: "" },
  ];
  assert.throws(() => wavesOf(loop), /wait for each other/);
});

test("every input's wave is below its step's, and the latest is just one below (the longest path)", () => {
  for (const step of STEPS) {
    const key = step.makes[0];
    for (const m of step.makes) assert.equal(waveOf(m), waveOf(key), m);
    const below = step.from.map((x) => waveOf(keyOf(x)));
    for (const [i, w] of below.entries()) assert.ok(w < waveOf(key), `${step.from[i]} before ${key}`);
    assert.equal(waveOf(key), 1 + Math.max(...below), key);
    if (waveOf(key) > 1) assert.equal(waveOf(keyOf(latestInput(key)!)), waveOf(key) - 1, key);
  }
});

test("everything read is the block, the state before it, or made by a step; every symbol has a name", () => {
  const [, parts] = /the header H and the extrinsic's parts ([^)]+)\)/.exec(text.replace(/\s+/g, " "))!;
  assert.deepEqual(BLOCK, ["H", ...parts.replace(/,? and |, /g, ",").split(",")]);
  const all = new Set(STEPS.flatMap((s) => [...s.from, ...s.makes]));
  for (const x of all) {
    assert.ok(NAMES[x], `a name for ${x}`);
    assert.ok(makerOf(x) || BLOCK.includes(x) || BEFORE.includes(x), x);
    if (!makerOf(x)) assert.equal(waveOf(x), 0, x);
  }
  assert.equal(BLOCK.length + BEFORE.length + STEPS.flatMap((s) => s.makes).length, all.size);
  assert.equal(stepName(makerOf("θ′")!), "accumulation");
  assert.deepEqual(symbolParts("β_H†"), { base: "β", sub: "H", mark: "†" });
  assert.deepEqual(symbolParts("γ′"), { base: "γ′", sub: "", mark: "" });
});

test("inputs and dependents: β_H′ waits for accumulation's θ′; ρ† feeds ρ‡ and 𝐑*", () => {
  assert.deepEqual(inputsOf("β_H′"), ["H", "E_G", "β_H†", "ω′"]);
  assert.deepEqual(dependentsOf("ρ†"), ["ρ‡", "𝐑*"]);
  assert.deepEqual(dependentsOf("η′"), ["γ′"]); // the lesson: Safrole needs the new entropy
  assert.deepEqual(dependentsOf("ω′"), ["β_H′", "δ′", "α′", "π′"]); // the lesson's wave 4: all waiting for accumulation
  for (const step of STEPS) {
    for (const d of dependentsOf(step.makes[0])) assert.ok(inputsOf(d).includes(step.makes[0]), `${d} from ${step.makes[0]}`);
  }
});

test("each step links to the lessons that built it, and the Parts' titles are theirs", () => {
  for (const step of STEPS) {
    for (const b of builtIn(step)) {
      const file = join(LESSONS, "19-block-import", `${b.href}.md`);
      assert.ok(existsSync(file), `${b.label}: ${b.href}`);
      const number = b.label.replace(/^(lesson|Part) /, "");
      if (b.label.startsWith("lesson")) assert.ok(b.href.split("/")[2].startsWith(number.split(".")[1].padStart(2, "0")), b.href);
    }
  }
  for (const [n, { dir, title }] of Object.entries(PARTS)) {
    assert.match(lessonText(`${dir}/index.md`), new RegExp(`^# Part ${n} · ${title}\\n`), dir);
  }
});

test("the goals can each be reached", () => {
  const most = STEPS.filter((s) => s.from.length === MOST_INPUTS).map((s) => s.makes[0]);
  assert.deepEqual(most, ["ω′", "π′"]); // accumulation and the statistics, nine inputs each
  const sinks = STEPS.map((s) => s.makes[0]).filter((k) => dependentsOf(k).length === 0 && waveOf(k) < LAST_WAVE);
  assert.deepEqual(sinks, ["γ′", "λ′", "ρ′"]);
  let trail: string[] = [];
  for (const k of ["κ′", "ρ†", "𝐑*", "ω′", "α′"]) trail = nextTrail(trail, k); // κ′ doesn't feed ρ†: starts afresh
  assert.deepEqual(trail, ["ρ†", "𝐑*", "ω′", "α′"]);
  assert.ok(isLongestChain(trail));
  assert.ok(!isLongestChain(["τ′", "δ′"]), "a jump from wave 1 to wave 4 isn't one tap a wave");
  assert.ok(!isLongestChain(["ρ†", "ρ‡", "ρ′"]), "the cores' chain stops at wave 3");
});
