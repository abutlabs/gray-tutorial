// Each Part's opening page draws the Part as a flow (.vitepress/theme/part-flow.ts). These
// tests keep every flow honest: placed on its page, every card drawn and walked once, each
// lesson it names real and in its Part, each field list the lesson's own record, and each
// example a value the lessons' code or output shows.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FLOWS, LESSON_PATHS, flowOf } from "../.vitepress/theme/part-flow.ts";
import { bytesFor } from "../.vitepress/theme/bitfield.ts";
import { encodeFixed, spacedHex, toHex } from "../.vitepress/theme/bytes.ts";
import { compact } from "../.vitepress/theme/compact.ts";
import { LESSONS, lessonCode, lessonText, readLessons, readParts } from "./lessons.ts";

const parts = readParts();
const lessons = readLessons();
const partOf = (dir: string) => Number(dir.split("-")[0]);
const textOf = (id: string) => lessonText(lessons.find((l) => l.id === id)!.file).replace(/\s+/g, " ");
const card = (part: number, id: string) => flowOf(part)!.cards[id];

/** A record's field names, in order, as a lesson's code defines it (a const, or a function of the config). */
function recordFields(lesson: string, name: string): string[] {
  const code = lessonCode(lesson);
  const m = new RegExp(`export (?:const ${name}(?:: [^=]+)? = record\\(\\{|function ${name}\\([^)]*\\) \\{\\s*return record\\(\\{)([\\s\\S]*?)\\n\\s*\\}\\)`).exec(code);
  assert.ok(m, `lesson ${lesson} defines the record ${name}`);
  return [...m[1].matchAll(/^\s+(\w+):/gm)].map((f) => f[1]);
}

test("a Part with a flow shows it on its opening page, once, and every flow is a Part's", () => {
  for (const p of parts) {
    const index = readFileSync(join(LESSONS, p.dir, "index.md"), "utf8");
    const placed = [...index.matchAll(/<PartFlow :part="(\d+)" \/>/g)].map((m) => Number(m[1]));
    const flow = flowOf(partOf(p.dir));
    assert.deepEqual(placed, flow ? [flow.part] : [], `${p.dir}/index.md`);
  }
  assert.equal(new Set(FLOWS.map((f) => f.part)).size, FLOWS.length, "one flow a Part");
});

test("every card is drawn once and walked once, and every row and step names a card", () => {
  for (const f of FLOWS) {
    const ids = Object.keys(f.cards).sort();
    assert.deepEqual(f.rows.flat().sort(), ids, `Part ${f.part}: the rows`);
    assert.deepEqual([...f.walk].sort(), ids, `Part ${f.part}: the walk`);
  }
});

test("a card names lessons in its own Part that build it, or says who takes the step instead", () => {
  for (const f of FLOWS) {
    for (const [id, c] of Object.entries(f.cards)) {
      const where = `Part ${f.part}, ${id}`;
      assert.ok(c.lessons.length > 0 !== Boolean(c.elsewhere), `${where}: lessons, or elsewhere, never both`);
      for (const l of c.lessons) {
        assert.equal(l.split(".")[0], String(f.part), `${where}: lesson ${l} is in Part ${f.part}`);
        assert.ok(LESSON_PATHS[l], `${where}: lesson ${l} has a path`);
      }
      assert.equal(Boolean(c.fields), Boolean(c.record), `${where}: fields come with the record they're from`);
    }
  }
});

test("every lesson path is that lesson's file", () => {
  for (const [id, path] of Object.entries(LESSON_PATHS)) {
    const lesson = lessons.find((l) => l.id === id);
    assert.ok(lesson, `lesson ${id} exists`);
    assert.equal(`${path}.md`, lesson.file, `lesson ${id}'s path`);
  }
});

test("each field list is its record's fields, in the lesson's order", () => {
  for (const f of FLOWS) {
    for (const [id, c] of Object.entries(f.cards)) {
      if (!c.record) continue;
      const [lesson, name] = c.record.split(" ");
      assert.deepEqual(c.fields, recordFields(lesson, name), `Part ${f.part}, ${id}: ${c.record}`);
    }
  }
});

test("Part 1's values are 1.1's and 1.2's", () => {
  assert.equal(card(1, "hex").example, toHex([1, 2, 255]));
  assert.match(lessonCode("1.1"), /Uint8Array\.of\(1, 2, 255\)[\s\S]*"0x0102ff"/);
  assert.ok(lessonCode("1.2").includes(card(1, "exact").example!), "1.2's bigint, 2^64 − 70");
  assert.equal(card(1, "exact").example, `${2n ** 64n - 70n}n`);
});

test("Part 2's values are its lessons' encodings, vectors and trace", () => {
  assert.ok(card(2, "encode").example!.includes(`ℰ₄(5) = ${spacedHex(encodeFixed(5n, 4))}`));
  assert.ok(card(2, "encode").example!.includes(`ℰ(300) = ${spacedHex(compact(300n).bytes)}`));
  assert.ok(textOf("2.6").includes("4 of 1,428 vectors pass."), "2.6's board");
  assert.ok(card(2, "vectors").example!.endsWith("4 of 1,428"));
  const [range, field, hex] = card(2, "trace").example!.split(/\s+/);
  assert.match(textOf("2.7"), new RegExp(`${range.replace(/\./g, "\\.")} ${field} ${hex}`), "2.7's trace begins so");
});

test("Part 4's sizes are 4.2's, and its block is 4.7's", () => {
  const code = lessonCode("4.2");
  assert.match(code, /TINY: Config = \{ name: "tiny", validators_count: 6, core_count: 2 \}/);
  assert.match(code, /FULL: Config = \{ name: "full", validators_count: 1023, core_count: 341 \}/);
  const sizes = card(4, "sizes").example!;
  assert.ok(sizes.includes(`6 validators, 2 cores (an assurance is ${bytesFor(2)} byte)`), sizes);
  assert.ok(sizes.includes(`1023 validators, 341 cores (${bytesFor(341)} bytes)`), sizes);
  assert.ok(textOf("4.7").includes("every one of the 30 codec vectors passes whole"));
});
