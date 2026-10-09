# Recent blocks

The state has a short memory, on purpose: the last eight blocks. For each, it keeps the
block's header hash, the state root after it, the belt's super-peak (lesson 9.1), its
slot, and the work-packages it reported. Guarantors point at these blocks to prove their
work is anchored in something real and recent, and the chain uses them to turn away
reports it has already seen. This lesson keeps that memory up to date, block by block.

## What the Gray Paper says

§7 (*Recent History*). β is two things: β_H, the list of recent blocks, at most H = 8 of
them, and β_B, the belt. Each new block does three things to them:

1. **Fills in a blank.** The newest remembered block's state root couldn't be known when
   it was added, because a block's state root comes *after* the block. Now it is known:
   it's this block's `parent_state_root` (H_r, lesson 4.6). So it's written in.
2. **Adds itself.** The block's accumulation outputs go onto the belt (lesson 9.1), and
   a new entry joins the list: its header hash, the belt's new super-peak, its slot, the
   packages it reported, and a state root of 32 zeros. The Gray Paper calls that zero
   root "inaccurate but safe": nothing reads it before step 1 fixes it, one block later.
3. **Forgets.** Only the last eight entries are kept.

The history vectors give the new block's parts ready-made: its header hash, its
`parent_state_root`, the root of its accumulation outputs, its slot, and its reported
packages. (Working those out yourself takes Parts 12 and 17.)

## The code first, this time

The tests read β from real states as well as from the vectors, so its codec comes first.

**New file** `src/history.ts`

```ts
// Recent history (GP §7): the state remembers the last eight blocks, and keeps a belt of
// every accumulation output.

import type { Bytes } from "./bytes.ts";
import type { Value } from "./codec/codec.ts";
import { hash, option, record, seq, u32 } from "./codec/codec.ts";
import type { Belt } from "./belt.ts";
import { appendToBelt, superPeak } from "./belt.ts";

/** A work-package reported in a block: its hash, and the root of the segments it exports. */
export const ReportedPackage = record({
  hash: hash,
  exports_root: hash,
});
export type ReportedPackage = Value<typeof ReportedPackage>;

/** One remembered block (GP §7). */
export const RecentBlock = record({
  header_hash: hash,
  beefy_root: hash, // the belt's super-peak, just after this block
  state_root: hash, // the state root after this block: the next block fills it in
  slot: u32,
  reported: seq(ReportedPackage), // the work-packages reported in this block
});
export type RecentBlock = Value<typeof RecentBlock>;

/** β, C(3): the recent blocks, then the belt, each peak an option (GP App. D). */
export const Recent = record({
  history: seq(RecentBlock),
  belt: seq(option(hash)),
});
export type Recent = Value<typeof Recent>;

/** What a new block brings to the history (the history vectors' input). */
export const NewBlock = record({
  header_hash: hash,
  parent_state_root: hash, // H_r: the state root after the newest remembered block
  accumulate_root: hash, // the root of this block's accumulation outputs
  slot: u32,
  work_packages: seq(ReportedPackage),
});
export type NewBlock = Value<typeof NewBlock>;

/** H: how many recent blocks the state remembers. */
export const RECENT_BLOCKS = 8;

/**
 * β′ (GP §7): the newest remembered block learns its state root, the new block joins the
 * belt and the list, and the list keeps only the last eight.
 */
export function recordBlock(before: Recent, block: NewBlock): Recent {
  const last = before.history.length - 1;
  const fixed = before.history.map((b, i) =>
    i === last ? { ...b, state_root: block.parent_state_root } : b,
  );
  const belt: Belt = appendToBelt(before.belt, block.accumulate_root);
  const entry: RecentBlock = {
    header_hash: block.header_hash,
    beefy_root: superPeak(belt),
    state_root: new Uint8Array(32), // unknown yet: zeros until the next block
    slot: block.slot,
    reported: block.work_packages,
  };
  return { history: [...fixed, entry].slice(-RECENT_BLOCKS), belt };
}
```

Every structure here is a `record`, so it's a type, an encoder, a decoder and a JSON
reader at once (lesson 2.5). `Recent` is exactly how C(3) holds β in the state: the list,
then the belt, each peak an `option` (lesson 4.5), since a belt has gaps.

The `slot` in each entry is new in Gray Paper 0.8.0; 0.7.2's entries didn't have it.

## The tests

