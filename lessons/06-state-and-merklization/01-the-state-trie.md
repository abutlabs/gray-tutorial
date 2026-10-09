# The state trie

Every JAM header carries `parent_state_root`: 32 bytes that stand for the *entire* state
of the chain. Every validator's keys, every service's code and storage, every pending
report: all of it, behind one hash. Change a single byte anywhere, and the root changes.
How do you hash a whole world, and still be able to prove one small piece of it later?
With a **trie**. This lesson builds one and checks it against 400 real states.

## What the Gray Paper says

Appendix D does it in two stages:

1. **Serialization** turns the state into a list of entries: each a 31-byte **key** and a
   value of any length. (Which key holds what is the next lesson. Today they're just
   bytes.)
2. **Merklization** turns those entries into one 32-byte root. That's today.

The trie is binary: it sorts entries by their key's bits, most significant first. Every
node is exactly 64 bytes, and its first bit says what kind it is.

- **A leaf** (first bit 1) holds one entry: the key, and the value itself if the value
  fits in 32 bytes (second bit 0, then six bits of its length). A bigger value is
  replaced by its hash (second bit 1). Small things inline, big things by fingerprint.
- **A branch** (first bit 0) holds the hashes of its two subtries: left for keys whose
  next bit is 0, right for 1. Two hashes are 512 bits, though, and the branch needs one
  for its 0. So the left hash gives up its first bit.

And the root, M, of some entries:

- no entries: 32 zero bytes;
- one entry: the hash of its leaf;
- more: split them on the next bit of their keys, and hash the branch of the two halves.

Three keys starting `0x01` (`0000 0001`), `0x40` (`0100 0000`) and `0xff`
(`1111 1111`) make this trie:

```
                root (branch)
              0 /          \ 1
         branch            leaf 0xff…
        0 /    \ 1
  leaf 0x01…   leaf 0x40…
```

`0xff` is alone on the 1 side, so it becomes a leaf right away. The other two need a
second bit to part ways.

## The tests

Two sets of vectors. The `trie` vectors are made for exactly this: entries in, root out,
from no entries at all up to ten. (Their keys are 32 bytes, from when the Gray Paper's
keys were. The trie never looks past byte 31, so the test simply drops the last one.)
And then real states, from the four traces of lesson 5.2: each trace step carries the
state *before* its block, as key-value entries, and each block's header promises that
state's root.

**New file** `test/trie.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromHex, toHex } from "../src/bytes.ts";
import { stateRoot } from "../src/trie.ts";
import { vectorJson } from "./vectors.ts";

test("the trie vectors: from no entries at all to ten", () => {
  const vectors = vectorJson("trie/trie.json") as {
    input: Record<string, string>;
    output: string;
  }[];
  for (const { input, output } of vectors) {
    const entries = Object.entries(input).map(([key, value]) => ({
      key: fromHex(`0x${key}`).subarray(0, 31), // these vectors' keys are 32 bytes; a key is 31
      value: fromHex(`0x${value}`),
    }));
    assert.equal(toHex(stateRoot(entries)), `0x${output}`);
  }
});

/** The state before block n of a tiny trace, and the state root its header promises. */
function traceState(family: string, n: number) {
  const name = `traces/${family}/${String(n).padStart(8, "0")}.json`;
  const trace = vectorJson(name) as {
    pre_state: { keyvals: { key: string; value: string }[] };
    block: { header: { parent_state_root: string } };
  };
  const entries = trace.pre_state.keyvals.map((e) => ({
    key: fromHex(e.key),
    value: fromHex(e.value),
  }));
  return { entries, promised: trace.block.header.parent_state_root };
}

test("each header promises the state before its block, by its root: 400 real states", () => {
  for (const family of ["fallback", "safrole", "preimages", "storage"]) {
    for (let n = 1; n <= 100; n++) {
      const { entries, promised } = traceState(family, n);
      assert.equal(toHex(stateRoot(entries)), promised, `${family} ${n}`);
    }
  }
});
```

The `trie` vectors write their hex without `0x`, so the test adds it for `fromHex`.

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The code

**New file** `src/trie.ts`

```ts
// The state trie (GP App. D): one 32-byte root that commits to every key and value in the
// state. Change any value anywhere, and the root changes.

import type { Bytes } from "./bytes.ts";
import { concatBytes } from "./bytes.ts";
import type { Trace } from "./codec/reader.ts";
import { blake2b256 } from "./hash.ts";

/** One entry of the state: a 31-byte key, and its value. */
export type KeyValue = { key: Bytes; value: Bytes };

/** Bit i of a key, counting from the most significant bit of its first byte. */
function bit(key: Bytes, i: number): number {
  const byte = key[Math.floor(i / 8)];
  return (byte >> (7 - (i % 8))) & 1;
}

/** A leaf node: 64 bytes holding the key, and the value itself if it fits in 32 bytes. */
function leaf(key: Bytes, value: Bytes): Bytes {
  const node = new Uint8Array(64);
  if (value.length <= 32) {
    node[0] = 0b10000000 | value.length; // 1, 0: a leaf with the value inside; its length
    node.set(value, 32);
  } else {
    node[0] = 0b11000000; // 1, 1: a leaf with the value's hash
    node.set(blake2b256(value), 32);
  }
  node.set(key, 1);
  return node;
}

/** A branch node: its two subtries' hashes, side by side, with the first bit cleared. */
function branch(left: Bytes, right: Bytes): Bytes {
  const node = concatBytes(left, right);
  node[0] = node[0] & 0b01111111; // 0: a branch
  return node;
}

/** M (GP App. D): the hash of the trie of these entries, which agree on their first bits. */
function merkle(entries: KeyValue[], depth: number, trace?: Trace): Bytes {
  if (entries.length === 0) return new Uint8Array(32); // an empty trie is 32 zero bytes
  if (entries.length === 1) {
    const { key, value } = entries[0];
    trace?.event("leaf", { depth, key, size: value.length });
    return blake2b256(leaf(key, value));
  }
  const left = entries.filter((e) => bit(e.key, depth) === 0);
  const right = entries.filter((e) => bit(e.key, depth) === 1);
  return blake2b256(branch(merkle(left, depth + 1, trace), merkle(right, depth + 1, trace)));
}

/** The state root: the hash of the trie of every entry in the state. */
export function stateRoot(entries: KeyValue[], trace?: Trace): Bytes {
  return merkle(entries, 0, trace);
}
```

