// The demo page (lessons/demo.md) runs only scripts the client has, shows only output the
// lessons show, and ends with every script the lessons give, as they give them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clientScripts, DEMO, scriptsTable, tableInDemo } from "./client-scripts.ts";
import { LESSONS, ROOT, readLessons } from "./lessons.ts";

const demo = readFileSync(DEMO, "utf8");
const blocks = (lang: string) => [...demo.matchAll(new RegExp("```" + lang + "\\n([\\s\\S]*?)```", "g"))].map((m) => m[1]);

test("the demo page's table is every script the lessons give", () => {
  assert.equal(tableInDemo(), scriptsTable(), "run node tools/client-scripts.ts --write");
  const names = clientScripts().flatMap((p) => p.scripts.map((s) => s.name));
  assert.equal(new Set(names).size, names.length, "each script given once");
});

test("the demo runs only scripts the client has, or the tutorial's own", () => {
  const client = new Set(clientScripts().flatMap((p) => p.scripts.map((s) => s.name)));
  const root = new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts));
  const runs = blocks("sh").flatMap((b) => [...b.matchAll(/\bnpm run ([a-z0-9-]+)/g)].map((m) => m[1]));
  assert.ok(runs.length >= 6, "a demo of a few steps");
  assert.deepEqual(runs.filter((n) => !client.has(n) && !root.has(n)), []);
});

test("every line of the demo's output is a lesson's", () => {
  const lessons = readLessons().map((l) => readFileSync(join(LESSONS, l.file), "utf8")).join("\n");
  const lines = blocks("text").flatMap((b) => b.split("\n")).filter((l) => l.trim() !== "");
  assert.deepEqual(lines.filter((l) => !lessons.includes(l)), []);
});
