# Sequences and records

Two ways to build big values out of small ones: lists, and structures with named fields.
With these two, [the next lesson](./06-the-first-test-vectors.md) encodes a real JAM structure and checks it against the
official vectors.

## New words

- **Sequence.** A list of values of one kind, encoded one after another, with its length
  in front when the length can vary. *Example:* the bytes 1, 2, 3 as a list: `03 01 02 03`.
- **Record.** A value with named fields, always encoded in the same field order. The Gray
  Paper calls it a *tuple*. *Example:* a slot (u32) and a gas amount (u64), side by side.
- **Codec factory.** A function that takes codecs and builds a new one from them.
  *Example:* `seq(u8)`, a codec for lists of bytes.
- **Mapped type.** A TypeScript type built by going through another type's field names
  one by one. *Example:* `{ [K in keyof F]: Value<F[K]> }`, below.

All four are in the [glossary](../glossary.md).

## Lists and structures

The list 1, 2, 3, each a single byte, encodes as `03 01 02 03`: its length (a compact
natural from [lesson 2.2](./02-compact-naturals.md)) and then each item. The length tells a decoder where the list
ends.

A record with a slot of 42 (u32) and a gas amount of 7 (u64) encodes as
`2a 00 00 00 07 00 00 00 00 00 00 00`: the fields in order, and nothing else. No names, no
length: both sides already know the fields and their order, so the bytes don't repeat it.

## What the Gray Paper says

From Appendix C:

- *Sequences* encode as their items, one after another. A sequence whose length can
  vary gets its length in front, the ↕ from last lesson: ↕[a, b, c] is ℰ(3) ⌢ ℰ(a) ⌢ ℰ(b)
  ⌢ ℰ(c).
- *Tuples* encode as their elements' encodings, one after another, in the order the
  Gray Paper lists them.

In code, a tuple with named elements is a *record*: an object whose fields are always
encoded in the same order.

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
    fromJson: (json) => (json as unknown[]).map((j) => item.fromJson(j)),
  };
}
```

`seq` is a codec *factory*: give it the codec for one item, get back a codec for a list
of them. `Array.from({ length: n }, f)` calls `f` n times and collects the results, in
order, which is exactly the order the items sit in the bytes.

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
      const object = json as Record<string, unknown>;
      const value: Partial<T> = {};
      for (const name of names) value[name] = fields[name].fromJson(object[name]);
      return value as T;
    },
  };
}
```

Three loops over the same field names, one per direction. That's the whole point: the
order is written once, in `fields`, and encode, decode and JSON all follow it. (JavaScript
keeps an object's keys in the order they were added, so `Object.keys` hands them back
exactly as you wrote them.)

The type is the clever bit. `record({ slot: u32, gas: u64 })` is a
`Codec<{ slot: number; gas: bigint }>`: `{ [K in keyof F]: Value<F[K]> }` walks through
each field name K and asks `Value` ([lesson 2.4](./04-codecs.md)) what its codec holds. You write the
field list, TypeScript writes the type.

## Tests

**Add to** `test/codec.test.ts`

```ts
import { record, seq } from "../src/codec/codec.ts";
import type { Value } from "../src/codec/codec.ts";

test("a sequence has its length in front", () => {
  assert.equal(toHex(encode(seq(u16), [1, 2, 3])), "0x03010002000300");
  assert.deepEqual(decode(seq(u16), fromHex("0x03010002000300")), [1, 2, 3]);
});

const Pair = record({ slot: u32, gas: u64 });
type Pair = Value<typeof Pair>;

test("a record encodes its fields in the order written", () => {
  const p: Pair = { slot: 1, gas: 2n };
  assert.equal(toHex(encode(Pair, p)), "0x010000000200000000000000");
  assert.deepEqual(decode(Pair, encode(Pair, p)), p);
  assert.deepEqual(Pair.fromJson({ slot: 1, gas: 2 }), p);
});
```

`0x03` then three u16s: `0100`, `0200`, `0300`. And the pair: slot 1 in four bytes, gas 2
in eight. Nothing up the sleeve.

`const Pair` and `type Pair` share a name, and TypeScript is fine with it: one is a
value, the other a type, and each use makes clear which is meant. This is the pattern for
every JAM structure from here on: a codec, and the type that falls out of it.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ a sequence has its length in front (0.2ms)
✔ a record encodes its fields in the order written (0.2ms)
...
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
...
reported 17 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791726651502
...
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

That's the structure you'll encode in [the next lesson](./06-the-first-test-vectors.md). lasair writes the type, then
writes the field order a second time in `encode_refinement_context`, and a third time in
`decode_refinement_context`.

</details>

## What you have

Sequences and records: lists of any codec, and structures of named fields whose type
TypeScript works out for you. That's every shape a JAM structure takes. Time to find out
whether yours agree with everyone else's: [lesson 2.6](./06-the-first-test-vectors.md)
puts them to the official test vectors.

Next: [2.6 The first test vectors](./06-the-first-test-vectors.md)
