// Lesson 19.5's set-order widget (.vitepress/theme/set-order.ts): the packages are ξ's newest
// slot after storage_light block 6, and the two roots are the lesson's red.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isSorted, OTHER_ROOT, PACKAGES, SORTED_ROOT } from "../.vitepress/theme/set-order.ts";
import { lessonCode, lessonText, ROOT } from "./lessons.ts";

const raw = lessonText("19-block-import/05-work-on-the-chain.md");
const TRACE = join(ROOT, "vectors/traces/storage_light/00000006.json");

test("the red's two roots, and the sort that fixes it", () => {
  assert.match(raw, new RegExp(`\\+ '${OTHER_ROOT}'`));
  assert.match(raw, new RegExp(`- '${SORTED_ROOT}'`));
  assert.match(lessonCode("19.5"), /15: after\.accumulated\.map\(\(packages\) => \[\.\.\.packages\]\.sort\(\)\.map\(fromHex\)\), \/\/ sorted sets/);
  assert.equal(isSorted(PACKAGES), false);
  assert.equal(isSorted([...PACKAGES].sort()), true);
});

test("the packages are ξ's newest slot after block 6, and its root the trace's", { skip: !existsSync(TRACE) && "no vectors/" }, () => {
  const t = JSON.parse(readFileSync(TRACE, "utf8"));
  assert.equal(t.post_state.state_root, SORTED_ROOT);
  const xi = Buffer.from(t.post_state.keyvals.find((e: { key: string }) => e.key.startsWith("0x0f000000")).value.slice(2), "hex");
  const hex = xi.toString("hex");
  const sorted = [...PACKAGES].sort();
  assert.ok(hex.includes(`02${sorted[0].slice(2)}${sorted[1].slice(2)}`), "written sorted");
});

test("lesson 19.5 places the set widget once, before the sort", () => {
  const at = raw.indexOf("<SetOrder />");
  assert.ok(at > 0 && at === raw.lastIndexOf("<SetOrder />"));
  assert.ok(at > raw.indexOf("wrong for writing down.") && at < raw.indexOf("Sorting hex strings sorts their bytes, so:"));
});
