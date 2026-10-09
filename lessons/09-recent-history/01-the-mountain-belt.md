# The mountain belt

Every JAM block remembers a little of the blocks before it, and one thing it keeps is a
running commitment to *every accumulation output ever*. Bridges to other chains read it,
so it has to be small, cheap to extend, and checkable with tools those chains already
have. JAM's answer is a **Merkle mountain belt**: a row of perfect little Merkle trees,
"mountains", of sizes 1, 2, 4, 8 and so on. Appending an item is exactly like adding 1 to
a binary number. Really. You'll see it.

## What the Gray Paper says

Appendix E (*Merkle Mountain Ranges and Belts*). A belt is a list of **peaks**: peak i is
the root of a mountain of 2^i items, or ∅ if there's no mountain of that size.

**Appending** an item l (the function A): start at place 0, carrying l.

- If the place is empty, the carried hash rests there. Done.
- If there's a mountain there, merge: the carried hash becomes H(peak ⌢ carried), the
  place empties, and you move on to the next place, carrying the merged hash.
- If you run off the end, the carried hash becomes a new, biggest mountain.

That's binary addition, with mountains for 1s, empty places for 0s, and merging for
"carry the one".

The **super-peak**, M_R, squeezes a belt into one hash: take the peaks that exist, in
order. None gives 32 zero bytes, and one gives itself. Otherwise it's
H(`$peak` ⌢ M_R(all but the last) ⌢ the last). (The `$` again marks an ASCII string, as
in lesson 5.3: the bytes are `peak`. The vectors agree, and with the `$` they don't.)

And the hash? Not Blake2b, for once. §7 says the belt uses **Keccak-256**, Ethereum's
hash, "to maximize compatibility with legacy systems": a bridge contract on Ethereum can
check JAM's belt with a hash it has built in.

## A second hash

`@noble/hashes` has Keccak too. No new dependency:

**Add to** `src/hash.ts`

```ts
import { keccak_256 } from "@noble/hashes/sha3.js";

/** Keccak-256, the hash Ethereum uses, for the parts of JAM that other chains must read. */
export function keccak256(data: Bytes): Bytes {
  return keccak_256(data);
}
```

## The tests

**New file** `test/belt.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { appendToBelt, superPeak } from "../src/belt.ts";
import type { Belt } from "../src/belt.ts";
import { fromHex, toHex } from "../src/bytes.ts";
import { keccak256 } from "../src/hash.ts";
import { vectorFiles, vectorJson } from "./vectors.ts";

test("Keccak-256 of nothing at all", () => {
  const empty = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
  assert.equal(toHex(keccak256(new Uint8Array(0))), empty);
});

test("appending is counting in binary: mountains of 1, 2, 4...", () => {
  const a = new Uint8Array(32).fill(1);
  let belt: Belt = [];
  belt = appendToBelt(belt, a); // 1 item:  [a]
  belt = appendToBelt(belt, a); // 2 items: [-, H(a ⌢ a)]
  assert.deepEqual(belt, [null, keccak256(new Uint8Array(64).fill(1))]);
  belt = appendToBelt(belt, a); // 3 items: [a, H(a ⌢ a)]
  assert.deepEqual(belt[0], a);
});

/** A history test vector: the parts of it this lesson uses. */
type HistoryVector = {
  input: { accumulate_root: string };
  pre_state: { beta: { mmr: { peaks: (string | null)[] } } };
  post_state: { beta: { history: { beefy_root: string }[]; mmr: { peaks: (string | null)[] } } };
};

const belt = (peaks: (string | null)[]): Belt => peaks.map((p) => (p === null ? null : fromHex(p)));

test("the belt after each block of the history vectors, and its super-peak", () => {
  let checked = 0;
  for (const size of ["tiny", "full"]) {
    for (const name of vectorFiles(`stf/history/${size}`)) {
      const { input, pre_state, post_state } = vectorJson(name) as HistoryVector;
      const after = appendToBelt(belt(pre_state.beta.mmr.peaks), fromHex(input.accumulate_root));
      assert.deepEqual(after, belt(post_state.beta.mmr.peaks), name);
      const newest = post_state.beta.history[post_state.beta.history.length - 1];
      assert.equal(toHex(superPeak(after)), newest.beefy_root, name);
      checked++;
    }
  }
  assert.equal(checked, 8);
});
```

The vectors are the `history` ones (lesson 9.2 uses the rest of them). Each gives the
belt before a block, the item appended (`accumulate_root`), the belt after, and, in the
newest block's history entry, the super-peak as `beefy_root`. Between them they hold
belts of 1, 2, 8 and 9 items, so the 7 → 8 append carries all the way up, three merges
in a row.

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The code

**New file** `src/belt.ts`

```ts
// The accumulation output belt (GP §7, App. E): a Merkle mountain belt. A compact
// commitment to every block's accumulation outputs, built with Keccak so that other chains
// can check it.

import type { Bytes } from "./bytes.ts";
import { concatBytes } from "./bytes.ts";
import { keccak256 } from "./hash.ts";

/** A mountain belt: peak i is the root of 2^i items, or null if there's no such mountain. */
export type Belt = (Bytes | null)[];

/** A (GP App. E): append an item, merging equal mountains as it goes, like adding 1 in binary. */
export function appendToBelt(belt: Belt, item: Bytes): Belt {
  const peaks = [...belt];
  let carry = item;
  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[i];
    if (peak === null) {
      peaks[i] = carry; // an empty place: the mountain rests here
      return peaks;
    }
    carry = keccak256(concatBytes(peak, carry)); // two mountains of 2^i make one of 2^(i+1)
    peaks[i] = null;
  }
  peaks.push(carry); // a new, biggest mountain
  return peaks;
}

/** "$peak" in the Gray Paper: the $ marks an ASCII string, as in lesson 5.3. */
const PEAK = new TextEncoder().encode("peak");

/** M_R (GP App. E): the super-peak, one hash for the whole belt. */
export function superPeak(belt: Belt): Bytes {
  const peaks = belt.filter((peak) => peak !== null);
  if (peaks.length === 0) return new Uint8Array(32);
  if (peaks.length === 1) return peaks[0];
  const last = peaks[peaks.length - 1];
  return keccak256(concatBytes(PEAK, superPeak(peaks.slice(0, -1)), last));
}
```

The Gray Paper writes appending as a recursion, P; `appendToBelt` is the same thing as a
loop, carrying one hash along the places. `superPeak` stays recursive, just as the Gray
Paper writes it: fold all but the last, then join the last on.

**Run**

```sh
npm test
# prints: Keccak-256 of nothing at all
# prints: the belt after each block of the history vectors, and its super-peak
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**New file** `bin/belt.ts`

```ts
// Grows a mountain belt one item at a time and shows its peaks after each append:
// ● a mountain, · an empty place, smallest mountain first.
// Usage: node bin/belt.ts [how many items, 16 unless you say]

import { appendToBelt, superPeak } from "../src/belt.ts";
import type { Belt } from "../src/belt.ts";
import { toHex } from "../src/bytes.ts";
import { keccak256 } from "../src/hash.ts";
import { Run } from "../src/obs.ts";

const count = Number(process.argv[2] ?? 16);
const run = new Run("belt");
let belt: Belt = [];
for (let items = 1; items <= count; items++) {
  belt = appendToBelt(belt, keccak256(new Uint8Array([items]))); // any 32 bytes will do
  const peaks = belt.map((peak) => (peak === null ? "·" : "●")).join(" ");
  const top = `${toHex(superPeak(belt)).slice(0, 10)}…`;
  console.log(`after ${String(items).padStart(3)}: ${peaks.padEnd(12)} super-peak ${top}`);
  run.event("append", { items, peaks, superPeak: superPeak(belt) });
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/belt.ts
# prints: after   1: ●
# prints: after   8: · · · ●
# prints: reported to Grafana
```

Now read the dots from right to left: after 5, `● · ●` is 101, after 6 `· ● ●` is 110, after
8 `· · · ●` is 1000. The belt *is* the count in binary, written backwards, smallest
mountain first. Watch 7 → 8: three mountains merge into one, like 0111 + 1 = 1000. The
*Belt* panel has every step; try `node bin/belt.ts 100`.

<details>
<summary>lasair: <code>mmr_append</code>, in <code>conformance/history_stf.ml</code></summary>

```ocaml
let mmr_append (peaks : bytes option list) (leaf : bytes) : bytes option list =
  let rec carry peaks hash =
    match peaks with
    | [] -> [Some hash]  (* No more peaks, place here *)
    | None :: rest -> Some hash :: rest  (* Empty slot, place here *)
    | Some p :: rest ->
      (* Combine with existing peak, carry to next level *)
      let combined = hash_combine p hash in
      None :: carry rest combined
  in
  carry peaks leaf
```

The same three cases as the Gray Paper's P, as a pattern match on the list: off the end,
an empty place, or a mountain to merge with. This is the code lasair runs against the
same `history` vectors. OCaml's `match` makes the binary counter almost a poem.

</details>

## What you have

A Merkle mountain belt, the commitment JAM keeps for bridges, appended to in a handful of
hashes per block, whatever its length.
