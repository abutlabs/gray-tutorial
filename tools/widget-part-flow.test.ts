// Each Part's opening page draws the Part as a flow (.vitepress/theme/part-flow.ts). These
// tests keep every flow honest: placed on its page, every card drawn and walked once, each
// lesson it names real and in its Part, each field list the lesson's own record, and each
// example a value the lessons' code or output shows.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AVAILABILITY_TIMEOUT, AVAILABLE, EPOCH_LENGTH, FLOWS, JAM_COMMON_ERA, LESSON_PATHS, RECENT_BLOCKS, SLOT_SECONDS, componentKeyHex, flowOf, outsideIn, shuffle } from "../.vitepress/theme/part-flow.ts";
import { bytesFor, isAvailable, needed } from "../.vitepress/theme/bitfield.ts";
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

test("every lesson that writes code is on its Part's flow", () => {
  for (const f of FLOWS) {
    const named = new Set(Object.values(f.cards).flatMap((c) => c.lessons));
    const writes = lessons.filter((l) => l.id.split(".")[0] === String(f.part) && l.steps.some((s) => s.kind === "file"));
    assert.deepEqual(writes.map((l) => l.id).filter((id) => !named.has(id)), [], `Part ${f.part}: lessons not on its flow`);
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

test("Part 0's clock is 0.4's, and its first report 0.3's", () => {
  const code = lessonCode("0.4");
  assert.match(code, new RegExp(`JAM_COMMON_ERA = ${JAM_COMMON_ERA.toLocaleString("en-US").replaceAll(",", "_")};`));
  assert.match(code, new RegExp(`SLOT_SECONDS = ${SLOT_SECONDS};`));
  // 0.4's tests: six seconds in is slot 1, an hour in slot 600
  assert.match(code, /at\("2025-01-01T12:00:06Z"\);\s*assert\.equal\(sixSecondsIn, 1\)/);
  assert.match(code, /at\("2025-01-01T13:00:00Z"\);\s*assert\.equal\(anHourIn, 600\)/);
  assert.equal(card(0, "slotAt").example, "6 seconds in → slot 1, an hour in → slot 600");
  assert.ok(code.includes(`test("${card(0, "tests").example}"`), "a test of 0.4's, by its name");
  assert.ok(textOf("0.3").includes(card(0, "report").example!), "0.3's hello line");
});

test("Part 5's checks are its lessons': blake2b, 100 linked blocks, jam_available", () => {
  assert.match(lessonCode("5.1"), /import \{ blake2b \} from "@noble\/hashes\/blake2\.js"/);
  assert.match(lessonCode("5.1"), /blake2b\(data, \{ dkLen: 32 \}\)/);
  assert.ok(textOf("5.2").includes("100 real blocks"));
  assert.ok(textOf("5.2").includes(`${card(5, "exthash").example}.`), "5.2's check, as it prints");
  assert.match(lessonCode("5.3"), new RegExp(`new TextEncoder\\(\\)\\.encode\\("${AVAILABLE}"\\)`));
  assert.ok(textOf("5.3").includes(`the ${AVAILABLE.length} ASCII bytes of \`${AVAILABLE}\``));
});

test("Part 6's keys, trie and validator keys are its lessons'", () => {
  assert.match(lessonCode("6.2"), new RegExp(`assert\\.equal\\(key, "${componentKeyHex(11).slice(0, 4)}" \\+ "00"\\.repeat\\(30\\)\\)`));
  assert.ok(textOf("6.2").includes("| C(11) | τ | the time | 4 |"), "C(11) is τ");
  assert.ok(lessonCode("6.2").includes(`test("${card(6, "state").example!.replace("a real state", "every key of a real state, named")}"`));
  assert.match(lessonCode("6.1"), /A leaf node: 64 bytes holding the key, and the value itself if it fits in 32 bytes/);
  assert.match(lessonCode("6.3"), /bandersnatch: fixedBytes\(32\)[\s\S]*ed25519: fixedBytes\(32\)[\s\S]*bls: fixedBytes\(144\)[\s\S]*metadata: fixedBytes\(128\)/);
  assert.equal(32 + 32 + 144 + 128, Number(/(\d+) bytes/.exec(card(6, "values").example!)![1]));
});

test("Part 7's epochs and shuffle are its lessons'", () => {
  for (const [name, e] of Object.entries(EPOCH_LENGTH)) {
    assert.ok(lessonCode("8.4").includes(`name: "${name}"`) && new RegExp(`epoch_length: ${e},`).test(lessonCode("8.4")), `${name}: E = ${e}`);
  }
  assert.match(lessonCode("7.1"), /Math\.floor\(slot \/ config\.epoch_length\)[\s\S]*slot % config\.epoch_length/);
  assert.deepEqual(shuffle(["a", "b", "c", "d"], [1, 1, 0, 0]), ["b", "d", "a", "c"]);
  assert.ok(lessonCode("7.2").includes('assert.deepEqual(shuffled, ["b", "d", "a", "c"])'), "7.2's shuffle by hand");
  assert.ok(lessonCode("7.2").includes(`test("${card(7, "hand").example!.replace(": ", ": ").replace("0 to 341 items", "0 to 341 items, shuffled by a hash")}"`));
});

test("Part 8's entropy, seating and vectors are its lessons'", () => {
  assert.match(lessonCode("8.1"), /blake2b256\(concatBytes\(entropy\[0\], vrfOutput\)\)/);
  assert.deepEqual(outsideIn([1, 2, 3, 4, 5]), [1, 5, 2, 4, 3]);
  assert.deepEqual(outsideIn([1, 2, 3, 4]), [1, 4, 2, 3]);
  assert.ok(lessonCode("8.4").includes("assert.deepEqual(odd, [1, 5, 2, 4, 3])"));
  assert.ok(textOf("8.2").includes("ι the ones queued after that"), "8.2 names the sets");
  assert.ok(textOf("8.6").includes("SHA-512"));
  assert.ok(textOf("8.8").includes("All 46 safrole vectors pass, whole."));
});

test("Part 9's belt and history are its lessons'", () => {
  assert.match(lessonCode("9.2"), new RegExp(`export const RECENT_BLOCKS = ${RECENT_BLOCKS};`));
  assert.match(lessonCode("9.1"), /export function keccak256\(/);
  assert.ok(textOf("9.1").includes("Keccak-256.** Ethereum's hash function"));
});

test("Part 10's vote splits, rules and vectors are its lessons'", () => {
  assert.ok(textOf("10.1").includes("*Example:* on tiny, 5, 0 or 2."));
  assert.equal(card(10, "count").example, `tiny, 6 judges: ${needed(6)}, 0 or ${6 / 3} valid votes`);
  assert.ok(textOf("10.4").includes("seven rules"));
  assert.ok(textOf("10.5").includes("all 60 passing whole"));
});

test("Part 11's threshold, timeout and five rules are its lessons'", () => {
  assert.match(lessonCode("11.2"), new RegExp(`export const AVAILABILITY_TIMEOUT = ${AVAILABILITY_TIMEOUT};`));
  assert.ok(isAvailable(needed(6), 6) && !isAvailable(needed(6) - 1, 6), "tiny: 5 of 6 is more than two thirds, 4 isn't");
  const rules = [...textOf("11.3").matchAll(/\d\. \*\*([^*]+)\.\*\*/g)].map((m) => m[1].toLowerCase());
  assert.deepEqual(rules.slice(0, 5), ["anchored on the parent", "from a real validator", "one per validator, in order", "only cores with something on them", "signed"]);
  assert.ok(textOf("11.3").includes("five rules"));
});
