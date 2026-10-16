// Lesson 14.2's footprint widget (.vitepress/theme/footprint.ts): its sums are the lesson's
// footprint and minimumBalance, its presets the run's service 0 and the check questions'.

import { test } from "node:test";
import assert from "node:assert/strict";
import { footprint, minimumBalance, PRESETS, TINY_INFO, U64_MAX } from "../.vitepress/theme/footprint.ts";
import { lessonCode, lessonText } from "./lessons.ts";

const LESSON = "14-services/02-the-service-account.md";
const raw = lessonText(LESSON);
const text = raw.replace(/\s+/g, " ");
const code = lessonCode("14.2");

test("the footprint is the lesson's: 2 per request + 1 per entry, 81 + length and 34 + key + value", () => {
  assert.match(code, /const items = 2 \* requests\.length \+ storage\.length;/);
  assert.match(code, /bytes \+= BigInt\(81 \+ length\);/);
  assert.match(code, /bytes \+= BigInt\(34 \+ key\.length \+ value\.length\);/);
  const s0 = PRESETS[0];
  assert.deepEqual(footprint(s0.storage, s0.requests), { items: 4, bytes: 159_534n });
  assert.match(raw, /^keeps 4 items in 159534 bytes$/m);
  assert.match(text, /81 \+ 159,322 \+ 81 \+ 50 = 159,534 octets/);
  assert.deepEqual(footprint([{ key: 4, value: 12 }], []), { items: 1, bytes: 50n });
});

test("a_t is max(0, 100 + 10·i + o − f): 159,674 with no allowance, 0 for the bootstrap, 170 for 16.4's record", () => {
  assert.match(code, /const deposit = 100n \+ 10n \* BigInt\(info\.items\) \+ info\.bytes;/);
  assert.equal(minimumBalance(4, 159_534n, 0n).owed, 159_674n);
  assert.match(text, /100 \+ 10 × 4 \+ 1 × 159,534 = 159,674/);
  assert.equal(minimumBalance(4, 159_534n, U64_MAX).owed, 0n, "the bootstrap's allowance");
  assert.match(raw, /^balance 18446744073709551615, of which it must keep 0$/m);
  assert.equal(PRESETS[0].gratis, U64_MAX);
  assert.equal(minimumBalance(TINY_INFO.items, TINY_INFO.bytes, 0n).owed, 170n);
  assert.match(lessonText("16-host-calls/04-info.md").replace(/\s+/g, " "), /170/);
  assert.match(minimumBalance(4, 159_534n, 0n).terms, /^100 \+ 10 × 4 \+ 159,534 − 0 = 159,674$/);
});

test("lesson 14.2 places the footprint widget once, after the minimum balance paragraph", () => {
  const at = raw.indexOf("<Footprint />");
  assert.ok(at > 0 && at === raw.lastIndexOf("<Footprint />"), "placed once");
  assert.ok(at > raw.indexOf("less the free allowance.") && at < raw.indexOf("## The tests"));
});
