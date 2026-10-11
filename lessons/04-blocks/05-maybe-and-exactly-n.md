# Maybe, and exactly n

Next up is the block header, and it has two quirks your codec can't handle yet:

- some of its parts are only there *sometimes*. At the start of an epoch, the header
  announces the next validator set; most headers announce nothing.
- one of its lists has a length *everyone already knows*. When the ticket lottery
  closes, the header lists one winning ticket per slot of the next epoch: exactly 12 on
  tiny, 600 on full. Writing the length in front would be redundant, so JAM doesn't.

Two small codecs, and your toolbox is complete for the whole block.

## New words

- **Option (discriminator).** A value that may be missing, with a byte in front saying
  whether it's there. *Example:* `00` for nothing; `01` and then the value.
- **Fixed-length sequence.** A list whose length everyone already knows, so none is
  written. *Example:* the tickets mark, exactly 12 tickets on tiny.

Both are in the [glossary](../glossary.md).

## What the Gray Paper says

Appendix C, *Discriminator Encoding*: a value that might be missing (∅) is written with a
**discriminator** in front, ¿x: the byte 0 for "nothing", or the byte 1 followed by the
value.

And a sequence whose length is fixed by the protocol (the Gray Paper writes ⟦T⟧ₙ for "n
things of type T") is just its items, one after another, no length in front.

## The tests

**Add to** `test/codec.test.ts`

```ts
import { option, seqN } from "../src/codec/codec.ts";

test("an option is 0, or 1 and the value", () => {
  const noneHex: string = toHex(encode(option(u32), null));
  assert.equal(noneHex, "0x00");
  const someHex: string = toHex(encode(option(u32), 7));
  assert.equal(someHex, "0x0107000000");
  const none: number | null = decode(option(u32), fromHex("0x00"));
  assert.equal(none, null);
  const some: number | null = decode(option(u32), fromHex("0x0107000000"));
  assert.equal(some, 7);
});

test("a fixed-length sequence has no length in front", () => {
  const fixedHex: string = toHex(encode(seqN(u16, 3), [1, 2, 3]));
  assert.equal(fixedHex, "0x010002000300");
  const fixedDecoded: number[] = decode(seqN(u16, 3), fromHex("0x010002000300"));
  assert.deepEqual(fixedDecoded, [1, 2, 3]);
});
```

Compare `seqN(u16, 3)` with [lesson 2.5](../02-codec/05-sequences-and-records.md)'s `seq(u16)`: the same three numbers, minus the
`0x03` in front.

**Run, expect it to fail**

```sh
npm test
```

```text
...
SyntaxError: The requested module '../src/codec/codec.ts' does not provide an export named 'option'
...
✖ test/codec.test.ts (151.3ms)
...
ℹ tests 38
ℹ suites 0
ℹ pass 37
ℹ fail 1
...
```

Red: the codec doesn't have `option` yet, nor its partner for exactly n.

## The code

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
    decode: (r) => (r.field("present", () => r.natural()) === 0n ? null : item.decode(r)),
    fromJson: (json) => (json === null ? null : item.fromJson(json)),
  };
}

/** [...]_n: exactly n items, with no length in front: everyone knows n already. */
export function seqN<T>(item: Codec<T>, n: number): Codec<T[]> {
  return {
    encode: (w, items) => {
      for (const x of items) item.encode(w, x);
    },
    decode: (r) => Array.from({ length: n }, (_, i) => r.field(String(i), () => item.decode(r))),
    fromJson: (json) => (json as unknown[]).map((j) => item.fromJson(j)),
  };
}
```

"Nothing" is `null` in your client, just as it is in the vectors' JSON. Both codecs name
what they read for the decode trace ([lesson 2.7](../02-codec/07-watch-a-decode.md)): an option's tag shows up as `present`,
and a fixed sequence's items as `0`, `1`, `2`, just like `seq`'s, minus the `length`.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ an option is 0, or 1 and the value (0.1ms)
✔ a fixed-length sequence has no length in front (0.1ms)
...
ℹ tests 44
ℹ suites 0
ℹ pass 44
ℹ fail 0
...
reported 44 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791728308105
...
```

<details>
<summary>lasair: <code>encode_maybe</code>, in <code>lib/serialization.ml</code></summary>

```ocaml
(** Encode optional value *)
let encode_maybe (encode_inner : 'a -> bytes) (opt : 'a option) : bytes =
  match opt with
  | None -> Bytes.make 1 '\x00'
  | Some v ->
    let inner = encode_inner v in
    let result = Bytes.create (1 + Bytes.length inner) in
    Bytes.set result 0 '\x01';
    Bytes.blit inner 0 result 1 (Bytes.length inner);
    result
```

OCaml's `option` is the same idea built into the language: `None`, or `Some v`. lasair
copies bytes around by hand (`Bytes.blit`); your Writer just writes the tag, then the
value.

</details>

## What you have

Every kind of codec a JAM block needs: integers, bytes, sequences, records, either-or,
maybe, and exactly n. [Lesson 4.6](./06-the-header.md) puts the last two to work in a
block's header.

Next: [4.6 The header](./06-the-header.md)
