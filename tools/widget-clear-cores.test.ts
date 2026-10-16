// Lesson 10.3's cores widget (.vitepress/theme/clear-cores.ts): the vector's two pending
// reports hash to the verdicts' targets, the outcome thresholds are 10.1's on tiny, and ρ†
// empties core 0 as the run says; the lesson's own test cases, wonky and good, come out too.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { clearJudged, CORES, outcomeOf, REGISTERED, REPORTS, VERDICTS, VOTES } from "../.vitepress/theme/clear-cores.ts";
import { lessonCode, lessonText, ROOT } from "./lessons.ts";

const raw = lessonText("10-disputes/03-clearing-the-cores.md");
const VECTOR = join(ROOT, "vectors/stf/disputes/tiny/progress_invalidates_avail_assignments-1.json");

test("the outcomes are lesson 10.1's thresholds on tiny's 6 judges", () => {
  const code = lessonCode("10.1");
  assert.match(code, /if \(valid === Math\.floor\(\(2 \* judges\) \/ 3\) \+ 1\) return "good";/);
  assert.match(code, /if \(valid === 0\) return "bad";/);
  assert.deepEqual(VOTES, { good: 5, bad: 0, wonky: 2 });
  assert.deepEqual([outcomeOf(5), outcomeOf(0), outcomeOf(2)], ["good", "bad", "wonky"]);
});

test("the run: core 0's report 0xf9076864… judged bad, 1 of 2 cores keep theirs", () => {
  assert.match(raw, /^core 0: its report 0xf9076864… was judged bad$/m);
  assert.match(raw, /^1 of 2 cores keep their reports$/m);
  assert.equal(CORES[0].hash.slice(0, 10), "0xf9076864");
  const judged = VERDICTS.map((v) => ({ target: v.target, outcome: outcomeOf(v.valid) }));
  assert.deepEqual(clearJudged(judged), [null, 1]);
  for (const c of CORES) assert.ok(VERDICTS.some((v) => v.target === c.hash), `a verdict names core ${c.core}'s report by its hash`);
});

test("the lesson's own cases: wonky clears a core, good leaves it, and no verdict leaves it", () => {
  const target = CORES[0].hash;
  assert.deepEqual(clearJudged([{ target, outcome: "wonky" }]), [null, 1]);
  assert.deepEqual(clearJudged([{ target, outcome: "good" }]), [0, 1]);
  assert.deepEqual(clearJudged([]), [0, 1]);
  assert.match(lessonCode("10.3"), /const afterWonky: PendingReport \| null = clearJudged\(cores, \[\{ target, outcome: "wonky" \}\]\)\[0\];/);
});

test("the reports and verdicts are the vector's, and its ρ after, where vectors/ is downloaded", { skip: !existsSync(VECTOR) && "no vectors/" }, () => {
  const v = JSON.parse(readFileSync(VECTOR, "utf8"));
  assert.deepEqual(REPORTS, v.pre_state.rho.map((r: { guarantee: { report: unknown } }) => r.guarantee.report));
  assert.deepEqual(REGISTERED, v.pre_state.rho.map((r: { registered_slot: number }) => r.registered_slot));
  assert.deepEqual(VERDICTS, v.input.disputes.verdicts.map((x: { target: string; votes: { vote: boolean }[] }) => ({ target: x.target, valid: x.votes.filter((j) => j.vote).length })));
  const judged = VERDICTS.map((x) => ({ target: x.target, outcome: outcomeOf(x.valid) }));
  assert.deepEqual(clearJudged(judged).map((c) => c !== null), v.post_state.rho.map((r: unknown) => r !== null));
});

test("lesson 10.3 places the widget once, after ρ† is defined", () => {
  const at = raw.indexOf("<ClearCores />");
  assert.ok(at > 0 && at === raw.lastIndexOf("<ClearCores />"));
  assert.ok(at > raw.indexOf("A good verdict leaves its report where it is.") && at < raw.indexOf("## The cores"));
});
