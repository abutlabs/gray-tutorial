// Lesson 20.2's anchor widget (.vitepress/theme/anchor-window.ts): the rule is the lesson's
// anchorError, L is tiny's, and β's eight are the check question's.

import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorError, BETA, L } from "../.vitepress/theme/anchor-window.ts";
import { lessonCode, lessonText } from "./lessons.ts";

const raw = lessonText("20-facing-the-fuzzer/02-a-target.md");

test("the rule is the lesson's anchorError, recent then known", () => {
  const code = lessonCode("20.2");
  assert.match(code, /if \(context\.lookup_anchor_slot < slot - config\.max_lookup_anchor_age\) \{\n\s+return "lookup_anchor_too_old";/);
  assert.match(code, /if \(ancestry && known\.get\(toHex\(context\.lookup_anchor\)\) !== context\.lookup_anchor_slot\) \{\n\s+return "lookup_anchor_unknown";/);
  assert.match(lessonCode("16.2"), /max_lookup_anchor_age: 24,/);
  assert.deepEqual([L, BETA], [24, 8]);
  assert.match(raw, /β\s+remembers only eight/);
});

test("too old past L; unknown only with ancestry on; otherwise accepted", () => {
  assert.equal(anchorError(100, 75, true, true), "lookup_anchor_too_old");
  assert.equal(anchorError(100, 76, true, true), null);
  assert.equal(anchorError(100, 90, false, true), "lookup_anchor_unknown");
  assert.equal(anchorError(100, 90, false, false), null, "without ancestry, the check is skipped");
});

test("lesson 20.2 places the widget once, after the two rules", () => {
  const at = raw.indexOf("<AnchorWindow />");
  assert.ok(at > 0 && at === raw.lastIndexOf("<AnchorWindow />"));
  assert.ok(at > raw.indexOf("with that same hash and") && at < raw.indexOf("The first is on-chain arithmetic."));
});
