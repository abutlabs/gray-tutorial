# Codecs

Every kind of JAM value needs three things:

1. its encoding, ℰ, from the Gray Paper;
2. its decoding, the way back;
3. a way to read it from the test vectors' JSON, so tests can compare.

Write those three separately for every structure and sooner or later they drift apart: a
field added to the encoder but not the decoder, two fields read in the wrong order.
So each kind of value gets one object holding all three, a `Codec<T>`. Small codecs
(a u32, a hash) snap together into codecs for whole structures, like bricks. The field
order gets written once, and every direction follows it.

## New words

- **Codec.** One object that knows one kind of value three ways: how to encode it, how to
  decode it, and how to read it from JSON. *Example:* `u32`, the codec for 4-byte numbers.
- **JSON.** The plain-text format the test vectors are written in. *Example:*
  `{"slot": 42, "hash": "0x01..."}`.
- **Interface.** A TypeScript list of what an object must have, with no code in it.
  *Example:* every codec has `encode`, `decode` and `fromJson`.
- **Generic (`<T>`).** A type with a blank in it, filled in where it's used. *Example:*
  `Codec<number>` is a codec for numbers, `Codec<Bytes>` one for bytes.
- **Blob.** Any run of bytes of no fixed length, written with its length in front (the
  Gray Paper's ↕). *Example:* the three bytes 1, 2, 3 encode as `0x03010203`: `03`, the
  length, then `01 02 03`.

All five are in the [glossary](../glossary.md).

## The interface

**New file** `src/codec/codec.ts`

```ts
// Codec<T>: one kind of value, how it is encoded (GP Appendix C), how it is decoded,
// and how the test vectors write it in JSON.

import type { Bytes } from "../bytes.ts";
import { Reader } from "./reader.ts";
import { Writer } from "./writer.ts";

export interface Codec<T> {
  encode(w: Writer, value: T): void;
  decode(r: Reader): T;
  /** The value, from the way the test vectors write it in JSON. */
  fromJson(json: unknown): T;
}

/** The type of value a codec handles: Value<typeof u32> is number. */
export type Value<C> = C extends Codec<infer T> ? T : never;

/** ℰ(value): the value's encoding. */
export function encode<T>(codec: Codec<T>, value: T): Bytes {
  const w = new Writer();
  codec.encode(w, value);
  return w.finish();
}

/** The value these bytes encode. */
export function decode<T>(codec: Codec<T>, bytes: Bytes): T {
  return codec.decode(new Reader(bytes));
}
```

`Value<C>` uses `infer`: "if C is a `Codec` of some T, give me that T". It lets the type
of a whole structure fall out of its codec, as [the next lesson](./05-sequences-and-records.md) shows off.

## Integers

**Add to** `src/codec/codec.ts`

```ts
/** ℰ_l for l = 1, 2 or 4, as a JS number. */
function fixedNumber(l: number): Codec<number> {
  return {
    encode: (w, x) => w.fixed(BigInt(x), l),
    decode: (r) => Number(r.fixed(l)),
    fromJson: (json) => json as number,
  };
}

/** ℰ₁: a u8. */
export const u8 = fixedNumber(1);

/** ℰ₂: a u16. */
export const u16 = fixedNumber(2);

/** ℰ₄: a u32: timeslots, service ids. */
export const u32 = fixedNumber(4);

/** ℰ₈: a u64: gas, balances. */
export const u64: Codec<bigint> = {
  encode: (w, x) => w.fixed(x, 8),
  decode: (r) => r.fixed(8),
  fromJson: (json) => BigInt(json as number),
};

/** ℰ, compact: a natural below 2^64. */
export const natural: Codec<bigint> = {
  encode: (w, x) => w.natural(x),
  decode: (r) => r.natural(),
  fromJson: (json) => BigInt(json as number),
};

/** ℰ, compact, for small counts and lengths, as a JS number. */
export const natural32: Codec<number> = {
  encode: (w, x) => w.natural(BigInt(x)),
  decode: (r) => Number(r.natural()),
  fromJson: (json) => json as number,
};
```

`fixedNumber` isn't exported: it's a recipe the file uses three times. There are two
compact codecs because the same encoding carries two kinds of value: amounts that can
reach 2^64 (`bigint`, [lesson 1.2](../01-bytes-and-numbers/02-numbers.md)) and counts that never come close (`number`).
The 32 in `natural32` says what it's for, counts and lengths that fit in 32 bits, not how
many bytes it writes: its bytes are the same compact ones as `natural`'s, so the count 3 is
the one byte `03`, never four.

`json as number` tells TypeScript "trust me, the vectors write a number here". The test
vectors are well-formed, so the first pass trusts them; checking them is a job for the
[hardening pass](https://github.com/abutlabs/the-gray-tutor/blob/main/HARDENING.md).

## Bytes

**Add to** `src/codec/codec.ts`

```ts
import { fromHex } from "../bytes.ts";

/** 𝔹_n: exactly n bytes, encoded as themselves. */
export function fixedBytes(n: number): Codec<Bytes> {
  return {
    encode: (w, b) => w.bytes(b),
    decode: (r) => r.bytes(n),
    fromJson: (json) => fromHex(json as string),
  };
}

/** ℍ: a 32-byte hash. */
export const hash = fixedBytes(32);

/** ↕x: a blob of any length, its length first. */
export const blob: Codec<Bytes> = {
  encode: (w, b) => {
    w.natural(BigInt(b.length));
    w.bytes(b);
  },
  decode: (r) => r.bytes(Number(r.natural())),
  fromJson: (json) => fromHex(json as string),
};
```

The Gray Paper writes ↕x for "x with its length in front" (Appendix C, *Discriminator
Encoding*). A hash needs no length, since everyone knows it's 32 bytes. A blob of any
size has to announce itself.

## Tests

**New file** `test/codec.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromHex, toHex } from "../src/bytes.ts";
import { blob, decode, encode, hash, natural, natural32, u16, u32, u64, u8 } from "../src/codec/codec.ts";
import type { Bytes } from "../src/bytes.ts";

test("integers encode as ℰ_l and ℰ", () => {
  const u8Hex: string = toHex(encode(u8, 7));
  assert.equal(u8Hex, "0x07");
  const u16Hex: string = toHex(encode(u16, 4807));
  assert.equal(u16Hex, "0xc712");
  const u32Hex: string = toHex(encode(u32, 16909060));
  assert.equal(u32Hex, "0x04030201");
  const u64Hex: string = toHex(encode(u64, 42n));
  assert.equal(u64Hex, "0x2a00000000000000");
  const naturalHex: string = toHex(encode(natural, 128n));
  assert.equal(naturalHex, "0x8080");
  const decoded: number = decode(natural32, fromHex("0xc00040"));
  assert.equal(decoded, 16384);
});

test("from the vectors' JSON: u32s stay numbers, u64s become bigints", () => {
  const fromU32: number = u32.fromJson(16909060);
  assert.equal(fromU32, 16909060);
  const fromU64: bigint = u64.fromJson(42);
  assert.equal(fromU64, 42n);
});

test("a hash is 32 bytes as they are; a blob has its length in front", () => {
  const h: Bytes = new Uint8Array(32).fill(0xab);
  const hashEncoded: Bytes = encode(hash, h);
  assert.deepEqual(hashEncoded, h);
  const blobHex: string = toHex(encode(blob, fromHex("0x0102030405")));
  assert.equal(blobHex, "0x050102030405");
  const blobDecoded: Bytes = decode(blob, fromHex("0x050102030405"));
  assert.deepEqual(blobDecoded, fromHex("0x0102030405"));
});
```

The tests' bytes, value by value:

```text
07                        7 as a u8: 1 byte
c7 12                     4,807 as a u16: 2 bytes, little end first
04 03 02 01               16,909,060 (0x01020304) as a u32: 4 bytes
2a 00 00 00 00 00 00 00   42 as a u64: 8 bytes, however small the number
80 80                     128 as a compact natural: 2 bytes
c0 00 40                  16,384 as a compact natural: 3 bytes
05 01 02 03 04 05         a 5-byte blob: its length, 05, then the 5 bytes
```

A hash is its 32 bytes and nothing else: its length is always 32, so none goes in front.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ integers encode as ℰ_l and ℰ (0.6ms)
✔ from the vectors' JSON: u32s stay numbers, u64s become bigints (0.1ms)
✔ a hash is 32 bytes as they are; a blob has its length in front (1.2ms)
...
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
...
reported 15 tests to Grafana: http://127.0.0.1:3300/d/the-gray-tutor?var-client=you&var-run_id=test-1791726352348
...
```

This time the tests come after the code: the earlier lessons already tested the
machinery underneath, so these just check the joints. Right width for each integer,
length in front of a blob, and 16909060 written as `04 03 02 01`, little end first.

<details>
<summary>lasair: separate encoders and decoders</summary>

lasair writes an encoder and a decoder for each structure, as two functions, such as
`encode_refinement_context` and `decode_refinement_context` in `lib/serialization.ml`.
It works, and its tests keep each pair in step. A codec makes the pairing structural
instead: one field list per structure, so encoder and decoder can't disagree about the
order.

</details>

## Check your understanding

::: check
**Why put encoding, decoding and reading the JSON in one codec, instead of three separate functions?**

- [ ] A codec writes fewer bytes than separate functions would
  > No: the bytes are the Gray Paper's either way. 4,807 as a u16 is `c7 12` however
  > the code is arranged.
- [x] So the three can't drift apart
  > Yes: written separately, a field gets added to the encoder but not the decoder, or two
  > fields get read in the wrong order. In one codec, the order is written once.
- [ ] Because the test vectors are stored with all three in one file
  > No: the vectors hold values (in JSON) and bytes. Grouping the three directions is
  > about keeping your own code in step.

**16,384 as a `u32`, and 16,384 as a `natural`: what bytes?**

- [ ] The same bytes: a number has only one encoding
  > No: the codec decides. ℰ₄ always writes four bytes, and the compact natural as few
  > as it needs.
- [ ] `c0 00 40` for both: a compact natural is just a smaller u32
  > No: `c0 00 40` is the compact natural only. A u32 has no marker byte; it is four
  > bytes of the number, little end first.
- [x] `00 40 00 00` as a u32, `c0 00 40` as a natural
  > Yes: 16,384 is `0x4000`. ℰ₄ writes it in four bytes, little end first. The compact
  > natural needs three: the marker `c0`, then `00 40`.

**How does decoding `05 01 02 03 04 05` as a blob know to stop after five bytes?**

- [x] It reads the length first, `05`, then exactly that many bytes
  > Yes: that's what ↕ is for. A blob of any size announces its length, a compact
  > natural, in front.
- [ ] It reads to the end of the input
  > No: a blob can sit in the middle of a bigger value, with more fields after it. The
  > length says where it ends.
- [ ] Blobs are always five bytes, like a hash is always 32
  > No: a blob can be any length; that's why it carries one. A hash needs no length
  > because it is always 32 bytes.

**`natural32` handles counts as a JS number. Does it write a 4-byte number?**

- [ ] Yes: the 32 means 32 bits, so 4 bytes
  > No: the name is about the value in your code, a `number` instead of a `bigint`, not
  > the bytes. On the wire it is the same compact natural as `natural`.
- [x] No: it writes exactly the bytes `natural` does
  > Yes: both use ℰ, the compact natural, so 16,384 is `c0 00 40` from either. Only the
  > type you get back differs: counts never come near 2^64, so a plain `number` holds
  > them.
:::

## What you have

A `Codec`: one description of a value that both encodes and decodes it, for every
integer width and for blobs. JAM's structures are made of these, in lists and in records
of named fields. [Lesson 2.5](./05-sequences-and-records.md) builds those two, and with
them, any JAM structure.

Next: [2.5 Sequences and records](./05-sequences-and-records.md)
