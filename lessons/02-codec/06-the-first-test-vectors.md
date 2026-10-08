# The first test vectors

Your codec meets the official test vectors. The `codec/` folder of the vectors holds JAM
structures twice over: as JSON, and as the exact bytes ℰ produces. If your client decodes
the bytes to the JSON's values, and encodes those values back to the same bytes, its
codec agrees with every other client's for that structure.

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
# prints: "refine_gas_limit": 42
node bin/hexdump.ts ../vectors/codec/tiny/work_item.bin 48
# prints: 04 03 02 01 70 a5 08 29
```

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
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Bytes } from "../src/bytes.ts";
import type { Codec } from "../src/codec/codec.ts";
import { decode, encode } from "../src/codec/codec.ts";
import { parseJson } from "../src/json.ts";

const VECTORS = fileURLToPath(new URL("../../vectors/", import.meta.url));

/** The full path of a vector file, such as "codec/tiny/work_item.json". */
export function vectorPath(name: string): string {
  if (!existsSync(VECTORS)) {
    throw new Error("no vectors/ at the repo root: run `npm run vectors` there");
  }
  return VECTORS + name;
}

export function vectorJson(name: string): unknown {
  return parseJson(readFileSync(vectorPath(name), "utf8"));
}

export function vectorBytes(name: string): Bytes {
  return new Uint8Array(readFileSync(vectorPath(name)));
}

/** A codec vector: the .bin decodes to the .json's value, which encodes back to the .bin. */
export function checkCodecVector<T>(codec: Codec<T>, name: string): void {
  const bytes = vectorBytes(`${name}.bin`);
  const value = codec.fromJson(vectorJson(`${name}.json`));
  assert.deepEqual(decode(codec, bytes), value);
  assert.deepEqual(encode(codec, value), bytes);
}
```

`new URL("../../vectors/", import.meta.url)` finds the folder relative to this file, not
to wherever you run the tests from. `readFileSync` returns a Node `Buffer`, and
`new Uint8Array(...)` copies it into a plain `Uint8Array`, which is what `deepEqual`
expects to compare with (lesson 1.1).

The file is in `test/` but is not a test (its name doesn't end in `.test.ts`), so the
test runner leaves it alone and the tests import it.

## The structures

Two structures from the Gray Paper, both about work: what a service asks a core to
compute. You will meet them properly in Part 3. For now they are shapes to encode.

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
# fails with: Cannot find module
```

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

/**
 * A segment to import: segment `index` of the segments whose Merkle root is `tree_root`.
 * An index of 2^15 or more means tree_root is the hash of the exporting work-package
 * instead, and the segment is index − 2^15 (GP Appendix C, I).
 */
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

Hover over `RefineContext` in VS Code: its type is spelled out field by field, derived
from the codec.

**Run**

```sh
npm test
# prints: refine_context (full)
# prints: work_item (full)
# prints: fail 0
npm run typecheck
```

All four pass: tiny and full, both structures. Your codec reproduces the official
encoding byte for byte.

## Break it on purpose

To see what a mismatch looks like, move `export_count` in `WorkItem` up, above the two
gas limits, and run `npm test`. The work_item tests fail with a diff (`+` is what your
code decoded, `-` is the vector's JSON):

```text
+   accumulate_gas_limit: 11821949021847552n,
-   accumulate_gas_limit: 42n,
+   export_count: 42,
-   export_count: 4,
+   refine_gas_limit: 1125899906842624n,
-   refine_gas_limit: 42n,
```

The decoder took the first 2 bytes of the refine gas limit (`2a 00`) as the export
count, 42, and each gas limit then started 2 bytes late, which makes them huge. The
three fields together are still 18 bytes, so the payload and everything after it still
line up and decode correctly. Move a field of a different width and everything after it
goes wrong, often with a `DecodeError`. Put `export_count` back before going on.

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
the official vectors at both parameter sets. Part 3 does the rest of the work
structures: work-packages, work-digests and work-reports.
