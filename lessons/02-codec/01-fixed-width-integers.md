# Fixed-width integers

Time to turn numbers into bytes. JAM, like most of computing, writes them a little
backwards: the small end first.

## New words

- **Encode, decode.** Encoding turns a value into bytes; decoding turns the bytes back
  into the value. *Example:* 4,807 encodes as the two bytes `c7 12`.
- **Little-endian.** Least significant byte first: the small end of the number leads.
  *Example:* 4,807 is `0x12c7`, and it's written `c7 12`.
- **Fixed-width integer.** A number always written in the same number of bytes, however
  small it is. *Example:* a u32 is always four bytes, so 1 is `01 00 00 00`.

All three are in the [glossary](../glossary.md).

## Small end first

4,807 is `0x12C7` in hex: the bytes `12` and `C7`. JAM writes them the other way round,
`C7 12`: the low byte first. Like writing a date as day-month-year.

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

test("ℰ_l writes the least significant byte first", () => {
  assert.deepEqual(encodeFixed(4807n, 2), fromHex("0xc712"));
  assert.deepEqual(encodeFixed(1n, 4), fromHex("0x01000000"));
});

test("decoding reads the bytes back", () => {
  assert.equal(decodeFixed(fromHex("0xc712")), 4807n);
  assert.equal(decodeFixed(encodeFixed(2n ** 64n - 70n, 8)), 2n ** 64n - 70n);
});
```

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

Red, as planned: `src/codec/numbers.ts` doesn't exist yet.

**New file** `src/codec/numbers.ts`

```ts
// The Gray Paper's integer encodings (Appendix C).

import type { Bytes } from "../bytes.ts";

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
# prints: fail 0
# prints: reported
npm run typecheck
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
is `>>>`, the shift that treats the value as unsigned.

</details>

Next: [2.2 Compact naturals](./02-compact-naturals.md)
