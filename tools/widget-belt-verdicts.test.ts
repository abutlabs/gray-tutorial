// Lesson 9.1's mountain belt widget and lesson 10.1's verdict widget, checked against the
// lessons' own values (to be merged into tools/widgets.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { appendSteps, beltOf, beltPartway, itemsIn, label, mergeMountains, peaksIn } from "../.vitepress/theme/belt.ts";
import type { Belt, Mountain } from "../.vitepress/theme/belt.ts";
import { count, judge, votesNeeded, votesOf, wonkyCount } from "../.vitepress/theme/verdict.ts";
import { lessonText, lessonCode } from "./lessons.ts";

const BELT = "09-recent-history/01-the-mountain-belt.md";
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };

test("the belt widget grows lesson 9.1's belt: bin/belt.ts's dots, after each of 16 items", () => {
  const rows = [...lessonText(BELT).matchAll(/^after\s+(\d+): ([●· ]+?)\s+super-peak/gm)];
  assert.equal(rows.length, 16, "read bin/belt.ts's output");
  for (const [, n, dots] of rows) {
    const shape = beltOf(Number(n)).map((peak) => (peak === null ? "·" : "●")).join(" ");
    assert.equal(shape, dots, `after ${n}`);
  }
});

test("the belt widget agrees with 9.1's words: 5 items, the 7 → 8 carry, H(peak ⌢ carried)", () => {
  const text = lessonText(BELT);
  // "5 items make a mountain of 4 and a mountain of 1"
  const [, n, big, small] = /(\d+) items make a mountain of (\d+) and a mountain of (\d+)/.exec(text)!;
  const sizes = beltOf(Number(n)).flatMap((peak, i) => (peak === null ? [] : [2 ** i]));
  assert.deepEqual(sizes, [Number(small), Number(big)]);
  // "after 5 items the peaks are [a hash, ∅, a hash]"
  const [, m, peaks] = /after (\d+) items the peaks are \[([^\]]+)\]/.exec(text)!;
  assert.deepEqual(beltOf(Number(m)).map((p) => (p === null ? "∅" : "a hash")), peaks.split(", "));
  // "the 7 → 8 append carries all the way up, three merges in a row"
  const [, from, to, merges] = /the (\d+) → (\d+) append carries all the way up, (\w+) merges/.exec(text)!;
  assert.equal(Number(to), Number(from) + 1);
  const { steps } = appendSteps(beltOf(Number(from)), { first: Number(to), last: Number(to) }, mergeMountains);
  assert.equal(steps.filter((s) => s.action === "merge").length, WORDS[merges]);
  // the merge is H(peak ⌢ carried): the peak first, as the lesson's code concatenates
  assert.match(lessonCode("9.1"), /keccak256\(concatBytes\(peak, carry\)\)/);
  let belt: Belt<string> = [];
  for (const item of "abcd") belt = appendSteps(belt, item, (peak, carried) => `H(${peak}⌢${carried})`).belt;
  assert.deepEqual(belt, [null, null, "H(H(a⌢b)⌢H(c⌢d))"]);
  // the lesson's test: two items a give [∅, H(a ⌢ a)], three give [a, H(a ⌢ a)]
  const join = (peak: string, carried: string) => peak + carried;
  const twice = appendSteps<string>(appendSteps<string>([], "a", join).belt, "a", join);
  assert.deepEqual(twice.belt, [null, "aa"]);
  assert.deepEqual(appendSteps<string>(twice.belt, "a", join).belt, ["a", "aa"]);
});

