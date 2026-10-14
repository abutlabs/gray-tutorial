// The whole files behind the snippets' eyes (.vitepress/whole.ts): one for every Add to and
// Replace in snippet, at an address that leads back to it, highlighted with its changes marked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { LESSONS } from "./lessons.ts";
import { wholeFiles } from "./snapshots.ts";
import { keyOf, lineRanges, wholeAddress, wholeFileHtml } from "../.vitepress/whole.ts";

const whole = wholeFiles();

test("changed lines as VitePress's {…}: single lines, and runs as ranges", () => {
  assert.equal(lineRanges([7, 3, 5, 6]), "3,5-7");
  assert.equal(lineRanges([1]), "1");
  assert.equal(lineRanges([]), "");
});

test("every whole file's address leads back to its snippet", () => {
  assert.ok(whole.size > 300, `${whole.size} snippets with a whole file`);
  for (const key of whole.keys()) assert.equal(keyOf(wholeAddress(key)), key);
  assert.equal(wholeAddress("02-codec/03-writer-and-reader.md:120"), "whole/02-codec/03-writer-and-reader/120.html");
});

test("a whole file is the site's code block, its changed lines marked, its eye pressed", async () => {
  const [key, snap] = [...whole].find(([, s]) => s.changed.size > 0 && s.changed.size < s.lines.length - 1)!;
  const html = await wholeFileHtml(snap, LESSONS, "/");
  assert.match(html, /^<div class="language-ts vp-adaptive-theme whole-file"><button type="button" class="eye" aria-pressed="true"/, key);
  const lines = [...html.matchAll(/<span class="line( highlighted)?">/g)].map((m) => Boolean(m[1]));
  const body = snap.lines.at(-1) === "" ? snap.lines.length - 1 : snap.lines.length;
  assert.equal(lines.length, body, `${key}: one line each`);
  assert.deepEqual(lines.flatMap((on, k) => (on ? [k] : [])), [...snap.changed].sort((a, b) => a - b), `${key}: the changed lines`);
});
