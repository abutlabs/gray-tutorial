// The site's interactive pieces compute what they show in .vitepress/theme; this checks
// that code against values the lessons check against real code, so a widget can't teach
// a wrong encoding.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bitAt, bitfieldOf, bytesFor, isAvailable, needed } from "../.vitepress/theme/bitfield.ts";
import { bitsOf, encodeFixed, HEX_DIGITS, leftOver, nibbles, toHex } from "../.vitepress/theme/bytes.ts";
import { compact, markerOf, MAX, strip } from "../.vitepress/theme/compact.ts";
import { readLessons, ROOT, lessonText, lessonCode } from "./lessons.ts";


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

test("the hex byte widget's two digits are 1.1's hex, for every byte", () => {
  for (let byte = 0; byte < 256; byte++) {
    const { high, low } = nibbles(byte);
    assert.equal(16 * high + low, byte);
    assert.equal(`0x${HEX_DIGITS[high]}${HEX_DIGITS[low]}`, toHex([byte]));
  }
  assert.match(lessonCode("1.1"), /Uint8Array\.of\(1, 2, 255\)[\s\S]*"0x0102ff"/); // 1.1's first test
  assert.equal(toHex([1, 2, 255]), "0x0102ff");
});

test("the fixed-width widget writes 2.1's and 3.1's values as the lessons' code does", () => {
  const cases = [...lessonCode("2.1").matchAll(/encodeFixed\((\d+)n, (\d+)\);\s*assert\.deepEqual\(\w+, fromHex\("(0x[0-9a-f]+)"\)\)/g)];
  assert.ok(cases.length >= 2, "read 2.1's encodeFixed tests");
  for (const [, x, l, hex] of cases) assert.equal(toHex(encodeFixed(BigInt(x), Number(l))), hex, `ℰ_${l}(${x})`);
  // 3.1: auth_code_host "reads `0x78563412`: that's 305,419,896"
  const [, hex, x] = /reads `(0x[0-9a-f]+)`: that's ([\d,]+)/.exec(lessonText("03-work-and-reports/01-a-work-package.md"))!;
  assert.equal(toHex(encodeFixed(BigInt(x.replaceAll(",", "")), 4)), hex);
  // what doesn't fit is left over, never silently counted
  assert.equal(leftOver(255n, 1), 0n);
  assert.equal(leftOver(256n, 1), 1n);
  assert.equal(leftOver(2n ** 64n - 1n, 8), 0n);
});

test("the bitfield widgets pack cores as lesson 11.1's bitAt does, and rebuild 4.2's full vector", () => {
  const rule = "((bitfield[Math.floor(c / 8)] >> (c % 8)) & 1) === 1";
  assert.ok(lessonCode("11.1").includes(rule), "11.1's bitAt");
  assert.ok(readFileSync(join(ROOT, ".vitepress/theme/bitfield.ts"), "utf8").includes(rule), "the widget's bitAt");
  assert.deepEqual([0, 1, 2, 3].map((c) => bitAt([0x05], c)), [true, false, true, false]); // 11.1: 0x05 is cores 0 and 2
  assert.equal(bitAt([0x00, 0x01], 8), true);
  // 4.2's Output: the full vector's bitfield, every other core of 341
  const [, full] = /0\.bitfield\s+(0x[0-9a-f]{20,})/.exec(lessonText("04-blocks/02-tiny-and-full.md"))!;
  assert.equal(toHex(bitfieldOf(341, (c) => c % 2 === 0)), full);
  assert.equal(bytesFor(2), 1);
  assert.equal(bytesFor(341), 43);
});

test("the assurance widget's threshold is 11.1's: more than two thirds, in whole numbers", () => {
  const [, v1, n1, v2, n2] = /With (\d+) validators\s+that's (\d+) or more; with ([\d,]+), it's (\d+) or more/
    .exec(lessonText("11-assurances/01-available.md"))!;
  assert.equal(needed(Number(v1)), Number(n1));
  assert.equal(needed(Number(v2.replaceAll(",", ""))), Number(n2));
  for (let v = 6; v <= 1023; v += 3) {
    assert.equal(isAvailable(needed(v), v), true, `${v}: needed is enough`);
    assert.equal(isAvailable(needed(v) - 1, v), false, `${v}: one fewer isn't`);
  }
});
