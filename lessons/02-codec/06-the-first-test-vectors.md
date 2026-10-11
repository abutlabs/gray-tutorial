# The first test vectors

Exam day. Your codec meets the official test vectors, the same ones every JAM team
checks against. Their `codec/` folder holds JAM structures twice over: as JSON, and as
the exact bytes ℰ produces. Decode the bytes into the JSON's values, encode those values
back into the very same bytes, and your codec agrees with every other client's. No
partial credit.

Everything in Part 2 gets used here: [lesson 2.1](./01-fixed-width-integers.md)'s fixed widths, [lesson 2.2](./02-compact-naturals.md)'s compact
naturals, [lesson 2.3](./03-writer-and-reader.md)'s Writer and Reader, and lessons [2.4](./04-codecs.md) and [2.5](./05-sequences-and-records.md)'s codecs, sequences
and records.

## New words

- **Hex dump.** A file's bytes printed as hex, a few to a line, to read them by eye.
  *Example:* `04 03 02 01 70 a5 08 29`.
- **Round trip.** Decode the bytes, encode the result, and check you got the very same
  bytes back. *Example:* `work_item.bin` → a work item → `work_item.bin` again.
- **Tiny and full.** JAM's two sizes, with the same rules: *full* is the real network,
  *tiny* a small one for tests (6 validators, 2 cores). *Example:* `codec/tiny/` and
  `codec/full/`.

All three are in the [glossary](../glossary.md), next to *test vector*.

## Look at one

From `client/`, the vectors are at `../vectors/`. A small program to show a file's bytes
in hex will be handy for every vector from here on:

**New file** `bin/hexdump.ts`

```ts
// Prints the first bytes of a file in hex, 16 to a line.
// Usage: node bin/hexdump.ts <file> [how many bytes, 64 if not given]

import { readFileSync } from "node:fs";

const [file, count = "64"] = process.argv.slice(2);
if (!file) throw new Error("usage: node bin/hexdump.ts <file> [count]");
const bytes = readFileSync(file).subarray(0, Number(count));
for (let i = 0; i < bytes.length; i += 16) {
  console.log([...bytes.subarray(i, i + 16)].map((b) => b.toString(16).padStart(2, "0")).join(" "));
}
```

**Run**

```sh
cat ../vectors/codec/tiny/work_item.json
node bin/hexdump.ts ../vectors/codec/tiny/work_item.bin 48
```

```text
{
    "service": 16909060,
    "code_hash": "0x70a50829851e8f6a8c80f92806ae0e95eb7c06ad064e311cc39107b3219e532e",
    "refine_gas_limit": 42,
...
04 03 02 01 70 a5 08 29 85 1e 8f 6a 8c 80 f9 28
06 ae 0e 95 eb 7c 06 ad 06 4e 31 1c c3 91 07 b3
21 9e 53 2e 2a 00 00 00 00 00 00 00 2a 00 00 00
```

