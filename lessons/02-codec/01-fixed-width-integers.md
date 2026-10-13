# Fixed-width integers

Time to turn numbers into bytes. JAM, like most of computing, writes them a little
backwards: the small end first.

This is a different job from [lesson 1.1](../01-bytes-and-numbers/01-bytes-and-hex.md)'s.
Hex only writes bytes you already have as text. Here you start with a number and work
out its bytes. Hex still appears, but only to show the bytes you made:

```text
4,807  ──encode (this lesson)──▶  bytes 199, 18  ──toHex (lesson 1.1)──▶  "0xc712"
```

## New words

- **Encode, decode.** Encoding turns a value into bytes; decoding turns the bytes back
  into the value. *Example:* 4,807 encodes as the two bytes `c7 12`.
- **Little-endian.** Least significant byte first: the small end of the number leads.
  *Example:* 4,807 is `0x12c7`, and it's written `c7 12`.
- **Fixed-width integer.** A number always written in the same number of bytes, however
  small it is. *Example:* a u32 is always four bytes, so 1 is `01 00 00 00`.

All three are in the [glossary](../glossary.md).

## Small end first

One byte only reaches 255, so a bigger number spreads over several, like digits: each
byte counts 256 times the one after it. Take any number too big for one byte, say 4,807:
4,807 = 18 × 256 + 199. 18 is `0x12` and 199 is
`0xc7`, so 4,807 is `0x12c7`: the bytes `12` and `c7`. JAM writes them the other way
round, `c7 12`: the low byte first. Like writing a date as day-month-year.

And the width never changes. A timeslot is a u32, so it takes four bytes in every block
header, even when it's 1: `01 00 00 00`.

## What the Gray Paper says

Appendix C, *Fixed-length Integer Encoding*, defines it one byte at a time:

```text
ℰ_l(x) = []                          if l = 0
ℰ_l(x) = [x mod 256] ⌢ ℰ_{l−1}(⌊x / 256⌋)   otherwise
```

Read it like a recipe (⌢ means "followed by"): write down the lowest byte, chop it off,
repeat with one byte fewer. The subscript l is the width: ℰ₄ is a u32, ℰ₈ a u64.

## The code

One function for every width, working on `bigint` so that ℰ₈ is exact ([lesson 1.2](../01-bytes-and-numbers/02-numbers.md)'s
rule). [Lesson 2.4](./04-codecs.md) converts to `number` for the smaller widths.

**New file** `test/numbers.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromHex } from "../src/bytes.ts";
import { decodeFixed, encodeFixed } from "../src/codec/numbers.ts";
import type { Bytes } from "../src/bytes.ts";

test("ℰ_l writes the least significant byte first", () => {
  const twoBytes: Bytes = encodeFixed(4807n, 2);
  assert.deepEqual(twoBytes, fromHex("0xc712"));
  const fourBytes: Bytes = encodeFixed(1n, 4);
  assert.deepEqual(fourBytes, fromHex("0x01000000"));
});

test("decoding reads the bytes back", () => {
  const decoded: bigint = decodeFixed(fromHex("0xc712"));
  assert.equal(decoded, 4807n);
  const big: bigint = 2n ** 64n - 70n;
  const encoded: Bytes = encodeFixed(big, 8);
  const back: bigint = decodeFixed(encoded);
  assert.equal(back, big);
});
```

A stub to make the tests run, wrong on purpose: every number comes out as zeros.

**New file** `src/codec/numbers.ts`

```ts
// The Gray Paper's integer encodings (Appendix C).

import type { Bytes } from "../bytes.ts";

/** ℰ_l(x): x in exactly l bytes, least significant first. */
export function encodeFixed(x: bigint, l: number): Bytes {
  return new Uint8Array(l);
}

/** The inverse of ℰ_l: the bytes as an unsigned little-endian integer. */
export function decodeFixed(bytes: Bytes): bigint {
  return 0n;
}
```

**Run, expect it to fail**

```sh
npm test
```

```text
...
ℹ tests 9
ℹ suites 0
ℹ pass 7
ℹ fail 2
...
test at test/numbers.test.ts:7:1
✖ ℰ_l writes the least significant byte first (1.2ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    Uint8Array(2) [
  +   0,
  +   0
  -   199,
  -   18
    ]

      at TestContext.<anonymous> (…/client/test/numbers.test.ts:9:10)
...
```

Comparing two byte arrays, `assert.deepEqual` shows a diff: lines with `+` are what your
code gave (*actual*), lines with `-` what the test expected. Your stub wrote 0 and 0; the
test wanted 199 and 18, which are `c7` and `12`: 4807, least significant byte first.

**Replace in** `src/codec/numbers.ts`

```ts
/** ℰ_l(x): x in exactly l bytes, least significant first. */
export function encodeFixed(x: bigint, l: number): Bytes {
  const bytes = new Uint8Array(l);
  let rest = x;
  for (let i = 0; i < l; i++) {
    bytes[i] = Number(rest & 0xffn); // x mod 256
    rest >>= 8n; // ⌊x / 256⌋
  }
  return bytes;
}

/** The inverse of ℰ_l: the bytes as an unsigned little-endian integer. */
export function decodeFixed(bytes: Bytes): bigint {
  let x = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) x = (x << 8n) | BigInt(bytes[i]);
  return x;
}
```

The Gray Paper's recursion, unrolled into a loop: `rest & 0xffn` is `x mod 256` (the low
byte), and `rest >>= 8n` is `⌊x / 256⌋` (chop it off). Decoding runs the other way: start
at the last, most significant byte and shift each one in.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ ℰ_l writes the least significant byte first (2.9ms)
✔ decoding reads the bytes back (0.8ms)
...
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
...
reported 9 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791726348334
...
```

Your client can now write numbers the way JAM does. Nine tests and counting.

<details>
<summary>lasair: <code>encode_fixed_int</code></summary>

```ocaml
(** Encode unsigned integer as l bytes, little-endian *)
let encode_fixed_int (n : int) (value : int64) : bytes =
  let result = Bytes.create n in
  let rec fill i v =
    if i < n then begin
      Bytes.set result i (Char.chr (Int64.to_int (Int64.logand v 0xFFL)));
      fill (i + 1) (Int64.shift_right_logical v 8)
    end
  in
  fill 0 value;
  result
```

The same algorithm. `let rec fill` is a recursive helper instead of a loop (OCaml
prefers recursion), `Int64.logand v 0xFFL` is `v & 0xff`, and `shift_right_logical`
is `>>>` on a `number`, the shift that treats the value as unsigned. (A `bigint` has no
`>>>`; your values are never negative, so `>>` does the same job.)

</details>

## What you have

ℰ_l both ways: any whole number in exactly l bytes, least significant first, and back,
exact up to 64 bits. A fixed width spends all l bytes even on a tiny number, though.
[Lesson 2.2](./02-compact-naturals.md) adds JAM's other way to write a number: one byte
when it's small, more only when it must.

Next: [2.2 Compact naturals](./02-compact-naturals.md)
