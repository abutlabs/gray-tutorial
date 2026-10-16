// Part 4's block widget (.vitepress/theme/block-parcel.ts): the tiny block, built from the
// values 4.1 to 4.6's widgets draw, is codec/tiny/block.bin byte for byte, its fields are
// lesson 4.7's codecs, and its strip cuts where 4.7's block strip does.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BAGS, BLOCK, BLOCK_JSON, BLOCK_PARCEL, EXTRINSIC } from "../.vitepress/theme/block-parcel.ts";
import { TINY } from "../.vitepress/theme/block-strip.ts";
import { lessonCode, lessonText, ROOT } from "./lessons.ts";

const index = lessonText("04-blocks/index.md");
const fieldsIn = (body: string) => [...body.matchAll(/^\s+(\w+): /gm)].map((m) => m[1]);
const names = (t: unknown) => (t as { record: [string][] }).record.map(([n]) => n);

test("the block's fields are lesson 4.7's Block and Extrinsic, in order", () => {
  const code = lessonCode("4.7");
  const extrinsic = /export function Extrinsic\(config: Config\) \{\n\s+return record\(\{([\s\S]*?)\n\s+\}\);/.exec(code);
  const block = /export function Block\(config: Config\) \{\n\s+return record\(\{([\s\S]*?)\n\s+\}\);/.exec(code);
  assert.ok(extrinsic && block, "4.7 defines Extrinsic and Block");
  assert.deepEqual(names(EXTRINSIC), fieldsIn(extrinsic[1]));
  assert.deepEqual(names(BLOCK), fieldsIn(block[1]));
  assert.deepEqual(BAGS, fieldsIn(extrinsic[1]));
});

test("the strip cuts where 4.7's block strip does: the header, then each bag, 5,150 bytes", () => {
  const p = BLOCK_PARCEL;
  assert.equal(p.bytes.length, TINY.total);
  assert.deepEqual(p.wire.map((w) => w.path.replace(/^extrinsic\./, "")), TINY.parts.map((t) => t.name));
  for (const [k, t] of TINY.parts.entries()) {
    const n = p.partAt(p.wire[k].path);
    assert.deepEqual([n.start, n.end], [t.from, t.to], t.name);
  }
});

test("the block is codec/tiny/block.bin, where vectors/ is downloaded", { skip: !existsSync(join(ROOT, "vectors/codec/tiny/block.bin")) && "no vectors/" }, () => {
  const vector = join(ROOT, "vectors/codec/tiny/block");
  assert.deepEqual(BLOCK_JSON, JSON.parse(readFileSync(`${vector}.json`, "utf8")));
  assert.deepEqual(BLOCK_PARCEL.bytes, [...readFileSync(`${vector}.bin`)]);
});

test("the header's ten fields and the five bags show without a tap; every chip says what it is", () => {
  const p = BLOCK_PARCEL;
  const shown = p.compartments.map((c) => p.chipRows(c.id, "").flat());
  assert.equal(shown[0].length, 1 + 10, "the header and its ten fields");
  assert.deepEqual(shown[1], ["extrinsic", ...BAGS.map((b) => `extrinsic.${b}`)]);
  const deep = ["", "header.epoch_mark", "extrinsic.tickets", "extrinsic.guarantees[0]", "extrinsic.guarantees[0].report", "extrinsic.assurances[1]", "extrinsic.disputes.verdicts[0]"];
  const all = new Set(p.compartments.flatMap((c) => deep.flatMap((s) => p.chipRows(c.id, s).flat())));
  for (const path of all) assert.ok(p.saysOf(p.partAt(path)).length > 0, `${path} says what it is`);
  for (const g of p.goals) assert.ok([...all].some(g.reached), g.id);
  const sizes = Object.fromEntries(p.wire.map((w) => [w.path, w.bytes]));
  assert.equal(Math.max(...Object.values(sizes)), sizes["extrinsic.tickets"], "the tickets are the biggest part");
});

test("Part 4's index shows the block first, then the map of how the part builds it", () => {
  const at = index.indexOf("<BlockParcel />");
  assert.ok(at > 0 && at === index.lastIndexOf("<BlockParcel />"), "placed once");
  assert.ok(at > index.indexOf("## At a glance") && at < index.indexOf('<PartFlow :part="4" />'));
});
