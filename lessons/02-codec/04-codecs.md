# Codecs

## The idea

Every kind of JAM value needs three things:

1. its encoding, ℰ, from the Gray Paper;
2. its decoding, the inverse;
3. a way to read it from the test vectors' JSON, so tests can compare.

Write these three separately for every structure and they drift apart: a field added
to the encoder but not the decoder, a field read in the wrong order. Instead, each kind
of value gets one object holding all three, a `Codec<T>`. Small codecs (a u32, a hash)
combine into codecs for whole structures, so the field order is written once and every
direction follows it.

## The interface

**New file** `src/codec/codec.ts`

```ts
// Codec<T>: one kind of value, how it is encoded (GP Appendix C), how it is decoded,
// and how the test vectors write it in JSON.

import type { Bytes } from "../bytes.ts";
import { DecodeError } from "./numbers.ts";
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

/** The value these bytes encode. Every byte must be used. */
export function decode<T>(codec: Codec<T>, bytes: Bytes): T {
  const r = new Reader(bytes);
  const value = codec.decode(r);
  r.finish();
  return value;
}

/** Stop reading JSON that has the wrong shape. */
export function jsonError(json: unknown, expected: string): never {
  const seen = JSON.stringify(json, (_k, v: unknown) => (typeof v === "bigint" ? `${v}n` : v));
  throw new TypeError(`expected ${expected} in the JSON, got ${seen?.slice(0, 60)}`);
}
```

`Value<C>` uses `infer`: "if C is a `Codec` of some T, give me that T". It lets the
types of whole structures come out of their codecs, as the next lesson shows.
`jsonError` returns `never`, TypeScript's type for "this never returns": it always
throws, so code after it is known not to run.

## Integers

**Add to** `src/codec/codec.ts`

```ts
/** ℰ_l for l = 1, 2 or 4: a natural below 2^(8l), as a JS number. */
function fixedNumber(l: number): Codec<number> {
  const limit = 2 ** (8 * l);
  return {
    encode: (w, x) => w.fixed(BigInt(x), l),
    decode: (r) => Number(r.fixed(l)),
    fromJson: (json) => {
      if (typeof json !== "number" || !Number.isInteger(json) || json < 0 || json >= limit) {
        return jsonError(json, `a u${8 * l}`);
      }
      return json;
    },
  };
}

/** ℰ₁: a u8. */
export const u8 = fixedNumber(1);

/** ℰ₂: a u16. */
export const u16 = fixedNumber(2);

/** ℰ₄: a u32: timeslots, service ids. */
export const u32 = fixedNumber(4);

/** A u64 from JSON: a number, or a bigint when it was too big for one (lesson 1.2). */
function bigintFromJson(json: unknown, bits: number): bigint {
  const x = typeof json === "number" && Number.isSafeInteger(json) ? BigInt(json) : json;
  if (typeof x !== "bigint" || x < 0n || x >= 1n << BigInt(bits)) {
    return jsonError(json, `a u${bits}`);
  }
  return x;
}

/** ℰ₈: a u64: gas, balances. */
export const u64: Codec<bigint> = {
  encode: (w, x) => w.fixed(x, 8),
  decode: (r) => r.fixed(8),
  fromJson: (json) => bigintFromJson(json, 64),
};

/** ℰ, compact: a natural below 2^64. */
export const natural: Codec<bigint> = {
  encode: (w, x) => w.natural(x),
  decode: (r) => r.natural(),
  fromJson: (json) => bigintFromJson(json, 64),
};

/** ℰ, compact, for a natural below 2^32, as a JS number: lengths and small counts. */
export const natural32: Codec<number> = {
  encode: (w, x) => w.natural(BigInt(x)),
  decode: (r) => {
    const x = r.natural();
    if (x >= 1n << 32n) throw new DecodeError(`${x} is not below 2^32`);
    return Number(x);
  },
  fromJson: (json) => Number(bigintFromJson(json, 32)),
};
```

`fixedNumber` is not exported: it is a recipe the file uses three times, and the three
results are what other files need. There are two compact codecs because the same
encoding holds two kinds of value: amounts that can reach 2^64 (`bigint`) and counts
that never come close (`number`).

## Bytes

**Add to** `src/codec/codec.ts`

