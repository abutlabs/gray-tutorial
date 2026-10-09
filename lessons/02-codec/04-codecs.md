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
of a whole structure fall out of its codec, as the next lesson shows off.

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
reach 2^64 (`bigint`, lesson 1.2) and counts that never come close (`number`).

`json as number` tells TypeScript "trust me, the vectors write a number here". The test
vectors are well-formed, so the first pass trusts them; checking them is a job for the
hardening pass.

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

test("integers encode as ℰ_l and ℰ", () => {
  assert.equal(toHex(encode(u8, 7)), "0x07");
  assert.equal(toHex(encode(u16, 4807)), "0xc712");
  assert.equal(toHex(encode(u32, 16909060)), "0x04030201");
  assert.equal(toHex(encode(u64, 42n)), "0x2a00000000000000");
  assert.equal(toHex(encode(natural, 128n)), "0x8080");
  assert.equal(decode(natural32, fromHex("0xc00040")), 16384);
});

test("from the vectors' JSON: u32s stay numbers, u64s become bigints", () => {
  assert.equal(u32.fromJson(16909060), 16909060);
  assert.equal(u64.fromJson(42), 42n);
});

test("a hash is 32 bytes as they are; a blob has its length in front", () => {
  const h = new Uint8Array(32).fill(0xab);
  assert.deepEqual(encode(hash, h), h);
  assert.equal(toHex(encode(blob, fromHex("0x0102030405"))), "0x050102030405");
  assert.deepEqual(decode(blob, fromHex("0x050102030405")), fromHex("0x0102030405"));
});
```

**Run**

```sh
npm test
# prints: fail 0
# prints: reported
npm run typecheck
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

Next: [2.5 Sequences and records](./05-sequences-and-records.md)
