// The lessons' understanding checks (.vitepress/checks.ts): every one fair, and in its place.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LESSONS, readParts } from "./lessons.ts";
import { checkProblems, checksIn, parseCheck } from "../.vitepress/checks.ts";

const lessons = readParts().flatMap((p) => p.lessons)
  .map((l) => ({ id: l.id, file: l.file, text: readFileSync(join(LESSONS, l.file), "utf8") }));

test("a check parses into questions, options and their reasons", () => {
  const questions = parseCheck([
    "**Why is `service` written `04 03 02 01`?**",
    "",
    "- [ ] The JSON stores it backwards",
    "  > No: the JSON says 16909060.",
    "- [x] ℰ₄ writes the least significant byte first",
    "  > Yes: 0x01020304, lowest byte first,",
    "  > so 04 comes first.",
  ]);
  assert.deepEqual(questions, [{
    question: "Why is `service` written `04 03 02 01`?",
    options: [
      { text: "The JSON stores it backwards", right: false, why: "No: the JSON says 16909060." },
      { text: "ℰ₄ writes the least significant byte first", right: true, why: "Yes: 0x01020304, lowest byte first, so 04 comes first." },
    ],
  }]);
  assert.throws(() => parseCheck(["- [x] an answer with no question"]), /before any question/);
  assert.throws(() => parseCheck(["**Q?**", "a stray line"]), /not a question/);
});

test("a check is fair: 2 to 5 options, exactly one right, and a reason for each", () => {
  const ok = parseCheck(["**Q?**", "- [x] a", "  > yes", "- [ ] b", "  > no"]);
  assert.deepEqual(checkProblems(ok), []);
  assert.match(checkProblems(parseCheck(["**Q?**", "- [x] a", "  > yes", "- [x] b", "  > also"]))[0], /2 right answers/);
  assert.match(checkProblems(parseCheck(["**Q?**", "- [x] a", "  > yes", "- [ ] b"]))[0], /says nothing about why/);
  assert.match(checkProblems(parseCheck(["**Q?**", "- [x] a", "  > yes"]))[0], /1 options/);
});

test("every lesson's check is fair", () => {
  const problems = lessons.flatMap(({ file, text }) =>
    checksIn(text).flatMap(({ line, questions }) => checkProblems(questions).map((p) => `${file}:${line} ${p}`)));
  assert.deepEqual(problems, []);
});

// at the end, where the reader has met everything it asks about: one check, in its own
// section, just before What you have
test("a check is the lesson's last section but one, Check your understanding", () => {
  const wrong: string[] = [];
  for (const { file, text } of lessons) {
    const checks = checksIn(text);
    if (checks.length === 0) continue;
    const sections = [...text.replace(/```[\s\S]*?```/g, "").matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    if (checks.length > 1) wrong.push(`${file}: ${checks.length} checks, not 1`);
    if (sections.at(-2) !== "Check your understanding") wrong.push(`${file}: the check isn't in "## Check your understanding" just before "## What you have"`);
    const section = text.slice(text.indexOf("## Check your understanding"), text.indexOf("## What you have"));
    if (checksIn(section).length !== 1) wrong.push(`${file}: "## Check your understanding" doesn't hold the check`);
  }
  assert.deepEqual(wrong, []);
});

// a reader learns nothing from guessing the same position every time
test("a lesson's right answers aren't all in the same place", () => {
  const same: string[] = [];
  for (const { file, text } of lessons) {
    for (const { questions } of checksIn(text)) {
      const places = new Set(questions.map((q) => q.options.findIndex((o) => o.right)));
      if (questions.length >= 3 && places.size === 1) same.push(file);
    }
  }
  assert.deepEqual(same, []);
});
