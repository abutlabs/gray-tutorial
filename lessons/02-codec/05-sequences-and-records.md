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

A record with a slot of 42 (a u32) and a gas amount of 7 (a u64) encodes as 12 bytes:

```text
2a 00 00 00               slot: 42 as a u32, exactly 4 bytes
07 00 00 00 00 00 00 00   gas:  7 as a u64, exactly 8 bytes
```

Each field takes its type's width, whatever its value: a u32 is 32 bits, 4 bytes, and a
u64 is 64 bits, 8 bytes. 42 is `2a`, written smallest byte first and filled out with
zeros to its 4 bytes, as in [lesson 2.1](./01-fixed-width-integers.md); 7 is `07` and seven zeros, though it would fit in
one. 4 + 8 = 12. The type decides the size, not the number, so a decoder knows a slot
ends after 4 bytes without being told.

And that's all a record is: each field's bytes, joined end to end into one byte array, in
the fields' order. The Gray Paper writes the joining as [⌢](../symbols.md#concat) and a byte array as [𝔹](../symbols.md#blobs):
ℰ₄(42) ⌢ ℰ₈(7) is 4 bytes then 8 bytes, one array of 12, in 𝔹₁₂. Nothing else goes in.
No names, no length: both sides already know the fields and their order, so the bytes
don't repeat it.

Which means the order is everything. Swap the two fields and decode the same twelve
bytes: gas takes the first eight, slot the last four, and nothing complains.

<RecordSwap />

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

Three loops over the same field names, one per direction. That's the point: the order is
written once, in `fields`, and encode, decode and JSON all follow it. (JavaScript keeps an
object's keys in the order they were added, so `Object.keys` hands them back as you wrote
them.)

The type is the clever bit. `record({ slot: u32, gas: u64 })` is a
`Codec<{ slot: number; gas: bigint }>`: `{ [K in keyof F]: Value<F[K]> }` walks through
each field name K and asks `Value` ([lesson 2.4](./04-codecs.md)) what its codec holds. You write the
field list, TypeScript writes the type.

## Tests

**Add to** `test/codec.test.ts`

```ts
import { record, seq } from "../src/codec/codec.ts";
import type { Value } from "../src/codec/codec.ts";
import type { Bytes } from "../src/bytes.ts";

test("a sequence has its length in front", () => {
  const seqHex: string = toHex(encode(seq(u16), [1, 2, 3]));
  assert.equal(seqHex, "0x03010002000300");
  const seqDecoded: number[] = decode(seq(u16), fromHex("0x03010002000300"));
  assert.deepEqual(seqDecoded, [1, 2, 3]);
});

const Pair = record({ slot: u32, gas: u64 });
type Pair = Value<typeof Pair>;

test("a record encodes its fields in the order written", () => {
  const p: Pair = { slot: 1, gas: 2n };
  const encoded: Bytes = encode(Pair, p);
  const pairHex: string = toHex(encoded);
  assert.equal(pairHex, "0x010000000200000000000000");
  const decoded: Pair = decode(Pair, encoded);
  assert.deepEqual(decoded, p);
  const fromJson: Pair = Pair.fromJson({ slot: 1, gas: 2 });
  assert.deepEqual(fromJson, p);
});
```

Both, byte by byte:

```text
03                        the sequence's length, 3 (a compact natural)
01 00  02 00  03 00       1, 2 and 3, each a u16: 2 bytes each
                          1 + 3 × 2 = 7 bytes

01 00 00 00               slot 1 as a u32: 4 bytes
02 00 00 00 00 00 00 00   gas 2 as a u64: 8 bytes
                          4 + 8 = 12 bytes, as with slot 42 above
```

Nothing up the sleeve.

`const Pair` and `type Pair` share a name, and TypeScript is fine with it: one is a
value, the other a type, and each use makes clear which is meant. Every JAM structure
from here on follows this pattern: a codec, and the type that falls out of it.

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
reported 17 tests to Grafana: http://127.0.0.1:3300/d/the-gray-tutor?var-client=you&var-run_id=test-1791726651502
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

## Check your understanding

::: check
**Why is a record of slot 42 (a u32) and gas 7 (a u64) 12 bytes?**

- [ ] 2 bytes would do: 42 and 7 each fit in one byte, and the rest is wasted
  > No: in a record each field keeps its type's width. 42 as a u32 is `2a 00 00 00`,
  > and 7 as a u64 is `07` and seven zeros.
- [x] 4 bytes for the u32 and 8 for the u64, end to end, and nothing else
  > Yes: a record is its fields' bytes in the fields' order. No names, no length: both
  > sides already know the fields. 4 + 8 = 12.
- [ ] The bytes also carry the field names, so a decoder knows which is which
  > No: there's no room for them. All 12 bytes are the two values: `2a 00 00 00` and
  > `07 00 00 00 00 00 00 00`.

**`seq(u16)` writes the list 1, 2, 3 as `03 01 00 02 00 03 00`. What does the `03` count?**

- [ ] The bytes that follow
  > No: six bytes follow, not three. The length counts items.
- [ ] The last item, 3
  > No: it's the first byte, a compact natural for the length. The item 3 is the last two
  > bytes, `03 00`.
- [x] The items: three of them, so the decoder reads three u16s
  > Yes: the decoder reads `03`, then a u16 three times, 2 bytes each. 1 + 3 × 2 = 7
  > bytes in all.

**Decode slot 42 and gas 7's 12 bytes with the fields swapped, `record({ gas: u64, slot: u32 })`. What happens?**

- [x] No error, just wrong values: gas takes the first 8 bytes, slot the last 4
  > Yes: gas reads `2a 00 00 00 07 00 00 00`, 30,064,771,114, and slot reads four zeros,
  > 0. Nothing in the bytes says which field is which; only the order does.
- [ ] The decoder spots the swap and puts the values back in the right fields
  > No: there are no names in the bytes to spot. The decoder reads the fields in the order
  > its codec lists them.
- [ ] It decodes fine: the same two fields are there, whatever the order
  > No: the order is the only thing that says which bytes belong to which field. Swap it
  > and both fields read the wrong bytes.

**A list carries its length in front. Why doesn't a record?**

- [ ] A record is always short, so its length is easy to guess
  > No: the decoder never guesses. And size isn't the point: a record can hold a blob of
  > any size.
- [x] A record always has the same fields, in the same order, so both sides know what comes next
  > Yes: the codec lists the fields once, and every record of that kind has exactly those.
  > A list's number of items changes, so the bytes have to say it.
- [ ] A record does have one, inside the first field
  > No: the first byte of slot 42 and gas 7 is `2a`, slot's own lowest byte. All 12 bytes
  > are the values.
:::

## What you have

Sequences and records: lists of any codec, and structures of named fields whose type
TypeScript works out for you. That's nearly every shape a JAM structure takes ([lesson
4.5](../04-blocks/05-maybe-and-exactly-n.md) adds the last two). Time to find out
whether yours agree with everyone else's: [lesson 2.6](./06-the-first-test-vectors.md)
puts them to the official test vectors.

Next: [2.6 The first test vectors](./06-the-first-test-vectors.md)