```ts
import { fromHex } from "../bytes.ts";

/** Bytes from JSON: a "0x" hex string. */
function bytesFromJson(json: unknown): Bytes {
  return typeof json === "string" ? fromHex(json) : jsonError(json, "a 0x hex string");
}

/** 𝔹_n: exactly n bytes, encoded as themselves. */
export function fixedBytes(n: number): Codec<Bytes> {
  return {
    encode: (w, b) => {
      if (b.length !== n) throw new RangeError(`expected ${n} bytes, got ${b.length}`);
      w.bytes(b);
    },
    decode: (r) => r.bytes(n),
    fromJson: (json) => {
      const b = bytesFromJson(json);
      return b.length === n ? b : jsonError(json, `${n} bytes`);
    },
  };
}

/** ℍ: a 32-byte hash. */
export const hash = fixedBytes(32);

/** A length prefix, read back. It can't exceed the bytes left: each item takes at least one. */
function lengthOf(r: Reader): number {
  const n = r.natural();
  if (n > BigInt(r.remaining)) {
    throw new DecodeError(`a length of ${n} with only ${r.remaining} bytes left`);
  }
  return Number(n);
}

/** ↕x: a blob of any length, its length first. */
export const blob: Codec<Bytes> = {
  encode: (w, b) => {
    w.natural(BigInt(b.length));
    w.bytes(b);
  },
  decode: (r) => r.bytes(lengthOf(r)),
  fromJson: bytesFromJson,
};
```

The Gray Paper writes ↕x for "x with its length in front" (Appendix C, *Discriminator
Encoding*). A hash needs no length because everyone knows it is 32 bytes. A blob of any
size does.

`lengthOf` checks the length against what is left before trusting it. Without that
check, garbage input claiming a list of 2^60 items would make the decoder try, and a
client fed blocks by an adversary (the fuzzer, or the network) can't afford that.

## Tests

**New file** `test/codec.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromHex, toHex } from "../src/bytes.ts";
import { blob, decode, encode, hash, natural, natural32, u16, u32, u64, u8 } from "../src/codec/codec.ts";
import { DecodeError } from "../src/codec/numbers.ts";

test("integers encode as ℰ_l and ℰ", () => {
  assert.equal(toHex(encode(u8, 7)), "0x07");
  assert.equal(toHex(encode(u16, 4807)), "0xc712");
  assert.equal(toHex(encode(u32, 16909060)), "0x04030201");
  assert.equal(toHex(encode(u64, 42n)), "0x2a00000000000000");
  assert.equal(toHex(encode(natural, 128n)), "0x8080");
  assert.equal(decode(natural32, fromHex("0xc00040")), 16384);
  assert.throws(() => decode(natural32, encode(natural, 2n ** 32n)), DecodeError);
});

test("integers from JSON are checked against their width", () => {
  assert.equal(u32.fromJson(16909060), 16909060);
  assert.throws(() => u8.fromJson(256), TypeError);
  assert.throws(() => u16.fromJson(1.5), TypeError);
  assert.throws(() => u32.fromJson("7"), TypeError);
  assert.equal(u64.fromJson(42), 42n);
  assert.equal(u64.fromJson(2n ** 64n - 1n), 2n ** 64n - 1n);
});

test("a hash is 32 bytes as they are; a blob has its length in front", () => {
  const h = new Uint8Array(32).fill(0xab);
  assert.deepEqual(encode(hash, h), h);
  assert.throws(() => encode(hash, new Uint8Array(31)), RangeError);
  assert.equal(toHex(encode(blob, fromHex("0x0102030405"))), "0x050102030405");
  assert.deepEqual(decode(blob, fromHex("0x050102030405")), fromHex("0x0102030405"));
  assert.throws(() => decode(blob, fromHex("0x0601020304")), DecodeError);
  assert.throws(() => decode(u32, fromHex("0x0403020100")), /left over/);
});
```

**Run**

```sh
npm test
# prints: fail 0
# prints: reported
npm run typecheck
```

This time the tests come after the code. Most of what they check, the earlier lessons
already tested underneath, so these mostly check the joins: the right width for each
codec, the length in front of a blob, the leftover byte caught by `decode`.

<details>
<summary>lasair: separate encoders and decoders</summary>

lasair writes an encoder and a decoder for each structure, as two functions, for
example `encode_refinement_context` and `decode_refinement_context` in
`lib/serialization.ml`. It works, and its tests keep the pairs in step. Codecs make
the pairing structural instead: there is one field list per structure, so encoder and
decoder can't disagree about the order.

</details>

Next: [2.5 Sequences, options and records](./05-sequences-options-and-records.md)
