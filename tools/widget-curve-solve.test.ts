// Lesson 3.3's curve worked by hand (.vitepress/theme/curve-solve.ts): exact sums that agree
// with the miniature erasure code (shards.ts) on every message, rebuild from every three
// shards, and are the lesson's own numbers.

import { test } from "node:test";
import assert from "node:assert/strict";
import { add, curveText, div, frac, mul, pointsOf, reading, shardsOf, show, slope, solve, sub, at, PRESETS } from "../.vitepress/theme/curve-solve.ts";
import { curveOf, curveText as plotText, encodeShards, mod } from "../.vitepress/theme/shards.ts";
import { lessonText } from "./lessons.ts";

const REPORT = lessonText("03-work-and-reports/03-a-work-report.md");
const codes = (m: string) => [...m].map((c) => c.charCodeAt(0));
const threes = [0, 1, 2, 3, 4, 5].flatMap((a) => [0, 1, 2, 3, 4, 5].flatMap((b) => [0, 1, 2, 3, 4, 5].map((c) => [a, b, c])))
  .filter(([a, b, c]) => a < b && b < c);

test("fractions are exact and in lowest terms", () => {
  assert.deepEqual(frac(21, 2), { n: 21, d: 2 });
  assert.deepEqual(frac(-6, -4), { n: 3, d: 2 });
  assert.deepEqual(add(frac(1, 3), frac(1, 6)), { n: 1, d: 2 });
  assert.deepEqual(sub(frac(1, 2), frac(1, 2)), { n: 0, d: 1 });
  assert.deepEqual(mul(frac(-39, 2), frac(3)), { n: -117, d: 2 });
  assert.deepEqual(div(frac(21), frac(2)), { n: 21, d: 2 });
  assert.equal(show(frac(-39, 2)), "−19.5");
  assert.equal(show(frac(1, 3)), "1/3");
  assert.throws(() => frac(1, 0));
});

test("the slope rule: between p and q a curve climbs b + c × (p + q) a step, for every pair", () => {
  const curve = { a: frac(74), b: frac(-39, 2), c: frac(21, 2) };
  for (let p = 0; p < 6; p++) for (let q = p + 1; q < 6; q++) {
    const s = slope({ x: p, y: at(curve, p).n }, { x: q, y: at(curve, q).n });
    assert.deepEqual(s, add(curve.b, mul(curve.c, frac(p + q))));
  }
});

test("every message's shards are the miniature's, wrapped round 257 as the plot wraps them; any 3 rebuild it", () => {
  for (let m0 = 0; m0 < 256; m0 += 5) for (let m1 = 0; m1 < 256; m1 += 7) for (let m2 = 0; m2 < 256; m2 += 11) {
    const shards = shardsOf([m0, m1, m2]);
    assert.deepEqual(shards.map(mod), encodeShards([m0, m1, m2], 6));
  }
  for (const m of [...PRESETS, "~ ~", "zzz", "A~A"]) {
    const shards = shardsOf(codes(m));
    for (const three of threes) {
      const { curve } = solve(three.map((x) => ({ x, y: shards[x] })));
      assert.deepEqual([0, 1, 2].map((x) => at(curve, x)), codes(m).map((y) => frac(y)), `${m} from ${three}`);
    }
  }
});

test("the curve is written as the plot writes it, so the two widgets agree", () => {
  for (const m of [...PRESETS, "~ ~", "A~A"]) assert.equal(curveText(solve(pointsOf(codes(m))).curve), plotText(curveOf(codes(m))));
  assert.equal(curveText(solve(pointsOf(codes("JAM"))).curve), "y = 74 − 19.5x + 10.5x²");
  assert.equal(curveText(solve(pointsOf(codes("135"))).curve), "y = 49 + 2x");
});

test("the presets stay in a byte, so their shards are the plot's own", () => {
  for (const m of PRESETS) for (const y of shardsOf(codes(m))) assert.ok(y >= 0 && y <= 256, `${m}: ${y}`);
  assert.deepEqual(shardsOf(codes("Hey")), [72, 101, 121, 132, 134, 127]);
});

test("the lesson's sums are the widget's: −9 and 12, c = 10.5; rebuilt from 110, 164, 239 by 54 and 75", () => {
  const made = solve(pointsOf(codes("JAM")));
  assert.deepEqual(shardsOf(codes("JAM")).slice(3), [110, 164, 239]);
  assert.match(made.steps[0].sum, /\(65 − 74\) ÷ \(1 − 0\) = −9/);
  assert.match(made.steps[1].sum, /\(77 − 65\) ÷ \(2 − 1\) = 12/);
  assert.match(made.steps[2].sum, /c = \(12 − \(−9\)\) ÷ 2 = 10\.5/);
  assert.match(made.steps[3].sum, /b = −9 − 10\.5 × 1 = −19\.5/);
  assert.equal(reading(made.curve, 3), "74 − 19.5 × 3 + 10.5 × 9 = 74 − 58.5 + 94.5 = 110");
  const back = solve([3, 4, 5].map((x) => ({ x, y: [110, 164, 239][x - 3] })));
  assert.deepEqual(back.curve, made.curve);
  assert.match(back.steps[2].sum, /c = \(75 − 54\) ÷ 2 = 10\.5/);
  for (const words of [/it climbs 65 − 74 = −9, which is b \+ c/, /77 − 65 = 12, which is b \+ 3c/, /so c = 21 ÷ 2 = 10\.5/, /b = −9 − 10\.5 = −19\.5/, /it climbs 54, then 75: b \+ 7c and b \+ 9c/]) {
    assert.match(REPORT.replace(/\n/g, " "), words);
  }
});

test("lesson 3.3 places the widget once, after the plot and before Shamir, with Albert's words under it", () => {
  const at = REPORT.indexOf("<CurveSolve />");
  assert.ok(at > 0 && at === REPORT.lastIndexOf("<CurveSolve />"));
  assert.ok(at > REPORT.indexOf("<ShardRebuild />") && at < REPORT.indexOf("### Shamir's secret sharing"));
  const albert = REPORT.indexOf("> **Albert:** Knowledge = Truth, not Trust.");
  assert.ok(albert > at && albert < REPORT.indexOf("### Shamir's secret sharing"));
});
