import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LESSONS, readLessons } from "./lessons.ts";
import { changedLines, snippetNumbers, wholeFiles } from "./snapshots.ts";

test("changed lines: what's new or different, not what stayed", () => {
  assert.deepEqual([...changedLines(["a", "b", "c"], ["a", "b", "c", "d"])], [3]);
  assert.deepEqual([...changedLines(["a", "b", "c"], ["a", "x", "c"])], [1]);
  assert.deepEqual([...changedLines([], ["a", "b"])], [0, 1]);
  assert.deepEqual([...changedLines(["a", "b"], ["a", "b"])], []);
});

test("every Add to and Replace in snippet has its whole file, with the snippet in it", () => {
  const files = wholeFiles();
  for (const lesson of readLessons()) {
    for (const step of lesson.steps) {
      if (step.kind !== "file" || (step.op !== "add" && step.op !== "replace")) continue;
      const snap = files.get(`${lesson.file}:${step.line}`);
      assert.ok(snap, `${lesson.file}:${step.line} has a whole file`);
      const body = step.code.split("\n").filter((l) => l.trim() && !l.startsWith("import "));
      const text = snap.lines.join("\n");
      for (const line of body) assert.ok(text.includes(line), `${lesson.file}:${step.line}: the whole file has ${line}`);
      assert.ok(snap.changed.size > 0 || step.op === "replace", `${lesson.file}:${step.line} changed something`);
    }
  }
});

test("every file snippet has a number, 1, 2, 3... in its lesson's order, on its label line", () => {
  const numbers = snippetNumbers();
  for (const lesson of readLessons()) {
    const lines = readFileSync(join(LESSONS, lesson.file), "utf8").split("\n");
    const files = lesson.steps.filter((step) => step.kind === "file");
    const got = files.map((step) => numbers.get(`${lesson.file}:${step.line}`));
    assert.deepEqual(got, files.map((_, i) => i + 1), lesson.file);
    for (const step of files) {
      // the line the website's label rule turns into a tab, and so the snippet's anchor
      assert.match(lines[step.line - 1], /^\*\*(New file|Add to|Replace in|Rewrite)\*\* `/, `${lesson.file}:${step.line}`);
    }
  }
});
