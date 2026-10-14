// Lesson 11.2's report-life widget, checked against the lessons' own values: the timeout
// edge of 11.2, the threshold of 11.1, and the order of a block's steps (10.3, 12.3, 19.1).

import { test } from "node:test";
import assert from "node:assert/strict";
import { bitfieldOf, needed } from "../.vitepress/theme/bitfield.ts";
import type { Block, Chain } from "../.vitepress/theme/report-life.ts";
import { AVAILABILITY_TIMEOUT, START, VALIDATORS, emptyBlock, importBlock, nameOf } from "../.vitepress/theme/report-life.ts";
import { lessonText, lessonCode } from "./lessons.ts";


/** A block at a slot where the first `assured[c]` validators assure core c. */
function blockAt(slot: number, assured: number[] = [], more: Partial<Block> = {}): Block {
  const assurances = Array.from({ length: VALIDATORS }, (_, v) => bitfieldOf(2, (c) => v < (assured[c] ?? 0)));
  return { ...emptyBlock(slot), assurances, ...more };
}
/** Imports blocks one after another, each one required to be accepted. */
function run(chain: Chain, blocks: Block[]) {
  const outs = [];
  for (const b of blocks) {
    const out = importBlock(chain, b);
    assert.equal(out.refused, null, out.log);
    outs.push(out);
    chain = out.chain;
  }
  return { chain, outs };
}

test("the report widget's timeout is 11.2's: registered at 7, it may wait through 11 and times out at 12", () => {
  const text = lessonText("11-assurances/02-timeouts.md");
  const [, u] = /\*\*U = (\d+)\*\* slots/.exec(text)!;
  assert.equal(AVAILABILITY_TIMEOUT, Number(u));
  assert.match(lessonCode("11.2"), new RegExp(`AVAILABILITY_TIMEOUT = ${AVAILABILITY_TIMEOUT};`));
  const [, at, through, out] = /registered at slot (\d+) may wait through slot (\d+), and times out at (\d+)/.exec(text)!;
  const chain: Chain = { slot: Number(at), cores: [{ name: "A", registered: Number(at) }, null], named: 1 };
  const kept = importBlock(chain, blockAt(Number(through)));
  assert.deepEqual(kept.chain.cores[0], chain.cores[0], `still waiting at ${through}`);
  assert.deepEqual(kept.timedOut, []);
  const gone = importBlock(chain, blockAt(Number(out)));
  assert.equal(gone.chain.cores[0], null, `gone at ${out}`);
  assert.deepEqual(gone.timedOut, [0]);
  assert.match(gone.log, new RegExp(`timed out: ${out} ≥ ${at} \\+ ${AVAILABILITY_TIMEOUT}`));
  // the widget starts on the lesson's own example
  assert.equal(START.cores[0]!.registered, Number(at));
});

