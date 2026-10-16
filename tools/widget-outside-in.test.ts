// Lesson 8.4's outside-in widget (.vitepress/theme/outside-in.ts): its twelve seats are the
// lottery run's, line for line, its Z is the lesson's test, and its formula is lasair's.

import { test } from "node:test";
import assert from "node:assert/strict";
import { E, FIVE, outsideIn, rankOf, slotOf, WINNERS } from "../.vitepress/theme/outside-in.ts";
import { lessonCode, lessonText } from "./lessons.ts";

const LESSON = "08-safrole/04-the-lotterys-winners.md";
const raw = lessonText(LESSON);

test("Z on [1, 2, 3, 4, 5] is [1, 5, 2, 4, 3], and on four items [1, 4, 2, 3]: the lesson's test", () => {
  assert.match(lessonCode("8.4"), /outsideIn\(\[1, 2, 3, 4, 5\]\);\s*assert\.deepEqual\(odd, \[1, 5, 2, 4, 3\]\);/);
  assert.deepEqual(outsideIn(FIVE), [1, 5, 2, 4, 3]);
  assert.deepEqual(outsideIn([1, 2, 3, 4]), [1, 4, 2, 3]);
  assert.deepEqual(outsideIn([]), []);
});

test("every seat of the lottery run: slot s takes the rank and id the Output prints", () => {
  const lines = [...raw.matchAll(/^slot\s+(\d+) of the next epoch: ticket (\d+), (0x[0-9a-f]+…)$/gm)];
  assert.equal(lines.length, E);
  for (const [, slot, rank, id] of lines) {
    assert.equal(rankOf(Number(slot)), Number(rank), `slot ${slot}`);
    assert.equal(slotOf(Number(rank)), Number(slot), `ticket ${rank}`);
    assert.equal(WINNERS[Number(rank)], id, `ticket ${rank}'s id`);
  }
  assert.deepEqual(outsideIn(WINNERS.map((_, i) => i)), [0, 11, 1, 10, 2, 9, 3, 8, 4, 7, 5, 6]);
  assert.equal(rankOf(3), 10, "the check question: slot 3 takes t10");
});

test("lesson 8.4 places the outside-in widget once, after the lottery figure", () => {
  const at = raw.indexOf("<OutsideIn />");
  assert.ok(at > 0 && at === raw.lastIndexOf("<OutsideIn />"), "placed once");
  assert.ok(at > raw.indexOf("04-ticket-contest.svg") && at < raw.indexOf("## The size grows again"));
});
