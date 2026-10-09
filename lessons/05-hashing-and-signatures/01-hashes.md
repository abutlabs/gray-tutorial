# Hashes

A blockchain is called a *chain* because each block holds on to the one before it, and
what it holds is a **hash**: a 32-byte fingerprint of the previous block's header.
Change one bit of an old block and its fingerprint changes, which breaks the next block's
grip, and the next, all the way up. This lesson gives your client JAM's hash function,
and then checks a real chain of a hundred blocks, link by link.

## What the Gray Paper says

§3 (*Notational Conventions*): H(m) is **Blake2b** with a 256-bit (32-byte) output, as
defined in RFC 7693. JAM hashes *encodings*: to hash a value, encode it (Part 2), then
hash the bytes.

§5 (*The Header*): a header's `parent` is the hash of its parent block's header,
H(ℰ(parent header)). The test vectors' block-import traces are chains of real blocks, so
that's something you can check.

## A library, for once

So far you've written everything yourself. Hash functions are the exception. Writing a
correct, fast Blake2b is a fine exercise in cryptography, but this is a tutorial about
JAM, and a tiny mistake in a hash would make every result wrong in ways no test of yours
would catch. So the client takes its first dependency: `@noble/hashes`, a small, audited
library with no dependencies of its own.

**Rewrite** `package.json`

```json
{
  "name": "jam-client",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=./test/grafana.ts --test-reporter-destination=stdout \"test/**/*.test.ts\"",
    "typecheck": "tsc -p ."
  },
  "dependencies": {
    "@noble/hashes": "2.4.0"
  },
  "devDependencies": {
    "@types/node": "26.6.4",
    "typescript": "7.0.2"
  }
}
```

**Run**

```sh
npm install
```

## The tests

The first test pins the hash of *no bytes at all*, a classic known answer. The second
walks the tiny `fallback` trace, blocks 1 to 100, and checks every link.

**New file** `test/hash.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { Block, headerHash } from "../src/block.ts";
import { toHex } from "../src/bytes.ts";
import { TINY } from "../src/config.ts";
import { blake2b256 } from "../src/hash.ts";
import { vectorJson } from "./vectors.ts";

test("Blake2b-256 of nothing at all", () => {
  const empty = "0x0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8";
  assert.equal(toHex(blake2b256(new Uint8Array(0))), empty);
});

/** Block n of the tiny "fallback" trace: a chain of 100 real blocks. */
function traceBlock(n: number): Block {
  const name = `traces/fallback/${String(n).padStart(8, "0")}.json`;
  const trace = vectorJson(name) as { block: unknown };
  return Block(TINY).fromJson(trace.block);
}

test("each block names its parent by the hash of the header before it", () => {
  for (let n = 2; n <= 100; n++) {
    assert.deepEqual(traceBlock(n).header.parent, headerHash(TINY, traceBlock(n - 1).header));
  }
});
```

`Block` is both a codec and a type (lessons 2.5 and 4.7): `traceBlock(n): Block` uses
the type, `Block(TINY)` the codec. TypeScript tells them apart by where they appear.

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The code

**New file** `src/hash.ts`

```ts
// Hashing (GP §3): Blake2b-256, the hash JAM uses almost everywhere.

import { blake2b } from "@noble/hashes/blake2.js";
import type { Bytes } from "./bytes.ts";

/** H(x): Blake2b with a 32-byte output. */
export function blake2b256(data: Bytes): Bytes {
  return blake2b(data, { dkLen: 32 });
}
```

Blake2b can make fingerprints of any size up to 64 bytes. `dkLen: 32` asks for JAM's 32.

**Add to** `src/block.ts`

```ts
import type { Bytes } from "./bytes.ts";
import { encode } from "./codec/codec.ts";
import { blake2b256 } from "./hash.ts";

/** A header's hash (GP §5): what the next block names as its parent. */
export function headerHash(config: Config, header: Header): Bytes {
  return blake2b256(encode(Header(config), header));
}
```

Encode, then hash. Every hash in JAM works this way, which is why Part 2 had to be byte
perfect: one wrong byte in the encoding, and the hash is a stranger.

**Run**

```sh
npm test
# prints: each block names its parent by the hash of the header before it
# prints: fail 0
# prints: reported
npm run typecheck
```

99 links, checked: every one of these blocks really does follow the one before it.

## Watch the chain

**New file** `bin/chain.ts`

```ts
// Walks the 100 blocks of the tiny "fallback" trace and checks that each one names the
// hash of the block before it as its parent.

import { readFileSync } from "node:fs";
import { Block, headerHash } from "../src/block.ts";
import type { Bytes } from "../src/bytes.ts";
import { toHex } from "../src/bytes.ts";
import { TINY } from "../src/config.ts";
import { Run } from "../src/obs.ts";

const run = new Run("chain");
let previous: Bytes | null = null; // the hash of the last block's header
let holding = 0;
for (let n = 1; n <= 100; n++) {
  const file = `../vectors/traces/fallback/${String(n).padStart(8, "0")}.json`;
  const header = Block(TINY).fromJson(JSON.parse(readFileSync(file, "utf8")).block).header;
  const hash = headerHash(TINY, header);
  const linked = previous !== null && toHex(header.parent) === toHex(previous);
  if (linked) holding++;
  run.event("block", { slot: header.slot, hash, parent: header.parent, linked });
  previous = hash;
}
console.log(`${holding} of 99 links hold.`);
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/chain.ts
# prints: 99 of 99 links hold.
# prints: reported to Grafana
```

On the dashboard, the *Chain* panel lists all hundred blocks: slot, hash, and `linked:
true` for every one after the first. (Block 1's parent is the genesis header, which isn't
in the trace, so its link stays unchecked.)

<details>
<summary>lasair: <code>blake2b_256</code>, in <code>lib/utilities.ml</code></summary>

lasair uses a library too, `digestif`:

```ocaml
let blake2b_256 (data : bytes) : bytes =
  let module B2b = Digestif.Make_BLAKE2B(struct let digest_size = 32 end) in
  let hash = B2b.digest_bytes data in
  B2b.to_raw_string hash |> Bytes.of_string
```

`Make_BLAKE2B(struct let digest_size = 32 end)` builds a Blake2b with a 32-byte output:
the same knob as your `dkLen: 32`, in OCaml's module syntax. Every serious client leans
on a well-tested library here.

</details>

## What you have

A hash function, and proof that your encoding of headers is exact: if it were off by a
single byte, not one of those 99 links would hold.
