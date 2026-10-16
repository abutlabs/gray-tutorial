// Lessons 3.2 and 3.3's widgets: a work result's tag (work-result.ts) checked against lesson
// 3.2's own code, tests and dump, and erasure coding in miniature (shards.ts) checked for
// every set of shards and against lesson 3.3's numbers (to be merged into tools/widgets.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { compact, MAX } from "../.vitepress/theme/compact.ts";
import { toHex } from "../.vitepress/theme/bytes.ts";
import {
  CASE_NAMES, decodeResult, encodeResult, ERRORS, jsonOf, LOAD, loadBytes, parseHex, readCompact, resultOf, stopIndex, stops, tagOf,
} from "../.vitepress/theme/work-result.ts";
import type { WorkResult } from "../.vitepress/theme/work-result.ts";
import {
  anotherFit, curveOf, curveRuns, curveText, encodeShards, heightAt, inverse, lettersOf, mod, originalShards, P, rebuild, SIZES, valueAt, weights, wraps,
} from "../.vitepress/theme/shards.ts";
import type { Shard } from "../.vitepress/theme/shards.ts";
import { lessonText } from "./lessons.ts";

const DIGESTS = lessonText("03-work-and-reports/02-work-digests.md");
const REPORT = lessonText("03-work-and-reports/03-a-work-report.md");
const GLOSSARY = lessonText("glossary.md");
const COMPACT = lessonText("02-codec/02-compact-naturals.md");

// ---- 3.2: a work result's tag ----

test("the result widget's errors are the lesson's ERRORS list and its prose names, in tag order", () => {
  const list = /const ERRORS = \[([^\]]+)\]/.exec(DIGESTS);
  assert.ok(list, "3.2's code has its ERRORS list");
  assert.deepEqual([...list[1].matchAll(/"(\w+)"/g)].map((m) => m[1]), [...ERRORS]);
  // "one of six errors if not: out of gas, panic, ..., bad code (BAD) and code too big (BIG)."
  const prose = /one of six errors if not:\s+([^;.]+)[;.]/.exec(DIGESTS);
  assert.ok(prose, "3.2 names the six errors");
  const names = prose[1].replace(/\s+/g, " ").split(/, | and /).map((n) => /\((\w+)\)/.exec(n)?.[1] ?? n.trim());
  assert.deepEqual(names, CASE_NAMES.slice(1));
  assert.equal(CASE_NAMES[0], "ok");
  assert.match(DIGESTS, /a successful result is the tag 0\s+and then the output as a blob; a failure is just its tag, 1 to 6/);
});

test("every case encodes to the bytes lesson 3.2's test and lasair's tags give", () => {
  // the lesson's own test: encode(WorkResult, {...}) then assert.equal(hex, "0x...")
  const cases = [...DIGESTS.matchAll(/encode\(WorkResult, \{ (?:ok: fromHex\("(0x[0-9a-f]+)"\)|error: "(\w+)") \}\)\);\n\s+assert\.equal\(\w+, "(0x[0-9a-f]+)"\)/g)];
  assert.equal(cases.length, 3, "the lesson tests ok, out of gas and panic");
  for (const [, ok, error, hex] of cases) {
    const r: WorkResult = ok ? { ok: parseHex(ok)! } : { error: error as (typeof ERRORS)[number] };
    assert.equal(toHex(encodeResult(r).bytes), hex, `${ok ?? error}`);
  }
  // lasair's encoder writes each error's tag out: | ResultOOG -> Bytes.make 1 '\x01'
  const tags = [...DIGESTS.matchAll(/\| Result(\w+) -> Bytes\.make 1 '\\x([0-9a-f]{2})'/g)].map((m) => parseInt(m[2], 16));
  assert.deepEqual(tags, [1, 2, 3, 4, 5, 6], "lasair's six error tags");
  ERRORS.forEach((error, i) => {
    const e = encodeResult({ error });
    assert.deepEqual(e.bytes, [tags[i]], `${error} is just its tag`);
    assert.deepEqual([e.length, e.output], [[], []]);
  });
  // tag 0, length 3, the three bytes: "`0x00 03 aabbcc`: tag 0, length 3, the three output bytes"
  assert.match(DIGESTS, /`0x00 03 aabbcc`: tag 0, length 3, the three output bytes/);
  const ok = encodeResult({ ok: [0xaa, 0xbb, 0xcc] });
  assert.deepEqual([ok.tag, ok.length, ok.output], [[0], [3], [0xaa, 0xbb, 0xcc]]);
  // the JSON's one key, named after the case: {"ok": "0xaabbcc"} or {"panic": null}
  assert.match(DIGESTS, /`\{"ok": "0xaabbcc"\}` or `\{"panic": null\}`/);
  assert.equal(jsonOf({ ok: [0xaa, 0xbb, 0xcc] }), '{"ok": "0xaabbcc"}');
  assert.equal(jsonOf({ error: "panic" }), '{"panic": null}');
});