test("at its timeout slot, that block's assurances can still make a report available (11.2)", () => {
  assert.match(lessonText("11-assurances/02-timeouts.md"), /though that block's assurances can still\s+make it available/);
  const out = importBlock(START, blockAt(START.slot + AVAILABILITY_TIMEOUT, [needed(VALIDATORS)]));
  assert.deepEqual(out.available, [0]);
  assert.deepEqual(out.timedOut, []);
  assert.equal(out.chain.cores[0], null);
});

test("the report widget's threshold is 11.1's: on tiny, 5 of 6 make a report available, 4 don't", () => {
  const [, v, n] = /With (\d+) validators\s+that's (\d+) or more/.exec(lessonText("11-assurances/01-available.md"))!;
  assert.equal(VALIDATORS, Number(v));
  const yes = importBlock(START, blockAt(8, [Number(n)]));
  assert.deepEqual(yes.available, [0]);
  assert.match(yes.log, new RegExp(`report A became available: ${n} of ${v} assured; it goes on to be accumulated`));
  const no = importBlock(START, blockAt(8, [Number(n) - 1]));
  assert.deepEqual(no.available, []);
  assert.deepEqual(no.chain.cores[0], START.cores[0]);
});

test("assurances don't add up across blocks: 4 and then 4 is never 5", () => {
  const { chain, outs } = run(START, [blockAt(8, [4]), blockAt(9, [4]), blockAt(10, [4]), blockAt(11, [4]), blockAt(12, [4])]);
  assert.deepEqual(outs.flatMap((o) => o.available), []);
  assert.deepEqual(outs.at(-1)!.timedOut, [0]);
  assert.equal(chain.cores[0], null);
});

test("a script: guarantee, assure, accumulate, and fill the freed core in the same block (12.3's order)", () => {
  // 12.3: a core takes a report only once it's free, after the disputes and the assurances
  assert.match(lessonText("12-guarantees/03-onto-the-cores.md"), /A\s+core can only take a report if it's free, after the disputes/);
  const { chain, outs } = run(START, [
    blockAt(8, [], { guaranteed: [1] }), // B onto core 1, registered at 8
    blockAt(9, [0, 5]), // B available
    blockAt(10, [6, 0], { guaranteed: [0, 1] }), // A available and C takes core 0 at once; D takes core 1
  ]);
  assert.deepEqual(outs[0].placed, [1]);
  assert.deepEqual(outs[1].available, [1]);
  assert.deepEqual(outs[2].available, [0]);
  assert.deepEqual(chain.cores, [{ name: "C", registered: 10 }, { name: "D", registered: 10 }]);
  assert.equal(chain.slot, 10);
});

test("a busy core refuses a guarantee (core_engaged), and the refused block changes nothing", () => {
  const out = importBlock(START, blockAt(8, [3], { guaranteed: [0] }));
  assert.equal(out.refused, "core_engaged");
  assert.equal(out.chain, START);
  assert.match(out.log, /^slot 8: refused, nothing changes\. Core 0 still holds report A/);
  // the same guarantee is fine at the timeout slot, once ρ‡ has dropped A
  const later = importBlock({ ...START, slot: 11 }, blockAt(12, [], { guaranteed: [0] }));
  assert.equal(later.refused, null);
  assert.deepEqual(later.timedOut, [0]);
  assert.deepEqual(later.chain.cores[0], { name: "B", registered: 12 });
});

test("a dispute clears a report (10.3): its core is free for a guarantee, but not for assurances, in that block", () => {
  assert.match(lessonText("10-disputes/03-clearing-the-cores.md"), /judged \*\*bad or wonky\*\* in this block/);
  const cleared = importBlock(START, blockAt(8, [], { judged: [0], guaranteed: [0] }));
  assert.equal(cleared.refused, null);
  assert.deepEqual(cleared.judged, [0]);
  assert.deepEqual(cleared.available, []);
  assert.deepEqual(cleared.chain.cores[0], { name: "B", registered: 8 });
  assert.match(cleared.log, /report A was judged bad: cleared off its core, never to be accumulated/);
  // assurances are checked against ρ†, after the disputes: a judged core holds nothing to assure
  const assured = importBlock(START, blockAt(8, [6], { judged: [0] }));
  assert.equal(assured.refused, "core_not_engaged");
  assert.equal(assured.chain, START);
});

test("a report can't be assured in the block that guarantees it: guarantees come last", () => {
  const out = importBlock(START, blockAt(8, [0, 5], { guaranteed: [1] }));
  assert.equal(out.refused, "core_not_engaged");
  assert.match(out.log, /assured core 1, but it holds no report/);
});

test("reports are named in order, and an empty block on free cores says so", () => {
  assert.deepEqual([0, 1, 25, 26].map(nameOf), ["A", "B", "Z", "A2"]);
  const free: Chain = { slot: 20, cores: [null, null], named: 3 };
  assert.match(importBlock(free, blockAt(21)).log, /^slot 21: an empty block/);
});