**New file** `test/history.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { Block, headerHash } from "../src/block.ts";
import { TINY } from "../src/config.ts";
import { NewBlock, Recent, RECENT_BLOCKS, recordBlock } from "../src/history.ts";
import { readRecent } from "../src/state.ts";
import { traceState, vectorFiles, vectorJson } from "./vectors.ts";

/** A history vector's β, as your client's Recent. */
function recent(beta: { history: unknown[]; mmr: { peaks: unknown[] } }): Recent {
  return Recent.fromJson({ history: beta.history, belt: beta.mmr.peaks });
}

test("β′: the last block learns its state root, the new one joins, eight are kept", () => {
  let checked = 0;
  for (const size of ["tiny", "full"]) {
    for (const name of vectorFiles(`stf/history/${size}`)) {
      const { input, pre_state, post_state } = vectorJson(name) as {
        input: unknown;
        pre_state: { beta: { history: unknown[]; mmr: { peaks: unknown[] } } };
        post_state: { beta: { history: unknown[]; mmr: { peaks: unknown[] } } };
      };
      const after = recordBlock(recent(pre_state.beta), NewBlock.fromJson(input));
      assert.deepEqual(after, recent(post_state.beta), name);
      checked++;
    }
  }
  assert.equal(checked, 8);
});

test("β in real states: the newest block remembered is the block before", () => {
  for (let n = 2; n <= 100; n++) {
    const { history } = readRecent(traceState("fallback", n).entries);
    const before = Block(TINY).fromJson(traceState("fallback", n - 1).block).header;
    const newest = history[history.length - 1];
    assert.deepEqual(newest.header_hash, headerHash(TINY, before), `block ${n}`);
    assert.deepEqual(newest.state_root, new Uint8Array(32)); // not known yet
    assert.deepEqual(history[history.length - 2].state_root, before.parent_state_root);
    assert.equal(history.length, Math.min(n, RECENT_BLOCKS)); // genesis counts too
  }
});
```

Two kinds of check. The vectors check `recordBlock`: all three steps, at both sizes,
including a block that pushes the ninth entry out. Then real states check the *codec*,
and the rules too: in the state before each of 99 trace blocks, the newest remembered
block is the one before, by header hash (lesson 5.1), with its state root still zeros,
and the entry before it has had its blank filled in.

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

It's `readRecent` that's missing: `src/history.ts` is already there.

## The code, finished

A reader for β, next to lesson 6.3's:

**Add to** `src/state.ts`

```ts
import { Recent } from "./history.ts";

/** β, C(3): the recent blocks, and the belt. */
export function readRecent(entries: KeyValue[]): Recent {
  return component(entries, 3, Recent);
}
```

Then look again at `recordBlock`, now that the tests say what it must do. `fixed` is step 1:
copy every entry, but give the last one its state root. `{ ...b, state_root }` copies
an object with one field changed. `entry` is step 2, and `.slice(-RECENT_BLOCKS)` is
step 3: a negative `slice` counts from the end, so it keeps the last eight.

**Run**

```sh
npm test
# prints: β′: the last block learns its state root, the new one joins, eight are kept
# prints: β in real states: the newest block remembered is the block before
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**New file** `bin/history.ts`

```ts
// Reads β from the state before a trace's block: the blocks the chain remembers, and its
// belt of accumulation outputs.
// Usage: node bin/history.ts <trace.json>, e.g.
//        node bin/history.ts ../vectors/traces/preimages/00000050.json

import { readFileSync } from "node:fs";
import type { Bytes } from "../src/bytes.ts";
import { fromHex, toHex } from "../src/bytes.ts";
import { Run } from "../src/obs.ts";
import { readRecent } from "../src/state.ts";

const [file] = process.argv.slice(2);
const trace = JSON.parse(readFileSync(file, "utf8"));
const entries = trace.pre_state.keyvals.map((e: { key: string; value: string }) => ({
  key: fromHex(e.key),
  value: fromHex(e.value),
}));
const { history, belt } = readRecent(entries);
const short = (bytes: Bytes) => `${toHex(bytes).slice(0, 10)}…`;
const run = new Run("history");
for (const { slot, header_hash, state_root, reported } of history) {
  const roots = `header ${short(header_hash)}  state root ${short(state_root)}`;
  console.log(`slot ${String(slot).padStart(3)}  ${roots}  reported: ${reported.length}`);
  run.event("block", { slot, header_hash, state_root, reported: reported.length });
}
const peaks = belt.map((peak) => (peak === null ? "·" : "●")).join(" ");
console.log(`the belt: ${peaks}`);
run.event("belt", { peaks });
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/history.ts ../vectors/traces/preimages/00000050.json
# prints: slot  49  header 0x7c7ee195…  state root 0x00000000…  reported: 1
# prints: the belt: ● · · · ● ●
# prints: reported to Grafana
```

Eight blocks, slots 42 to 49, and only the newest still waiting for its state root. Now
read the belt backwards, as lesson 9.1 taught you: 110001 in binary is 49, one
accumulation root for each block so far. The *Recent history* panel shows it all.

<details>
<summary>lasair: <code>recent_history_core</code>, in <code>conformance/stf_transitions.ml</code></summary>

```ocaml
  let new_entry = {
    e_header_hash = header_hash;
    e_beefy_root = beefy_root;
    e_state_root = Bytes.make 32 '\x00';  (* Corrected next block *)
    e_slot = slot;                         (* GP 0.8.0 (#526): item carries the block's timeslot *)
    e_reported = reported;
  } in
```

The same entry as yours, field for field, and lasair marks the slot as new in 0.8.0 with
the number of the Gray Paper change that added it. Specs move; good code says which
version it follows. Just above this, lasair also sorts the reported packages by hash. In
the Gray Paper they're a *dictionary*, and dictionaries are encoded in key order (lesson
3.3). Yours keeps them in the order they came, which is fine for the vectors; the
hardening pass sorts them.

</details>

## What you have

The chain's short-term memory: eight blocks, kept up to date, with the blank from last
block filled in every time.
