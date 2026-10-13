// The site's interactive pieces compute what they show in .vitepress/theme; this checks
// that code against values the lessons check against real code, so a widget can't teach
// a wrong encoding.

import { test } from "node:test";
import assert from "node:assert/strict";
import { bitsOf, compact, markerOf, MAX, strip, toHex } from "../.vitepress/theme/compact.ts";
import { readLessons } from "./lessons.ts";

test("the compact natural widget encodes lesson 2.2's test values as the lesson's code does", () => {
  const lesson = readLessons().find((l) => l.id === "2.2")!;
  const code = lesson.steps.find((s) => s.kind === "file" && s.code.includes("const NATURALS"));
  assert.ok(code?.kind === "file", "2.2 has its NATURALS table");
  // each row is [a bigint expression, "0x..."]; the expressions are the lesson's own literals
  const rows = [...code.code.matchAll(/^\s*\[(.+), "(0x[0-9a-f]+)"\],$/gm)];
  assert.ok(rows.length >= 5, "read the table's rows");
  for (const [, expr, hex] of rows) {
    const x: bigint = new Function(`return ${expr}`)();
    assert.equal(toHex(compact(x).bytes), hex, `ℰ(${expr})`);
  }
  assert.equal(toHex(compact(300n).bytes), "0x812c"); // the lesson's worked example
});

test("ℰ(x) carries exactly x's bits after its marker, at every length's edges", () => {
  const edges = [0n, MAX];
  for (let k = 1n; k <= 9n; k++) edges.push((1n << (7n * k)) - 1n, 1n << (7n * k), (1n << (7n * k)) + 300n);
  for (const x of edges.filter((x) => x <= MAX)) {
    const c = compact(x);
    const width = c.l === 8 ? 64 : 7 * (c.l + 1);
    assert.equal(c.bytes.length, c.l + 1, `${x}: one byte, then l more`);
    assert.equal(strip(c).map((g) => g.bits).join(""), bitsOf(x, width), `${x}'s bits, in order`);
    const leadingOnes = bitsOf(c.bytes[0], 8).indexOf("0");
    assert.equal(leadingOnes === -1 ? 8 : leadingOnes, c.l, `${x}: the first byte's leading ones count the bytes after it`);
    assert.equal(c.roles[0].filter((r) => r === "mark").length, Math.min(c.l + 1, 8), `${x}: the marker's bits`);
  }
});

test("the two-byte calculator's sums: byte 1 is the marker 10 plus x's top 6 bits, byte 2 its low 8", () => {
  assert.equal(markerOf(1), 0b10000000);
  for (let x = 128; x < 2 ** 14; x++) {
    const { l, bytes } = compact(BigInt(x));
    assert.equal(l, 1, `${x} takes two bytes`);
    assert.deepEqual(bytes, [markerOf(1) + Math.floor(x / 256), x % 256], `ℰ(${x})`);
  }
  assert.equal(compact(2n ** 14n).l, 2, "16,384 takes three");
});
