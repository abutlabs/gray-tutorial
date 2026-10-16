// Part 4's block widget (.vitepress/theme/block-parcel.ts): the tiny block, built from the
// values 4.1 to 4.6's widgets draw, is codec/tiny/block.bin byte for byte, its fields are
// lesson 4.7's codecs, and its strip cuts where 4.7's block strip does.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BAGS, BLOCK, BLOCK_JSON, BLOCK_PARCEL, EXTRINSIC } from "../.vitepress/theme/block-parcel.ts";
import { TINY } from "../.vitepress/theme/block-strip.ts";
import { encodeMapped, type Json } from "../.vitepress/theme/codec-map.ts";
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

// ---- how much a block carries: the ranges up front, from their sources ----

const row = (bag: string) => {
  const m = new RegExp(`^\\| ${bag} \\| ([^|]+) \\| ([^|]+) \\|$`, "m").exec(index);
  assert.ok(m, `Part 4's table has ${bag}`);
  return m.slice(1).map((c) => c.trim());
};
const num = (code: string, name: string, size: "tiny" | "full") => {
  const at = code.indexOf(size === "tiny" ? "epoch_length: 12" : "epoch_length: 600");
  return Number(new RegExp(`${name}: (\\d+)`).exec(code.slice(at))![1]);
};

test("Part 4's ranges are the configs': K tickets while the lottery is open, one guarantee per core, one assurance per validator", () => {
  const safrole = lessonCode("8.7"), sizes = lessonText("04-blocks/02-tiny-and-full.md");
  const size = (s: string) => /validators_count: (\d+), core_count: (\d+)/.exec(sizes.slice(sizes.indexOf(`name: "${s}"`)))!.slice(1).map(Number);
  const [[vTiny, cTiny], [vFull, cFull]] = [size("tiny"), size("full")];
  const [k, y, e] = ["max_tickets_per_extrinsic", "epoch_tail_start", "epoch_length"].map((n) => (["tiny", "full"] as const).map((s) => num(safrole, n, s)));
  const fmt = (n: number) => n.toLocaleString("en-US");
  assert.equal(row("tickets")[0], `0 to ${k[0]} on tiny, 0 to ${k[1]} on full; none once the lottery closes, at slot ${y[0]} of ${e[0]} (${y[1]} of ${e[1]})`);
  assert.equal(row("guarantees")[0], `0 to ${cTiny} on tiny, 0 to ${fmt(cFull)} on full: one per core`);
  assert.equal(row("assurances")[0], `0 to ${vTiny} on tiny, 0 to ${fmt(vFull)} on full: one per validator`);
  assert.equal(row("preimages")[0], "any number, each one data a service asked for");
  assert.equal(row("disputes")[0], "0 to 16 each of verdicts, culprits and faults (§10)");
});

const GP = join(ROOT, "../graypaper/text");
test("the caps are the Gray Paper's: K = 16, Y = 500, guarantees up to C, verdicts, culprits and faults 16 each, no cap on preimages", { skip: !existsSync(GP) && "no Gray Paper beside the tutorial" }, () => {
  const defs = readFileSync(join(GP, "definitions.tex"), "utf8");
  assert.match(defs, /\\Cmaxblocktickets = 16\$/);
  assert.match(defs, /\\Cepochtailstart = 500\$/);
  assert.match(defs, /\\Cmaxextrinsicverdicts = 16\$/);
  assert.match(defs, /\\Cmaxextrinsicoffenses = 16\$/);
  assert.match(readFileSync(join(GP, "reporting_assurance.tex"), "utf8"), /\\xtguarantees &\\in \\sequence\[:\\Ccorecount\]/);
  assert.match(readFileSync(join(GP, "accumulation.tex"), "utf8"), /\\xtpreimages &\\in \\sequence\{\\tuple\{ \\serviceid,\\, \\blob \}\}/);
});

const TRACES = join(ROOT, "vectors/traces");
test("the traces' column is counted from all 1,000 trace blocks, and the fallback trace's are all empty", { skip: !existsSync(TRACES) && "no vectors/" }, () => {
  const counts: Record<string, number[]> = { tickets: [], preimages: [], guarantees: [], assurances: [], disputes: [] };
  let blocks = 0, fallbackFull = 0;
  for (const trace of readdirSync(TRACES, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const f of readdirSync(join(TRACES, trace.name)).filter((f) => f.endsWith(".json"))) {
      const block = JSON.parse(readFileSync(join(TRACES, trace.name, f), "utf8")).block;
      if (!block) continue;
      blocks++;
      const x = block.extrinsic;
      for (const bag of ["tickets", "preimages", "guarantees", "assurances"]) counts[bag].push(x[bag].length);
      counts.disputes.push(x.disputes.verdicts.length + x.disputes.culprits.length + x.disputes.faults.length);
      if (trace.name === "fallback" && counts.disputes.at(-1)! + ["tickets", "preimages", "guarantees", "assurances"].reduce((s, b) => s + x[b].length, 0) > 0) fallbackFull++;
    }
  }
  assert.equal(blocks, 1000);
  assert.equal(fallbackFull, 0);
  assert.match(index, /The traces are 1,000 real tiny blocks\. All 100 of the fallback trace's carry nothing/);
  for (const bag of ["tickets", "preimages", "guarantees", "assurances"]) {
    assert.equal(row(bag)[1], `${Math.min(...counts[bag])} to ${Math.max(...counts[bag])}`, bag);
  }
  assert.equal(Math.max(...counts.disputes), 0);
  assert.equal(row("disputes")[1], "none");
});

test("an empty extrinsic is 7 bytes of 00, and the vector's block fills every bag, as the parcel says", () => {
  const empty = { tickets: [], preimages: [], guarantees: [], assurances: [], disputes: { verdicts: [], culprits: [], faults: [] } };
  assert.deepEqual(encodeMapped(EXTRINSIC, empty as Json).bytes, [0, 0, 0, 0, 0, 0, 0]);
  assert.match(index, /an\s+empty extrinsic is 7 bytes of `00`, a count of 0 for each of its seven lists/);
  const x = BLOCK_JSON.extrinsic as unknown as Record<string, unknown[]> & { disputes: Record<string, unknown[]> };
  const says = (bag: string) => BLOCK_PARCEL.saysOf(BLOCK_PARCEL.partAt(`extrinsic.${bag}`));
  for (const bag of ["tickets", "preimages", "guarantees", "assurances"]) assert.match(says(bag), new RegExp(`This vector has ${x[bag].length}\\.$`), bag);
  assert.match(says("disputes"), new RegExp(`This vector has ${x.disputes.verdicts.length}, ${x.disputes.culprits.length} and ${x.disputes.faults.length}\\.$`));
});
