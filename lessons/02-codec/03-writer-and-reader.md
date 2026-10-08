# Writer and Reader

## Why

A block header has ten fields, a work-report a dozen, some of them lists of other
structures. Encoding one by gluing byte arrays together, and decoding one by tracking
offsets by hand, would bury every structure under bookkeeping. So the codec gets two
small helpers:

- a **Writer**, which collects bytes as you write values into it;
- a **Reader**, which walks through bytes front to back, keeping its own place.

The Gray Paper encodes a structure by putting its fields' encodings one after another
(Appendix C: *"anonymous tuples ... encoded as the concatenation of their encoded
elements"*). A Writer does exactly that, and a Reader undoes it in the same order.

## The tests

**New file** `test/writer-reader.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromHex, toHex } from "../src/bytes.ts";
import { DecodeError } from "../src/codec/numbers.ts";
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
  r.finish();
});

test("a writer grows as it needs to", () => {
  const w = new Writer();
  for (let i = 0; i < 1000; i++) w.fixed(BigInt(i % 256), 1);
  const bytes = w.finish();
  assert.equal(bytes.length, 1000);
  assert.equal(bytes[999], 999 % 256);
});

test("a reader refuses to read past the end, or to finish early", () => {
  const r = new Reader(fromHex("0x0102"));
  assert.throws(() => r.bytes(3), DecodeError);
  assert.equal(r.fixed(1), 1n);
  assert.throws(() => r.finish(), /left over/);
});

test("the bytes a reader returns are a copy", () => {
  const input = fromHex("0x0102");
  const b = new Reader(input).bytes(2);
  b[0] = 9;
  assert.equal(input[0], 1);
});
```

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The Writer

**New file** `src/codec/writer.ts`

```ts
// Writer: collects the bytes of an encoding.

import type { Bytes } from "../bytes.ts";
import { encodeFixed, encodeNatural } from "./numbers.ts";

export class Writer {
  #buffer = new Uint8Array(256);
  #length = 0;

  /** Bytes as they are: in the GP a blob encodes to itself. */
  bytes(b: Bytes): void {
    this.#reserve(b.length);
    this.#buffer.set(b, this.#length);
    this.#length += b.length;
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
    return this.#buffer.slice(0, this.#length);
  }

  /** Make room for n more bytes, doubling the buffer as often as needed. */
  #reserve(n: number): void {
    if (this.#length + n <= this.#buffer.length) return;
    let size = this.#buffer.length * 2;
    while (size < this.#length + n) size *= 2;
    const bigger = new Uint8Array(size);
    bigger.set(this.#buffer.subarray(0, this.#length));
    this.#buffer = bigger;
  }
}
```

Names starting with `#` are private: only the class's own methods can see them, which
JavaScript itself enforces. The buffer starts at 256 bytes and doubles when it fills, so
writing a whole block costs a handful of copies, not one per field.

## The Reader

**New file** `src/codec/reader.ts`

```ts
// Reader: walks through the bytes of an encoding, front to back.

import type { Bytes } from "../bytes.ts";
import { DecodeError, decodeFixed, decodeNatural } from "./numbers.ts";

export class Reader {
  #bytes: Bytes;
  #at = 0;

  constructor(bytes: Bytes) {
    this.#bytes = bytes;
  }

  /** How many bytes are left to read. */
  get remaining(): number {
    return this.#bytes.length - this.#at;
  }

  /** The next n bytes, as a copy. */
  bytes(n: number): Bytes {
    if (n > this.remaining) throw new DecodeError(`wanted ${n} bytes, ${this.remaining} left`);
    const out = new Uint8Array(this.#bytes.subarray(this.#at, this.#at + n));
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

  /** The end: an encoding uses every byte; leftover bytes mean it was not what we expected. */
  finish(): void {
    if (this.remaining !== 0) throw new DecodeError(`${this.remaining} byte(s) left over`);
  }
}
```

Two choices worth a look:

- `bytes` returns a **copy** (`new Uint8Array(view)`). A view into the input would be
  cheaper, but a decoded hash that changes when someone reuses the input buffer is a bug
  you would hunt for days.
- `finish` refuses leftover bytes. A block that decodes cleanly but has extra bytes at
  the end is not a valid encoding of any block, and a client must reject it, not ignore
  the tail.

**Run**

```sh
npm test
# prints: fail 0
npm run typecheck
```

<details>
<summary>lasair: offsets by hand</summary>

lasair's decoders take the input and an offset and return the value with the number of
bytes they used. The caller keeps the position in a mutable reference, `pos`, and
adds each size to it, from `lib/serialization.ml`:

```ocaml
let (context, sz) = decode_refinement_context bs !pos in pos := !pos + sz;
```

`!pos` reads the reference and `pos := ...` writes it. Your Reader keeps that position
inside itself, so no caller can forget to add a size.

</details>

Next: [2.4 Codecs](./04-codecs.md)