test("decoding gives back every case, whatever the output's length", () => {
  for (let tag = 0; tag <= 6; tag++) {
    for (const n of tag === 0 ? [0, 1, 3, 127, 128, 300, 16383, 16384] : [0]) {
      const r = resultOf(tag, Array.from({ length: n }, (_, i) => (i * 37) & 0xff));
      assert.equal(tagOf(r), tag);
      const bytes = encodeResult(r).bytes;
      const d = decodeResult([...bytes, 0x99]); // something after it: the load, in a digest
      assert.ok(d.ok, `tag ${tag}, ${n} bytes`);
      assert.deepEqual(d.result, r);
      assert.equal(d.tag, tag);
      assert.deepEqual([d.used, d.rest], [bytes.length, 1]);
    }
  }
  assert.equal(encodeResult({ ok: new Array(128).fill(0) }).length.length, 2, "128 bytes of output: a two-byte length");
  for (const [hex, why] of [["0x", /no bytes/], ["0x07", /no case has tag 7/], ["0x00", /length is missing/], ["0x0003aabb", /says 3 .* only 2 follow/]] as const) {
    const d = decodeResult(parseHex(hex)!);
    assert.ok(!d.ok, hex);
    assert.match(d.why, why);
  }
  assert.equal(parseHex("0x0g"), null);
  assert.equal(parseHex("0x123"), null);
  assert.deepEqual(parseHex("00 03 AA"), [0, 3, 0xaa]);
});

test("work_result_1's bytes, as the lesson's decode prints them: a panic, then five compact zeros", () => {
  const rows = [...DIGESTS.matchAll(/^\s+(\d+)\.\.(\d+)\s+(result|refine_load\.(\w+))\s+(0x[0-9a-f]+)$/gm)];
  assert.equal(rows.length, 6, "the dump's result and load rows");
  const [result, ...load] = rows;
  assert.deepEqual(load.map((m) => m[4]), LOAD.map((f) => f.field), "the load's fields, in order");
  const fields = /RefineLoad = record\(\{([\s\S]*?)\}\)/.exec(DIGESTS)!;
  assert.deepEqual([...fields[1].matchAll(/(\w+):/g)].map((m) => m[1]), LOAD.map((f) => f.field), "RefineLoad's fields");
  const bytes = parseHex(rows.map((m) => m[5].slice(2)).join(""))!;
  assert.equal(result[5], toHex(encodeResult({ error: "panic" }).bytes));
  assert.equal(toHex(loadBytes([0n, 0n, 0n, 0n, 0n])), `0x${load.map((m) => m[5].slice(2)).join("")}`);
  const d = decodeResult(bytes);
  assert.ok(d.ok);
  assert.deepEqual([d.result, d.used, d.rest], [{ error: "panic" }, 1, 5]);
});