![The work item's first 60 bytes, field after field: service 16909060 as 04 03 02 01 (ℰ₄), code_hash as its 32 bytes, both gas limits 42 as 2a and seven zeros (ℰ₈), export_count 4 as 04 00 (ℰ₂), and the payload as its length 5 then its five bytes, with 176 more bytes after](./images/06-work-item-bytes.svg)

Read the first bytes against the JSON:

- `04 03 02 01` is `service`, 16909060, as ℰ₄. In hex 16909060 is `0x01020304`, written
  least significant byte first.
- The next 32 bytes, `70 a5 08 29 ...`, are `code_hash`, as they are.
- `2a 00 00 00 00 00 00 00` is `refine_gas_limit`, 42, as ℰ₈.

The `tiny` and `full` folders hold the same structures under JAM's two parameter sets.
The small "tiny" one (6 validators, 2 cores) is what tests run fast with, and "full" is
the real network. For the structures in this lesson the two are identical, and later
ones differ.

## A helper for vectors

**New file** `test/vectors.ts`

```ts
// The official test vectors, in vectors/ at the repo root (npm run vectors there).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Bytes } from "../src/bytes.ts";
import type { Codec } from "../src/codec/codec.ts";
import { decode, encode } from "../src/codec/codec.ts";

const VECTORS = fileURLToPath(new URL("../../vectors/", import.meta.url));

/** A vector file's JSON, by its name in vectors/, such as "codec/tiny/work_item.json". */
export function vectorJson(name: string): unknown {
  return JSON.parse(readFileSync(VECTORS + name, "utf8"));
}

/** A vector file's bytes. */
export function vectorBytes(name: string): Bytes {
  return new Uint8Array(readFileSync(VECTORS + name));
}

/** A codec vector: the .bin decodes to the .json's value, which encodes back to the .bin. */
export function checkCodecVector<T>(codec: Codec<T>, name: string): void {
  const bytes = vectorBytes(`${name}.bin`);
  const value = codec.fromJson(vectorJson(`${name}.json`));
  assert.deepEqual(decode(codec, bytes), value);
  assert.deepEqual(encode(codec, value), bytes);
}
```

`new URL("../../vectors/", import.meta.url)` finds the folder relative to *this file*,
so the tests work from wherever you run them. `readFileSync` hands back a Node `Buffer`;
`new Uint8Array(...)` turns it into a plain `Uint8Array`, because `deepEqual` insists the
two things it compares are the same kind of thing.

`checkCodecVector` is the exam itself: the bytes must decode to the JSON's value, and
that value must encode back to the very same bytes.

Its name doesn't end in `.test.ts`, so `npm test`'s pattern leaves it out: it is a
helper the tests import, like `test/grafana.ts`.

## The structures

Two structures from the Gray Paper, both about *work*: what a service asks a core to
compute. You'll get to know them properly in Part 3. Today they're just shapes to
encode.

**The refinement context** (§11, *Refinement Context*) describes the chain as a
work-package saw it: an *anchor*, a recent block with its slot, state root and
accumulation-output root, and a *lookup anchor*, the block whose state its code reads
preimages from, again with its slot and state root. Last come the hashes of any
work-packages that must be accumulated first.

**A work item** (§14, *Packages and Items*) is one job inside a work-package: the
service it is for, that service's code hash, the gas limits for its two stages, a
payload, the data segments it imports and how many it exports, and the extrinsic data
it carries.

Write the fields in the order **Appendix C encodes them**, not the order the definitions
list them. They differ: §14 lists a work item's payload third, but Appendix C encodes it
after the gas limits and the export count. The encoding is what the bytes follow, and
the test vectors' JSON lists fields in that order too.

**New file** `test/work.test.ts`

```ts
import { test } from "node:test";
import { RefineContext, WorkItem } from "../src/work.ts";
import { checkCodecVector } from "./vectors.ts";

for (const spec of ["tiny", "full"]) {
  const dir = `codec/${spec}`;
  test(`refine_context (${spec})`, () => checkCodecVector(RefineContext, `${dir}/refine_context`));
  test(`work_item (${spec})`, () => checkCodecVector(WorkItem, `${dir}/work_item`));
}
```

**Run, expect it to fail**

```sh
npm test
```

```text
...
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/client/src/work.ts' imported from …/client/test/work.test.ts
...
✖ test/work.test.ts (155.9ms)
...
ℹ tests 18
ℹ suites 0
ℹ pass 17
ℹ fail 1
...
```

It fails because `src/work.ts` doesn't exist yet. (No stub this time: the vectors are
about to judge the real thing.) You write it next.

**New file** `src/work.ts`

