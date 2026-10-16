// Lesson 4.4's vote-count widget (.vitepress/theme/vote-count.ts): 5 on tiny, 683 on full,
// and the full vector's count bytes 82 ab, as the lesson says and shows.

import { test } from "node:test";
import assert from "node:assert/strict";
import { countBytes, dump, FULL_V, TINY_V, TWO_BYTES_FROM, twoThirds, votesFor } from "../.vitepress/theme/vote-count.ts";
import { lessonCode, lessonText } from "./lessons.ts";

const LESSON = "04-blocks/04-disputes.md";
const text = lessonText(LESSON).replace(/\s+/g, " ");

test("⌊2V/3⌋ + 1 is 5 on tiny and 683 on full, as the lesson says", () => {
  assert.match(lessonCode("4.2"), /TINY: Config = \{ name: "tiny", validators_count: 6/);
  assert.match(lessonCode("4.2"), /FULL: Config = \{ name: "full", validators_count: 1023/);
  assert.deepEqual([TINY_V, FULL_V], [6, 1023]);
  assert.equal(votesFor(TINY_V), 5);
  assert.equal(votesFor(FULL_V), 683);
  assert.equal(twoThirds(FULL_V), 682, "682, plus one");
  assert.match(text, /⌊2V\/3⌋ \+ 1: \*\*5 on tiny, 683 on full\*\*/);
});

test("the count in front is the full vector's 82 ab, and tiny's one byte 05", () => {
  assert.equal(dump(countBytes(FULL_V)), "82 ab");
  assert.match(text, /37\.\.39 verdicts\.0\.votes\.length 0x82ab/);
  assert.equal(dump(countBytes(TINY_V)), "05");
  assert.equal(TWO_BYTES_FROM, 192);
  assert.equal(countBytes(TWO_BYTES_FROM - 3).length, 1);
  assert.equal(votesFor(TWO_BYTES_FROM), 129, "the first count at or past 128");
});

test("lesson 4.4 places the widget once, at the end of What the Gray Paper says", () => {
  const raw = lessonText(LESSON);
  const at = raw.indexOf("<VoteCount />");
  assert.ok(at > 0 && at === raw.lastIndexOf("<VoteCount />"), "placed once");
  assert.ok(at > raw.indexOf("## What the Gray Paper says") && at < raw.indexOf("## A yes or no"));
});