test("each load number's bytes grow exactly at lesson 2.2's edges", () => {
  const rows = [...COMPACT.matchAll(/^\| 2\^(\d+) \| (\d+) \|/gm)].map((m) => ({ below: 2n ** BigInt(m[1]), bytes: Number(m[2]) }));
  assert.ok(rows.length >= 5, "2.2's table of lengths");
  for (const { below, bytes } of rows) {
    assert.equal(loadBytes([below - 1n]).length, bytes, `${below - 1n}`);
    if (below <= MAX) assert.equal(loadBytes([below]).length, bytes + 1, `${below}`);
  }
  for (const [x, n] of [[127n, 1], [128n, 2], [16383n, 2], [16384n, 3]] as const) assert.equal(loadBytes([x]).length, n);
  for (const f of LOAD) {
    const list = stops(f.max);
    assert.equal(list[0], 0n);
    assert.equal(list.at(-1), f.max);
    list.forEach((s, i) => { if (i) assert.ok(s > list[i - 1], "stops climb"); });
    for (let l = 1; l <= 9; l++) {
      const edge = 1n << BigInt(7 * l);
      if (edge <= f.max) assert.ok(list.includes(edge - 1n) && list.includes(edge), `${f.field} stops each side of 2^${7 * l}`);
    }
    assert.equal(list[stopIndex(list, 16384n)], 16384n);
    assert.equal(list[stopIndex(list, 16385n)], 16384n);
  }
});

test("readCompact undoes ℰ at every length's edges", () => {
  const edges = [0n, 1n, 300n, MAX];
  for (let k = 1n; k <= 9n; k++) edges.push((1n << (7n * k)) - 1n, 1n << (7n * k));
  for (const x of edges.filter((x) => x <= MAX)) {
    const bytes = compact(x).bytes;
    assert.deepEqual(readCompact([7, ...bytes, 1], 1), { value: x, next: bytes.length + 1 }, `${x}`);
    assert.equal(readCompact(bytes.slice(0, -1), 0), null, `${x}, one byte short`);
  }
});

// ---- 3.3: erasure coding in miniature ----

test("the field mod 257: a prime, and every number but 0 has an inverse", () => {
  for (let d = 2; d * d <= P; d++) assert.notEqual(P % d, 0, `${P} is prime`);
  for (let a = 1; a < P; a++) assert.equal((a * inverse(a)) % P, 1, `1/${a}`);
  assert.throws(() => inverse(0));
  assert.throws(() => inverse(P));
  assert.deepEqual(lettersOf("JAM"), [74, 65, 77]);
  assert.equal(lettersOf("J€M"), null);
});

const subsets = (n: number): number[][] =>
  Array.from({ length: 2 ** n }, (_, mask) => [...Array(n).keys()].filter((i) => mask & (1 << i)));

test("any 3 of the 6 shards rebuild the message exactly, and fewer can't decide it", () => {
  const n = SIZES.tiny, k = originalShards(n);
  for (const message of [lettersOf("JAM")!, [0, 0, 0], [256, 1, 128], [255, 0, 255]]) {
    const shards = encodeShards(message, n);
    assert.deepEqual(shards.slice(0, k), message, "systematic: the first shards are the message");
    shards.forEach((y, x) => assert.equal(valueAt(message.map((m, i) => ({ x: i, y: m })), x), y, "each shard is the curve's value"));
    for (const xs of subsets(n)) {
      const held: Shard[] = xs.map((x) => ({ x, y: shards[x] }));
      const back = rebuild(held, k);
      if (xs.length >= k) {
        assert.deepEqual(back, message, `rebuilt from ${xs}`);
      } else {
        assert.equal(back, null, `${xs.length} shards: too few`);
        const other = anotherFit(held, message, n);
        assert.notDeepEqual(other, message, `another message fits ${xs}`);
        const its = encodeShards(other, n);
        xs.forEach((x) => assert.equal(its[x], shards[x], `and gives the same shard ${x}`));
      }
    }
  }
});

test("Lagrange's weights pick out each point, and sum to 1", () => {
  const xs = [1, 3, 5];
  xs.forEach((x, i) => assert.deepEqual(weights(xs, x), xs.map((_, j) => (i === j ? 1 : 0))));
  for (let x = 0; x < 6; x++) assert.equal(weights(xs, x).reduce((a, b) => (a + b) % P, 0), 1, `at ${x}`);
});

