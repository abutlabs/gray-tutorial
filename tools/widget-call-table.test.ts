// Lesson 15.6's call widget (.vitepress/theme/call-table.ts): its program is the lesson's
// withCall byte for byte, its jump rule 15.3's jumpIndirect, and a run with the way back
// 2 ends as the lesson's test says: r0 = 2, r1 = the halt address, r2 = 42.

import { test } from "node:test";
import assert from "node:assert/strict";
import { HALT_ADDRESS, JUMP_TABLE, jumpIndirect, MAX_STEPS, PROGRAM, start, step, WAYS_BACK } from "../.vitepress/theme/call-table.ts";
import type { State } from "../.vitepress/theme/call-table.ts";
import { lessonCode, lessonText } from "./lessons.ts";

const LESSON = "15-the-pvm/06-branches-and-calls.md";
const raw = lessonText(LESSON);
const code = lessonCode("15.6");
const machine = lessonCode("15.3");

/** Runs withCall to its end, or to MAX_STEPS. */
function runAll(wayBack: number): State {
  let s = start();
  while (s.exit === "continue" && s.steps < MAX_STEPS) s = step(s, wayBack).next;
  return s;
}

test("the program is withCall: its bytes, their offsets and its jump table", () => {
  assert.match(code, /call, \/\/ +0: the call, 4 bytes/);
  assert.match(code, /\[50, 0x01\], \/\/ +4: jump_ind r1 \+ 0: halt/);
  assert.match(code, /\[200, 0x22, 0x02\], \/\/ +6: add_64 r2 = r2 \+ r2/);
  assert.match(code, /\[50, 0x00\], \/\/ +9: jump_ind r0 \+ 0: return/);
  assert.match(code, /withCall\(\[80, 0x10, 2, 6\]\)/);
  assert.deepEqual(PROGRAM.map((l) => [l.at, l.bytes(2)]), [[0, [80, 0x10, 2, 6]], [4, [50, 0x01]], [6, [200, 0x22, 0x02]], [9, [50, 0x00]]]);
  PROGRAM.forEach((l, k) => { if (k) assert.equal(l.at, PROGRAM[k - 1].at + PROGRAM[k - 1].bytes(2).length, "back to back"); });
  assert.match(code, /jumpTable: \[4, 6\] \}; \/\/ address 2 leads to 4, address 4 to 6/);
  assert.deepEqual(JUMP_TABLE, [4, 6]);
});

test("the jump rule is lesson 15.3's jumpIndirect, and its halt address", () => {
  assert.match(machine, /export const HALT_ADDRESS = 2n \*\* 32n - 2n \*\* 16n;/);
  assert.equal(HALT_ADDRESS, 2n ** 32n - 2n ** 16n);
  assert.match(machine, /if \(a === 0n \|\| a > BigInt\(table\.length \* 2\) \|\| a % 2n !== 0n\) return "panic";/);
  assert.match(machine, /return jumpTo\(m, table\[Number\(a \/ 2n\) - 1\]\);/);
  assert.deepEqual([jumpIndirect(2n).to, jumpIndirect(2n).entry], [4, 0]);
  assert.deepEqual([jumpIndirect(4n).to, jumpIndirect(4n).entry], [6, 1]);
  for (const a of [0n, 3n, 6n]) assert.equal(jumpIndirect(a).exit, "panic", `${a}`);
  assert.equal(jumpIndirect(HALT_ADDRESS).exit, "halt");
});

test("the way back 2: the test's halt with r0 = 2, r1 the halt address, r2 = 42", () => {
  assert.match(code, /assert\.deepEqual\(registers, \[2n, HALT_ADDRESS, 42n\]\);/);
  const end = runAll(2);
  assert.equal(end.exit, "halt");
  assert.deepEqual(end.r, [2n, HALT_ADDRESS, 42n]);
  assert.equal(end.steps, 4, "the call, the function, the return, the halt");
  assert.equal(end.pc, 4, "the halt is through r1, at 4");
  assert.match(raw.replace(/\s+/g, " "), /Jump-table address 2: the table's first entry, byte 4, just after the call/);
});

test("the other ways back: 4 returns into the function forever, 3 and 6 panic on the return", () => {
  const loop = runAll(4);
  assert.equal(loop.exit, "continue");
  assert.equal(loop.steps, MAX_STEPS);
  assert.ok(loop.r[2] > 42n, "r2 keeps doubling");
  for (const w of [3, 6]) {
    const end = runAll(w);
    assert.deepEqual([end.exit, end.pc, end.r[2]], ["panic", 9, 42n], `way back ${w}: panics at the return, after the function ran`);
  }
  assert.deepEqual(WAYS_BACK.map((w) => w.value), [2, 4, 3, 6]);
});

test("lesson 15.6 places the call widget once, after withCall's explanation", () => {
  const at = raw.indexOf("<CallTable />");
  assert.ok(at > 0 && at === raw.lastIndexOf("<CallTable />"), "placed once");
  assert.ok(at > raw.indexOf("would save r0 in memory before making a call of its own.") && at < raw.indexOf("**Run, expect it to fail**"));
});