```ts
// Work: what services ask the cores to compute (GP §11, §14).

import type { Value } from "./codec/codec.ts";
import { blob, hash, record, seq, u16, u32, u64 } from "./codec/codec.ts";

/** The refinement context (GP §11): the chain as a work-package saw it. */
export const RefineContext = record({
  anchor: hash, // a recent block's header hash
  anchor_slot: u32,
  state_root: hash, // the anchor's posterior state root
  beefy_root: hash, // the anchor's accumulation-output super-peak
  lookup_anchor: hash, // the block whose state refine reads preimages from
  lookup_anchor_slot: u32,
  lookup_anchor_state_root: hash,
  prerequisites: seq(hash), // work-packages to accumulate first
});
export type RefineContext = Value<typeof RefineContext>;

/** A data segment to import: which set of segments (by its root), and which one in it. */
export const ImportSpec = record({
  tree_root: hash,
  index: u16,
});
export type ImportSpec = Value<typeof ImportSpec>;

/** Extrinsic data a work item carries: its hash and length. */
export const ExtrinsicSpec = record({
  hash: hash,
  len: u32,
});
export type ExtrinsicSpec = Value<typeof ExtrinsicSpec>;

/** A work item (GP §14): one job in a work-package, for one service. */
export const WorkItem = record({
  service: u32,
  code_hash: hash,
  refine_gas_limit: u64,
  accumulate_gas_limit: u64,
  export_count: u16,
  payload: blob,
  import_segments: seq(ImportSpec),
  extrinsic: seq(ExtrinsicSpec),
});
export type WorkItem = Value<typeof WorkItem>;
```

Hover over `RefineContext` in VS Code: its type is spelled out field by field, and you
never wrote it. The codec did.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ refine_context (tiny) (3.2ms)
✔ work_item (tiny) (0.4ms)
✔ refine_context (full) (1.1ms)
✔ work_item (full) (0.8ms)
...
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
...
reported 21 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791726654352
...
```

All four pass: tiny and full, both structures. Your codec reproduces the official
encoding, byte for byte. That's a real JAM milestone, however small: a client written
from the Gray Paper alone agreeing with the reference. Enjoy it.

## Break it on purpose

To see what a mismatch looks like, move `export_count` in `WorkItem` up, above the two
gas limits, and run `npm test`. The work_item tests fail with a diff (`+` is what your
code decoded, `-` is the vector's JSON):

```text
+   accumulate_gas_limit: 1125899906842624n,
-   accumulate_gas_limit: 42n,
+   export_count: 42,
-   export_count: 4,
+   refine_gas_limit: 11821949021847552n,
-   refine_gas_limit: 42n,
```

The decoder took the first 2 bytes of the refine gas limit (`2a 00`) as the export
count, 42, and each gas limit then started 2 bytes late, which makes them huge. The
three fields together are still 18 bytes, so the payload and everything after it still
line up and decode correctly. Move a field of a different width and everything after it
goes wrong. Put `export_count` back before going on.

<details>
<summary>lasair: <code>encode_refinement_context</code></summary>

```ocaml
let encode_refinement_context (c : refinement_context) : bytes =
  encode_tuple [
    encode_hash c.anchor;
    encode_u32 (Int64.of_int c.anchor_slot);
    encode_hash c.state_root;
    encode_hash c.beefy_root;
    encode_hash c.lookup_anchor;
    encode_u32 (Int64.of_int c.lookup_anchor_slot);
    encode_hash c.lookup_anchor_state_root;
    encode_var_sequence encode_hash c.prerequisites;
  ]
```

Line for line your `RefineContext`. `encode_var_sequence` is your `seq`, with the length
in front. Two of these fields, `anchor_slot` and `lookup_anchor_state_root`, are new in
Gray Paper 0.8.0, and lasair's type marks them so.

</details>

## What you have

A codec built from a dozen small pieces, and the first two JAM structures agreeing with
the official vectors at both parameter sets. When a decode goes wrong, though, all a test
can say is that two values differ. [Lesson 2.7](./07-watch-a-decode.md) makes the codec
say which bytes it read for which field.

Next: [2.7 Watch a decode](./07-watch-a-decode.md)
