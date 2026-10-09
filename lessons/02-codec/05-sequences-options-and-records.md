# Sequences, options and records

Three ways to build bigger values out of smaller ones, and with them you can encode
most of JAM.

## What the Gray Paper says

From Appendix C:

- **Sequences** encode as their items one after another. A sequence whose length
  varies gets its length in front, the ↕ of the last lesson: ↕[a, b, c] is ℰ(3) ⌢ ℰ(a)
  ⌢ ℰ(b) ⌢ ℰ(c). A sequence whose length is fixed by the protocol, such as one entry per
  validator, has no length in front.
- **Optional values**, a value or nothing (∅), use the discriminator ¿x: the byte 0 for
  nothing, or the byte 1 followed by the value.
- **Tuples** encode as their elements' encodings one after another, in the order the
  Gray Paper lists them.

In code, a tuple with named elements is a **record**: an object whose fields are encoded
in a fixed order.

## Sequences

**Add to** `src/codec/codec.ts`

```ts
/** ↕[...]: a sequence of any length, its length first. */
export function seq<T>(item: Codec<T>): Codec<T[]> {
  return {
    encode: (w, items) => {
      w.natural(BigInt(items.length));
      for (const x of items) item.encode(w, x);
    },
    decode: (r) => Array.from({ length: Number(r.natural()) }, () => item.decode(r)),
    fromJson: (json) => {
      if (!Array.isArray(json)) return jsonError(json, "an array");
      return json.map((j) => item.fromJson(j));
    },
  };
}

/** [...]_n: exactly n items, with no length in front. */
export function seqN<T>(item: Codec<T>, n: number): Codec<T[]> {
  return {
    encode: (w, items) => {
      if (items.length !== n) throw new RangeError(`expected ${n} items, got ${items.length}`);
      for (const x of items) item.encode(w, x);
    },
    decode: (r) => Array.from({ length: n }, () => item.decode(r)),
    fromJson: (json) => {
      if (!Array.isArray(json) || json.length !== n) return jsonError(json, `an array of ${n}`);
      return json.map((j) => item.fromJson(j));
    },
  };
}
```

`Array.from({ length: n }, f)` calls `f` n times and collects the results, in order,
which is the order the items sit in the bytes.

## Options

**Add to** `src/codec/codec.ts`

```ts
/** ¿x: 0 for nothing (null), or 1 and the value. */
export function option<T>(item: Codec<T>): Codec<T | null> {
  return {
    encode: (w, x) => {
      if (x === null) {
        w.natural(0n);
      } else {
        w.natural(1n);
        item.encode(w, x);
      }
    },
    decode: (r) => (r.natural() === 0n ? null : item.decode(r)),
    fromJson: (json) => (json === null ? null : item.fromJson(json)),
  };
}
```

The Gray Paper's ∅ is `null` here, as it is in the vectors' JSON.

## Records

**Add to** `src/codec/codec.ts`

```ts
// Codec<any>: a record's fields hold codecs of different types.
type Fields = Record<string, Codec<any>>;

/** A tuple with named fields, encoded field after field in the order they are written. */
export function record<F extends Fields>(fields: F): Codec<{ [K in keyof F]: Value<F[K]> }> {
  type T = { [K in keyof F]: Value<F[K]> };
  const names = Object.keys(fields) as (keyof F & string)[];
  return {
    encode: (w, value) => {
      for (const name of names) fields[name].encode(w, value[name]);
    },
    decode: (r) => {
      const value: Partial<T> = {};
      for (const name of names) value[name] = fields[name].decode(r);
      return value as T;
    },
    fromJson: (json) => {
      if (typeof json !== "object" || json === null || Array.isArray(json)) {
        return jsonError(json, "an object");
      }
      const extra = Object.keys(json).filter((k) => !(k in fields));
      if (extra.length > 0) {
        jsonError(json, `no fields besides ${names.join(", ")}, not ${extra.join(", ")}`);
      }
      const value: Partial<T> = {};
      for (const name of names) {
        if (!(name in json)) jsonError(json, `a field ${name}`);
        value[name] = fields[name].fromJson((json as Record<string, unknown>)[name]);
      }
      return value as T;
    },
  };
}
```

The type does the clever part. `record({ slot: u32, gas: u64 })` is a
`Codec<{ slot: number; gas: bigint }>`: the mapped type `{ [K in keyof F]: Value<F[K]> }`
goes through each field name K and asks `Value` what its codec holds. You write the field
list once, and the TypeScript type of the structure follows from it.

The field order is the order you write the fields in. JavaScript keeps an object's
string keys in the order they were added, so `Object.keys(fields)` gives them back as
written.

`fromJson` is strict on purpose: a missing field, or one it doesn't know, is an error.
If a vector has a field your record lacks, you want to hear about it, not have it
dropped.

## Tests

**Add to** `test/codec.test.ts`

```ts
import { option, record, seq, seqN } from "../src/codec/codec.ts";
import type { Value } from "../src/codec/codec.ts";

test("a sequence has its length in front, unless its length is fixed", () => {
  assert.equal(toHex(encode(seq(u16), [1, 2, 3])), "0x03010002000300");
  assert.deepEqual(decode(seq(u16), fromHex("0x03010002000300")), [1, 2, 3]);
  assert.equal(toHex(encode(seqN(u16, 3), [1, 2, 3])), "0x010002000300");
  assert.throws(() => encode(seqN(u16, 3), [1, 2]), RangeError);
  assert.deepEqual(decode(seq(u8), fromHex("0x00")), []);
});

test("an option is 0, or 1 and the value", () => {
  assert.equal(toHex(encode(option(u32), null)), "0x00");
  assert.equal(toHex(encode(option(u32), 7)), "0x0107000000");
  assert.equal(decode(option(u32), fromHex("0x0107000000")), 7);
});

const Pair = record({ slot: u32, gas: u64 });
type Pair = Value<typeof Pair>;

test("a record encodes its fields in the order written", () => {
  const p: Pair = { slot: 1, gas: 2n };
  assert.equal(toHex(encode(Pair, p)), "0x010000000200000000000000");
  assert.deepEqual(decode(Pair, encode(Pair, p)), p);
  assert.deepEqual(Pair.fromJson({ slot: 1, gas: 2 }), p);
  assert.throws(() => Pair.fromJson({ slot: 1 }), /a field gas/);
  assert.throws(() => Pair.fromJson({ slot: 1, gas: 2, extra: 3 }), /not extra/);
});
```

`const Pair` and `type Pair` share a name, and TypeScript allows it: one is a value,
the other a type, and each use makes clear which is meant. This is the pattern for every
JAM structure from here on: a codec, and the type taken from it.

**Run**

```sh
npm test
# prints: fail 0
# prints: reported
npm run typecheck
```

<details>
<summary>lasair: records in OCaml (comments trimmed)</summary>

An OCaml record type looks a lot like a TypeScript object type, from
`lib/serialization.ml`:

```ocaml
type refinement_context = {
  anchor: bytes;
  anchor_slot: int;
  state_root: bytes;
  beefy_root: bytes;
  lookup_anchor: bytes;
  lookup_anchor_slot: int;
  lookup_anchor_state_root: bytes;
  prerequisites: bytes list;
}
```

That is the structure you will encode in the next lesson. lasair writes the type, then
writes the field order a second time in `encode_refinement_context`, and a third time in
`decode_refinement_context`.

</details>

Next: [2.6 The first test vectors](./06-the-first-test-vectors.md)
