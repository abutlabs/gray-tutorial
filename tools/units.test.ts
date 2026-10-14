// Bits or bytes (.vitepress/theme/units.ts, .vitepress/units.ts): the lessons write bits as
// 0b… and bytes in hex, so a reader (and the site's colours) can always tell which is which.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createMarkdownRenderer } from "vitepress";
import type MarkdownIt from "markdown-it";
import { LESSONS, ROOT, readParts, lessonText } from "./lessons.ts";
import { unitCodes } from "../.vitepress/units.ts";
import { bytesAfterArrows, sayUnit, unitOf } from "../.vitepress/theme/units.ts";
import { explain, flatten, ITEM } from "../.vitepress/theme/vector-map.ts";

test("bits are 0b…, bytes are 0x… or hex pairs, and a lone pair only when it can't be decimal", () => {
  const cases: [string, string | undefined][] = [
    ["0b10000000", "8 bits"], ["0b1000_0000", "8 bits"], ["0b10", "2 bits"], ["0b00…", "the first 2 bits of more"], ["0b110xxxxx", "8 bits"],
    ["0x80", "1 byte"], ["0x0102ff", "3 bytes"], ["0x00e5…", "the first 2 bytes of more"],
    ["10 00 00 00", "4 bytes"], ["04 03 02 01 70 a5 ...", "the first 6 bytes of more"],
    ["02", "1 byte"], ["c7", "1 byte"], ["2c", "1 byte"],
    // not whole bytes, or could be decimal, or not a value at all
    ["0x10000", undefined], ["0x", undefined], ["0b", undefined], ["12", undefined], ["26", undefined], ["10000000", undefined], ["0x…", undefined],
    ["0 0 0 1 1 1", undefined], ["src/bytes.ts", undefined], ["0b2", undefined], ["ab00", undefined],
  ];
  for (const [code, said] of cases) {
    const m = unitOf(code);
    assert.equal(m && sayUnit(m), said, code);
  }
});

test("the lessons write bits with 0b: no bare run of 0s and 1s that could be read as bytes or decimal", () => {
  const bare: string[] = [];
  for (const file of [...readParts().flatMap((p) => p.lessons.map((l) => l.file)), "glossary.md", "symbols.md"]) {
    const prose = lessonText(file).replace(/```[\s\S]*?```/g, "");
    for (const [, code] of prose.matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)) {
      if (/^[01]+x{2,}$/.test(code)) { bare.push(`${file}: \`${code}\``); continue; } // a bit pattern, 110xxxxx
      if (!/^[01]+( [01]+)*$/.test(code) || !code.includes("1")) continue; // all zeros is zero in any base
      const runs = code.split(" ");
      if (runs.every((r) => r.length === 2) || runs.every((r) => r.length === 1)) continue; // byte pairs, or digits
      bare.push(`${file}: \`${code}\``);
    }
  }
  assert.deepEqual(bare, [], "write bits as 0b…, as 0b1000_0000 in groups");
});

test("on the site, bits and bytes written as code take their colour and their count", async () => {
  // the site's renderer (as tools/albert.test.ts builds it, for the same reason)
  const md = await createMarkdownRenderer(LESSONS, { math: false }, "/") as unknown as MarkdownIt;
  unitCodes(md);
  assert.equal(
    md.renderInline("`0b10000000` is `0x80`, and 16 as a u32 is `10 00 00 00`; `npm test`"),
    '<code class="bits" title="8 bits">0b10000000</code> is <code class="bytes" title="1 byte">0x80</code>, '
      + 'and 16 as a u32 is <code class="bytes" title="4 bytes">10 00 00 00</code>; <code>npm test</code>',
  );
});

test("2.7 reads the trace's 0x10000000 as the file's four bytes, a u32 smallest first: 16", () => {
  const text = lessonText("02-codec/07-watch-a-decode.md");
  const [, traced] = /extrinsic\.0\.len\s+(0x[0-9a-f]+)/.exec(text)!;
  const words = text.replace(/\s+/g, " ");
  const [, hex, pairs, value] = /`extrinsic\.0\.len` reads `(0x[0-9a-f]+)`: the four bytes `([0-9a-f ]+)`, a u32 smallest byte first, which is (\d+)\. Not ([\d,]+)/.exec(words)!;
  assert.equal(hex, traced, "the value the trace prints");
  const bytes = Uint8Array.from(hex.slice(2).match(/../g)!, (b) => parseInt(b, 16));
  assert.equal(pairs, [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(" "));
  assert.equal(Number(value), new DataView(bytes.buffer).getUint32(0, true), "little-endian");
  // the two misreadings it names: the same bytes biggest first, and the same digits as bits
  assert.ok(words.includes(`Not ${Number(BigInt(hex)).toLocaleString("en-US")}, and not the bits \`0b${hex.slice(2)}\``));
});

test("a widget's explanation shows the bytes after each arrow as bytes, and loses no text", () => {
  assert.deepEqual(bytesAfterArrows("x = 16, a u32 (ℰ₄): zeros to fill → 10 00 00 00. Every item is 36 bytes."), [
    { text: "x = 16, a u32 (ℰ₄): zeros to fill → ", bytes: false },
    { text: "10 00 00 00", bytes: true },
    { text: ". Every item is 36 bytes.", bytes: false },
  ]);
  for (const n of flatten(ITEM.root)) {
    const line = explain(n, ITEM.bytes);
    const parts = bytesAfterArrows(line);
    assert.equal(parts.map((p) => p.text).join(""), line);
    assert.equal(parts.filter((p) => p.bytes).length, (line.match(/→ [0-9a-f]{2}/g) ?? []).length, line);
  }
});

test("no widget styles its own .bits or .bytes: those names are the units' (custom.css)", () => {
  const theme = join(ROOT, ".vitepress/theme");
  const clashes = readdirSync(theme).filter((f) => f.endsWith(".vue")).flatMap((f) => {
    const style = readFileSync(join(theme, f), "utf8").split("<style")[1] ?? "";
    return [...style.matchAll(/(^|[\s,}])\.(bits|bytes)(?=[\s,{:.[])/gm)].map((m) => `${f}: .${m[2]}`);
  });
  assert.deepEqual(clashes, []);
});
