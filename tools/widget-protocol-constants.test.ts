// Lesson 16.2's constants widget (.vitepress/theme/protocol-constants.ts): every width and
// value is the lesson's protocolConstants on its TINY and FULL configs, 122 bytes, and C is
// the test's bytes 24 to 26.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CONSTANTS_TINY, DIFFER, FIELDS, PARCELS } from "../.vitepress/theme/protocol-constants.ts";
import { lessonCode, lessonText } from "./lessons.ts";

const raw = lessonText("16-host-calls/02-fetch.md");
const code = lessonCode("16.2");

/** A config's values, from the lesson's TINY or FULL literal. */
function config(name: "TINY" | "FULL"): Record<string, number> {
  const body = new RegExp(`export const ${name}: Config = \\{([\\s\\S]*?)\\n\\};`).exec(code)![1];
  return Object.fromEntries([...body.matchAll(/^\s+(\w+): ([\d_]+)n?,$/gm)].map(([, k, v]) => [k, Number(v.replaceAll("_", ""))]));
}

test("the widths and values are protocolConstants', field by field, on tiny and full", () => {
  const body = /const fields: \[number, number \| bigint\]\[\] = \[([\s\S]*?)\n\s+\];/.exec(code)![1];
  const pairs = [...body.matchAll(/\[(\d), ([^\]]+?)\]/g)].map(([, n, v]) => [Number(n), v.trim()] as const);
  assert.equal(pairs.length, 29);
  for (const [size, cfg] of [["tiny", config("TINY")], ["full", config("FULL")]] as const) {
    pairs.forEach(([width, v], k) => {
      const value = v.startsWith("config.") ? cfg[v.slice(7)] : Function(`return ${v.replaceAll("_", "")}`)();
      assert.equal({ u16: 2, u32: 4, u64: 8 }[FIELDS[k].width], width, `${FIELDS[k].key}'s width`);
      assert.equal(FIELDS[k][size], value, `${FIELDS[k].key} on ${size}`);
    });
  }
  assert.equal(DIFFER.length, 9);
  assert.match(raw, /Nine of them differ between tiny and full/);
});

test("122 bytes, and C is 02 00 on tiny, as the test says", () => {
  assert.equal(CONSTANTS_TINY.length, 122);
  assert.deepEqual(CONSTANTS_TINY.slice(24, 26), [2, 0]);
  assert.match(code, /assert\.deepEqual\(cores, \[2, 0\]\);/);
  assert.deepEqual(PARCELS[1].bytes.slice(24, 26), [0x55, 0x01], "341 on full");
  for (const p of PARCELS) {
    assert.equal(p.wire.reduce((n, w) => n + w.bytes, 0), 122);
    for (const f of FIELDS) assert.ok(p.saysOf(p.partAt(f.key)).startsWith(`${f.key}: `));
  }
});

test("lesson 16.2 places the widget once, at the end of What the Gray Paper says", () => {
  const at = raw.indexOf("<ProtocolConstants />");
  assert.ok(at > 0 && at === raw.lastIndexOf("<ProtocolConstants />"));
  assert.ok(at > raw.indexOf("didn't have yet.") && at < raw.indexOf("## The tests"));
});
