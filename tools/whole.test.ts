// An Add to / Replace in step on the website (.vitepress/whole.ts): the whole file after it,
// the step's lines highlighted, long unchanged runs folded, the snippet behind the eye.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createMarkdownRenderer } from "vitepress";
import { LESSONS } from "./lessons.ts";
import { wholeFiles } from "./snapshots.ts";
import { CONTEXT, SHORTEST_FOLD, folds, lineRanges, linesOf, stepView } from "../.vitepress/whole.ts";

const whole = wholeFiles();
const md = await createMarkdownRenderer(LESSONS, {}, "/");
const fence = (code: string, info: string) => md.render(`\`\`\`${info}\n${code}\n\`\`\`\n`);

test("changed lines as VitePress's {…}: single lines, and runs as ranges", () => {
  assert.equal(lineRanges([7, 3, 5, 6]), "3,5-7");
  assert.equal(lineRanges([1]), "1");
  assert.equal(lineRanges([]), "");
});

test("a run of unchanged lines folds, keeping CONTEXT lines open beside each change", () => {
  assert.deepEqual(folds(30, new Set([10])), [[0, 10 - CONTEXT], [11 + CONTEXT, 30]]);
  assert.deepEqual(folds(30, new Set([0, 29])), [[1 + CONTEXT, 29 - CONTEXT]]);
  // too short to fold: the run stays open
  assert.deepEqual(folds(10 + CONTEXT + SHORTEST_FOLD - 1, new Set([10])), [[0, 10 - CONTEXT]]);
  assert.deepEqual(folds(5, new Set([2])), []);
});

test("every step changes a line, so every whole file has something to highlight", () => {
  assert.ok(whole.size > 300, `${whole.size} steps`);
  for (const [key, snap] of whole) assert.ok(snap.changed.size > 0, key);
});

test("a step is its whole file, highlighted and folded, then the snippet behind the eye", () => {
  // a long file with a short step: some of it folds
  const [key, snap] = [...whole].find(([, s]) => s.path.endsWith(".ts") && linesOf(s).length > 60 && s.changed.size < 15)!;
  const lines = linesOf(snap);
  const all = fence(lines.join("\n"), `ts{${lineRanges([...snap.changed].map((k) => k + 1))}}`);
  const html = stepView(all, fence("snippet();", "ts"), snap);
  assert.match(html, /^<div class="language-ts vp-adaptive-theme whole-step"><button type="button" class="eye" aria-pressed="false"/, key);
  assert.match(html, /<div class="language-ts vp-adaptive-theme step-only"><button type="button" class="eye" aria-pressed="true"/, key);
  const [wholeHtml] = html.split('<div class="language-ts vp-adaptive-theme step-only">');
  // the highlighted lines are the changed ones, wherever folds sit between them
  const shown = wholeHtml.split("\n").map((l) => (l.includes('class="line highlighted') ? "on" : "off"));
  assert.equal(shown.filter((s) => s === "on").length, snap.changed.size, `${key}: the changed lines`);
  const bars = [...wholeHtml.matchAll(/⋯ (\d+) unchanged lines/g)].map((m) => Number(m[1]));
  assert.deepEqual(bars, folds(lines.length, snap.changed).map(([from, to]) => to - from), `${key}: the folds`);
  // what the copy button copies: the text, less what's marked vp-copy-ignore: the whole file
  const copied = wholeHtml
    .replace(/^[\s\S]*?<code>/, "").replace(/<\/code>[\s\S]*$/, "")
    .replace(/<span class="line fold vp-copy-ignore"><button[^>]*>[^<]*<\/button><\/span>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  assert.equal(copied, lines.join("\n"), `${key}: the copy button copies the whole file`);
});
