# Writer and Reader

A block header has ten fields. A work-report has a dozen, some of them lists of other
structures. Gluing byte arrays by hand and counting offsets for each would bury every
structure in bookkeeping. Two little helpers make the bookkeeping disappear:

- a **Writer**, which collects the pieces of an encoding as you write them;
- a **Reader**, which walks through bytes front to back, keeping its own place.

## What the Gray Paper says

Appendix C encodes a structure by putting its parts' encodings one after another:
*"anonymous tuples ... encoded as the concatenation of their encoded elements"*. A
Writer does exactly that, and a Reader undoes it, in the same order.

## The test

**New file** `test/writer-reader.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromHex, toHex } from "../src/bytes.ts";
import { Reader } from "../src/codec/reader.ts";
import { Writer } from "../src/codec/writer.ts";

test("a reader reads back what a writer wrote, in the same order", () => {
  const w = new Writer();
  w.fixed(4807n, 2);
  w.natural(128n);
  w.bytes(fromHex("0xdeadbeef"));
  const bytes = w.finish();
  assert.equal(toHex(bytes), "0xc7128080deadbeef");

  const r = new Reader(bytes);
  assert.equal(r.fixed(2), 4807n);
  assert.equal(r.natural(), 128n);
  assert.deepEqual(r.bytes(4), fromHex("0xdeadbeef"));
});
```

Three values in, eight bytes out, three values back. `c712` is 4,807 (lesson 2.1),
`8080` is 128 (lesson 2.2), and `deadbeef` is, well, a classic.

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The Writer

**New file** `src/codec/writer.ts`

```ts
// Writer: collects the parts of an encoding, then glues them together.

import type { Bytes } from "../bytes.ts";
import { concatBytes } from "../bytes.ts";
import { encodeFixed, encodeNatural } from "./numbers.ts";

export class Writer {
  #parts: Bytes[] = [];

  /** Bytes as they are: in the GP a blob encodes to itself. */
  bytes(b: Bytes): void {
    this.#parts.push(b);
  }

  /** ℰ_l(x) */
  fixed(x: bigint, l: number): void {
    this.bytes(encodeFixed(x, l));
  }

  /** ℰ(x) */
  natural(x: bigint): void {
    this.bytes(encodeNatural(x));
  }

  /** Everything written so far, as one byte string. */
  finish(): Bytes {
    return concatBytes(...this.#parts);
  }
}
```

A Writer is a list of pieces, and `finish` glues them with lesson 2.2's ⌢. Names
starting with `#` are private: only the class's own methods can touch them, and
JavaScript itself enforces it.

## The Reader

**New file** `src/codec/reader.ts`

```ts
// Reader: walks through the bytes of an encoding, front to back.

import type { Bytes } from "../bytes.ts";
import { decodeFixed, decodeNatural } from "./numbers.ts";

export class Reader {
  #bytes: Bytes;
  #at = 0; // where the next read starts

  constructor(bytes: Bytes) {
    this.#bytes = bytes;
  }

  /** The next n bytes. */
  bytes(n: number): Bytes {
    const out = this.#bytes.slice(this.#at, this.#at + n);
    this.#at += n;
    return out;
  }

  /** The inverse of ℰ_l. */
  fixed(l: number): bigint {
    return decodeFixed(this.bytes(l));
  }

  /** The inverse of ℰ. */
  natural(): bigint {
    const { value, length } = decodeNatural(this.#bytes, this.#at);
    this.#at += length;
    return value;
  }
}
```

The whole trick is `#at`. Every read starts there and moves it along, so nobody calling
the Reader ever counts a byte again. (`slice` hands back a copy, so what you read can't
change under your feet if someone reuses the input.)

**Run**

```sh
npm test
# prints: fail 0
# prints: reported
npm run typecheck
```

<details>
<summary>lasair: offsets by hand</summary>

lasair's decoders take the input and an offset, and return the value along with the
number of bytes they used. The caller keeps the position in a mutable reference, `pos`,
and adds each size to it by hand, from `lib/serialization.ml`:

```ocaml
let (context, sz) = decode_refinement_context bs !pos in pos := !pos + sz;
```

`!pos` reads the reference and `pos := ...` writes it. Your Reader keeps that position
inside itself, so no caller can forget to add a size.

</details>

Next: [2.4 Codecs](./04-codecs.md)
