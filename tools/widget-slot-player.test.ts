// JAM at a glance's slot player (.vitepress/theme/slot-player.ts, network-trace.ts): the
// storage trace's 100 blocks as they are, its guarantors where the real assignment seats
// them, and each core's reports arriving, becoming available (5 of 6) or timing out (5
// slots), as the Gray Paper orders a block: assurances, then guarantees.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { coresAt } from "../.vitepress/theme/network-map.ts";
import { BLOCKS, ETAS } from "../.vitepress/theme/network-trace.ts";
import { hue, LANES, MOMENTS, NEEDED, story, TIMEOUT, TOTALS, waitingSince } from "../.vitepress/theme/slot-player.ts";
import { lessonCode, lessonText, ROOT } from "./lessons.ts";

const TRACE = join(ROOT, "vectors/traces/storage");

test("the data is the storage trace's 100 blocks as they are: slots, η′₂, guarantees, assurances", { skip: !existsSync(TRACE) && "no vectors/" }, () => {
  const files = readdirSync(TRACE).filter((f) => /^\d+\.json$/.test(f)).sort();
  assert.equal(files.length, BLOCKS.length);
  files.forEach((f, i) => {
    const j = JSON.parse(readFileSync(join(TRACE, f), "utf8"));
    const x = j.block.extrinsic;
    const entropy = j.post_state.keyvals.find((k: { key: string }) => k.key.startsWith("0x06000000")).value;
    const [slot, eta, guarantees, assurances] = BLOCKS[i];
    assert.equal(slot, j.block.header.slot);
    assert.equal(ETAS[eta], `0x${entropy.slice(2 + 128, 2 + 192)}`, `${f}: η′₂ is the state's third 32 bytes of η`);
    assert.deepEqual(guarantees, x.guarantees.map((g: any) => [g.report.core_index, g.signatures.map((s: any) => s.validator_index)]));
    assert.deepEqual(assurances, x.assurances.map((a: any) => [a.validator_index, parseInt(a.bitfield, 16)]));
  });
});

test("every guarantee made in its block's rotation is signed by the validators the assignment seats on its core", { skip: !existsSync(TRACE) && "no vectors/" }, () => {
  let same = 0, earlier = 0;
  for (const f of readdirSync(TRACE).filter((f) => /^\d+\.json$/.test(f))) {
    const j = JSON.parse(readFileSync(join(TRACE, f), "utf8"));
    const t = j.block.header.slot;
    const eta = ETAS[BLOCKS.find((b) => b[0] === t)![1]];
    for (const g of j.block.extrinsic.guarantees) {
      if (Math.floor(g.slot / 4) !== Math.floor(t / 4)) { earlier++; continue; }
      same++;
      const cores = coresAt("tiny", t, eta);
      for (const s of g.signatures) assert.equal(cores[s.validator_index], g.report.core_index, `slot ${t}: validator ${s.validator_index}`);
    }
  }
  assert.deepEqual([same, earlier], [65, 21]);
});

test("each core's reports: in, waiting, then available with 5 of 6 or timed out after 5 slots, never two at once", () => {
  assert.match(lessonCode("11.2"), /export const AVAILABILITY_TIMEOUT = 5;/);
  assert.equal(NEEDED, 5);
  assert.equal(TIMEOUT, 5);
  for (let c = 0; c < 2; c++) {
    let since: number | null = null;
    MOMENTS.forEach((m, i) => {
      const gone = m.left[c];
      if (gone === "available") assert.ok(m.assured[c].length >= 5, `slot ${m.slot} core ${c}`);
      if (gone === "timed out") assert.ok(since !== null && m.slot >= since + 5 && m.assured[c].length < 5, `slot ${m.slot} core ${c}`);
      if (gone) since = null;
      if (m.events[c] === "in") { assert.equal(since, null, `slot ${m.slot}: core ${c} was free`); since = m.slot; }
      assert.equal(LANES[c][i], m.events[c]);
    });
  }
  assert.deepEqual(TOTALS, { in: 86, available: 83, timedOut: 2 });
  assert.equal(BLOCKS.reduce((n, b) => n + b[2].length, 0), TOTALS.in);
});

test("cores' colours: a golden angle apart, so neighbouring cores never look alike", () => {
  for (let c = 0; c < 341; c++) {
    const d = Math.abs(hue(c + 1) - hue(c));
    assert.ok(Math.min(d, 360 - d) >= 100, `cores ${c} and ${c + 1}`);
  }
});

test("JAM at a glance plays it first, then the step-by-step network", () => {
  const page = lessonText("jam-at-a-glance.md");
  const at = page.indexOf("<SlotPlayer />");
  assert.ok(at > 0 && at < page.indexOf("<JamNetwork"));
  assert.equal(page.split("<SlotPlayer />").length, 2);
  assert.match(page.replace(/\s+/g, " "), /Press play to watch a real chain in slow motion, one block a slot\./);
});

test("each slot told in plain words: who made a new report, how many hold a waiting one, what was accepted", () => {
  const at = (slot: number) => story(MOMENTS.findIndex((m) => m.slot === slot));
  assert.equal(at(1), "Slot 1. Core 0 is free. Core 1 is free.");
  assert.match(at(3), /^Slot 3\. Core 0: a new report arrives from validators [\d, and]+\. Core 1: its report waits: 4 of 6 hold its pieces, 5 needed\.$/);
  assert.match(at(6), /Core 1: report accepted \(6 of 6 hold its pieces\); a new report arrives/);
  assert.match(at(8), /^Slot 8\. The validators switch benches\. /);
  // a report made before a switch is signed by validators now at the other bench
  const earlier = MOMENTS.filter((m) => m.signers.some((s, c) => s.some((v) => m.cores[v] !== c)));
  assert.equal(earlier.length > 0, true);
  for (const m of earlier) assert.match(story(MOMENTS.indexOf(m)), /\(made before they switched\)/);
  MOMENTS.forEach((m, i) => m.pending.forEach((p, c) => assert.equal(waitingSince(i, c), p)));
});