test("peaks are the 1 bits of n, for n = 0 to 1,000, and each step of a carry is merge or rest", () => {
  let belt: Belt<Mountain> = [];
  for (let n = 0; n <= 1000; n++) {
    if (n > 0) {
      const { steps, belt: after } = appendSteps(belt, { first: n, last: n }, mergeMountains);
      // a carry merges at every 1 bit from the bottom, then rests in the first 0
      const trailingOnes = (n - 1).toString(2).split("").reverse().join("").indexOf("0");
      const merges = trailingOnes === -1 ? (n - 1).toString(2).length : trailingOnes;
      assert.equal(steps.length, merges + 1, `${n}: merges then one rest`);
      assert.ok(steps.slice(0, -1).every((s, i) => s.action === "merge" && s.place === i), `${n}: merges from place 0 up`);
      assert.equal(steps.at(-1)!.action, "rest", `${n}: ends at rest`);
      assert.deepEqual(beltPartway(belt, steps, steps.length), after, `${n}: step by step ends where it should`);
      belt = after;
    }
    const bits = n.toString(2).split("").reverse();
    assert.equal(itemsIn(belt), n);
    assert.equal(peaksIn(belt), bits.filter((b) => b === "1").length, `${n}: peaks = popcount`);
    assert.deepEqual(belt.map((p) => (p === null ? "0" : "1")), n === 0 ? [] : bits, `${n}: peaks at the set bits`);
    // peak i covers 2^i items; higher places hold older items, together all of 1 to n
    let last = n;
    belt.forEach((peak, i) => {
      if (peak === null) return;
      assert.equal(peak.last - peak.first + 1, 2 ** i, `${n}: place ${i} holds 2^${i}`);
      assert.equal(peak.last, last, `${n}: place ${i} follows on`);
      last = peak.first - 1;
    });
    assert.equal(last, 0, `${n}: every item is in a mountain`);
  }
  assert.equal(label({ first: 1, last: 4 }), "1–4");
  assert.equal(label({ first: 5, last: 5 }), "5");
});

const VERDICTS = "10-disputes/01-votes-and-verdicts.md";

test("the verdict widget decides 10.1's test values: with 6 judges, 5 is good, 0 bad, 2 wonky", () => {
  const text = lessonText(VERDICTS);
  const [, v, good, bad, wonky] = /with (\d+) judges, (\d+) valid votes is good, (\d+) is bad, (\d+) is wonky/.exec(text)!;
  const [judges, votes] = [Number(v), votesNeeded(Number(v))];
  assert.equal(judge(Number(good), votes, judges), "good");
  assert.equal(judge(Number(bad), votes, judges), "bad");
  assert.equal(judge(Number(wonky), votes, judges), "wonky");
  // the table: "(5 on tiny, 683 on full) | **good**" and the wonky row
  const rows = [...text.matchAll(/\((\d+) on tiny, (\d+) on full\) \| \*\*(good|wonky)\*\*/g)];
  assert.equal(rows.length, 2, "read the table's good and wonky rows");
  for (const [, tiny, full, outcome] of rows) {
    assert.equal(judge(Number(tiny), votesNeeded(6), 6), outcome, `tiny ${outcome}`);
    assert.equal(judge(Number(full), votesNeeded(1023), 1023), outcome, `full ${outcome}`);
  }
  // "on tiny, 6 judges, so a verdict needs ⌊2·6/3⌋ + 1 = 5 votes"
  const [, j, needed] = /(\d+) judges, so a verdict needs ⌊2·\d+\/3⌋ \+ 1 = (\d+) votes/.exec(text)!;
  assert.equal(votesNeeded(Number(j)), Number(needed));
  // the errors are named as lesson 10.4 names them
  const rules = lessonText("10-disputes/04-bad-verdicts.md");
  assert.match(rules, /\*\*The right number of votes\.\*\* Exactly two thirds of its judges, plus one\.\s+\(`bad_votes_count`\)/);
  assert.match(rules, /\*\*A meaningful split\.\*\*[^(]+\(`bad_vote_split`\)/);
});

test("the verdict thresholds, for every V from 3 to 1,023: two thirds plus one, none, a third", () => {
  for (let v = 3; v <= 1023; v++) {
    const n = votesNeeded(v), w = wonkyCount(v);
    assert.ok(3 * n > 2 * v && 3 * (n - 1) <= 2 * v, `${v}: ${n} is the least that's more than two thirds`);
    assert.ok(3 * w <= v && v < 3 * (w + 1), `${v}: ${w} is a third, rounded down`);
    for (let valid = 0; valid <= n; valid++) {
      const expected = valid === n ? "good" : valid === 0 ? "bad" : valid === w ? "wonky" : "bad_vote_split";
      assert.equal(judge(valid, n, v), expected, `${v} judges, ${valid} valid`);
      assert.equal(judge(Math.min(valid, n - 1), n - 1, v), "bad_votes_count", `${v}: a vote too few`);
      assert.equal(judge(valid, n + 1, v), "bad_votes_count", `${v}: a vote too many`);
    }
  }
  assert.deepEqual(count(votesOf(6, 2, 3)), { votes: 5, valid: 2 });
  assert.deepEqual(votesOf(4, 1, 2), ["valid", "invalid", "invalid", null]);
});