test("6 shards and any 3 on tiny, 1,023 and any 342 on full: the lesson's numbers, and the Gray Paper's R(v)", () => {
  const spec = /6 shards on tiny, 1,023 on full/;
  assert.match(REPORT, spec);
  assert.match(REPORT, /any 342 of the 1,023\s+on full/);
  for (const text of [REPORT, GLOSSARY]) {
    const m = /([\d,]+) shards on full, any ([\d,]+) of\s+which\s+will do; on tiny, (\d+), any (\d+)\./.exec(text);
    assert.ok(m, "the erasure coding entry's example");
    const [full, fullK, tiny, tinyK] = m.slice(1).map((s) => Number(s.replaceAll(",", "")));
    assert.deepEqual([SIZES.full, originalShards(SIZES.full), SIZES.tiny, originalShards(SIZES.tiny)], [full, fullK, tiny, tinyK]);
  }
  // Appendix H: the rate is optimal, R(v) = v/3 + 1, for exactly these v from tiny's 6 to 1,023
  const optimal = [6, 9, 15, 24, 33, 51, 54, 78, 105, 111, 159, 168, 225, 321, 339, 510, 681, 1023];
  for (let v = 6; v <= 1023; v++) assert.equal(originalShards(v) === v / 3 + 1, optimal.includes(v), `R(${v}) = ${originalShards(v)}`);
  assert.equal((1022 / originalShards(1022)).toFixed(1), "4.5", "and 1,022's rate is about 1:4.5");
});

test("the curve: “135” is y = 49 + 2x and shards 55, 57, 59; JAM bends; the drawing passes through every shard", () => {
  const plain = REPORT.replace(/\s+/g, " ");
  const m = lettersOf("135")!;
  assert.deepEqual(m, [49, 51, 53]);
  assert.match(plain, /"135": its bytes are 49, 51 and 53/);
  assert.equal(curveText(curveOf(m)), "y = 49 + 2x");
  assert.match(plain, /the straight line y = 49 \+ 2x/);
  assert.deepEqual(encodeShards(m, SIZES.tiny).slice(3), [55, 57, 59]);
  assert.match(plain, /at x = 3, 4 and 5: 55, 57 and 59/);
  const jam = curveOf(lettersOf("JAM")!);
  assert.equal(curveText(jam), "y = 74 − 19.5x + 10.5x²");
  assert.match(plain, /Type JAM and the line bends into y = 74 − 19\.5x \+ 10\.5x²/);
  for (const text of ["135", "JAM", "a~a", "~ ~", "\u0000ÿ\u0000"]) {
    const message = lettersOf(text)!;
    const curve = curveOf(message);
    const shards = encodeShards(message, SIZES.tiny);
    shards.forEach((y, x) => {
      assert.equal(mod(heightAt(curve, x)), y, `${text}: the curve wrapped is shard ${x}`);
      const near = curveRuns(curve, 5).flat().find(([cx]) => Math.abs(cx - x) < 1e-9);
      assert.ok(near && Math.abs(near[1] - y) < 1e-6, `${text}: the drawing passes through shard ${x}`);
    });
    for (const w of wraps(curve, SIZES.tiny)) assert.ok(w.height < 0 || w.height > 256, `${text}: only a curve past 0 to 256 wraps`);
    for (const run of curveRuns(curve, 5)) run.forEach(([, y]) => assert.ok(y >= 0 && y < P, `${text}: every drawn point is on the clock`));
  }
  assert.deepEqual(wraps(curveOf(lettersOf("a~a")!), SIZES.tiny).map((w) => [w.x, w.height, w.shard]), [[4, -135, 122], [5, -338, 176]]);
  // with too few dots, the second curve goes through the same dots
  const held: Shard[] = [{ x: 4, y: 57 }, { x: 5, y: 59 }];
  const other = anotherFit(held, m, SIZES.tiny);
  for (const h of held) assert.equal(mod(heightAt(curveOf(other), h.x)), h.y);
});