A few things to notice:

- **`bit`** finds byte `i / 8`, rounded down, and inside it bit `i % 8`, counted from the
  left: shift that bit to the bottom (`>>`), and keep just it (`& 1`). These are the
  bitwise operators lesson 1.2 warned about, and they're safe here: a byte is far below
  their 32 bits.
- **`0b10000000 | value.length`** builds a leaf's first byte in one go: the `1, 0` on
  top, the length (at most 32, so six bits are plenty) at the bottom.
- **`merkle` keeps the keys whole and counts `depth`.** The Gray Paper chops the first
  bit off every key at each level instead, and looks at the new first bit. Same trie, and
  no copying.
- **`trace`** is the same optional watcher as the decoder's (lesson 2.7): it hears about
  every leaf, and costs nothing when nobody is listening.

**Run**

```sh
npm test
# prints: the trie vectors: from no entries at all to ten
# prints: each header promises the state before its block, by its root: 400 real states
# prints: fail 0
# prints: reported
npm run typecheck
```

About fifty lines, and your client computes the state root of real JAM states, up to 273
entries each, exactly as the Gray Paper says. It takes a couple of seconds, most of it
reading 300 MB of JSON.

## Watch it

**New file** `bin/state.ts`

```ts
// Builds the trie of the state before a trace's block, shows where each entry lands, and
// checks the root against the one the block's header promises.
// Usage: node bin/state.ts <trace.json>, e.g.
//        node bin/state.ts ../vectors/traces/fallback/00000001.json

import { readFileSync } from "node:fs";
import type { Bytes } from "../src/bytes.ts";
import { fromHex, toHex } from "../src/bytes.ts";
import { Run } from "../src/obs.ts";
import { stateRoot } from "../src/trie.ts";

const [file] = process.argv.slice(2);
const trace = JSON.parse(readFileSync(file, "utf8"));
const entries = trace.pre_state.keyvals.map((e: { key: string; value: string }) => ({
  key: fromHex(e.key),
  value: fromHex(e.value),
}));
const run = new Run("state");
const root = stateRoot(entries, {
  event(step, fields) {
    run.event(step, fields);
    const { depth, key, size } = fields as { depth: number; key: Bytes; size: number };
    const where = size <= 32 ? "in the leaf" : "hashed";
    console.log(`depth ${String(depth).padStart(2)}  ${toHex(key)}  ${size}-byte value, ${where}`);
  },
});
const promised = trace.block.header.parent_state_root;
const matches = toHex(root) === promised;
console.log(`${entries.length} entries, state root ${toHex(root)}`);
console.log(`the header promises it: ${matches}`);
run.event("root", { root, promised, matches });
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/state.ts ../vectors/traces/fallback/00000001.json
# prints: depth  1  0xff00
# prints: 21 entries, state root 0xd6e78dc07a9ae915ada8306bf0da89b11044a2d4ee71ae0c5faf61f34f6b3a0c
# prints: the header promises it: true
# prints: reported to Grafana
```

Twenty-one entries, one root, and the header agrees. Now read the leaves, in key order,
and the trie's shape appears:

- `0xff00…` sits at **depth 1**: it's the only key that starts with a 1 bit, so it
  needs no more splitting. Same story as the little picture above.
- `0x0100…` to `0x0f00…` sit at **depth 8**: they differ only in their first byte, so
  eight bits tell them apart. Fifteen of them, plus `0x10` at depth 4.
- four keys starting `0x00` go deeper, to depth 9 to 11.

Most values are big enough to be hashed. The biggest, 159,322 bytes, is a service's code:
its hash is the code hash in the service's own entry, the one under `0xff`. Those
keys that are all zeros after the first byte look suspiciously *designed*, don't they?
That's the next lesson. The dashboard's *State trie* panel has every leaf and the root.

<details>
<summary>lasair: <code>merkle_trie_depth</code>, in <code>lib/merklization.ml</code></summary>

```ocaml
let rec merkle_trie_depth (entries : trie_entry list) (hash_fn : hash_fn) (depth : int) : bytes =
  match entries with
  | [] -> zero_hash
  | [{ key; value }] ->
    let node =
      if Bytes.length value <= 32 then
        encode_leaf key value
      else
        encode_hashed_leaf key (hash_fn value)
    in
    hash_fn node
  | _ ->
    (* Partition by bit at current depth (no key shifting) *)
    let left, right = List.partition (fun e -> not (get_bit e.key depth)) entries in
    (* Recurse at next depth *)
    let left_hash = merkle_trie_depth left hash_fn (depth + 1) in
    let right_hash = merkle_trie_depth right hash_fn (depth + 1) in
    let node = encode_branch left_hash right_hash in
    hash_fn node
```

Line for line, your `merkle`: no entries, one entry, or split and recurse. Even the
comment, "no key shifting", is the same trick as your `depth`. OCaml's `match` reads the
three cases off like the Gray Paper's own definition.

</details>

## What you have

The function every JAM node runs after every block: the state root. Your client can now
check that a header's `parent_state_root` really is the state it came from.
