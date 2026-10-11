# Compact naturals

Fixed widths are wasteful: writing the number 3 in eight bytes is seven bytes of nothing.
And JAM writes a *lot* of small numbers, because every list carries its length in front.
So the Gray Paper has a second way to write a number, one that shrinks to fit.

## New words

- **Compact natural.** A whole number written in as few bytes as it needs, from one to
  nine, with the first byte saying how many more follow. *Example:* 5 is `0x05`, one
  byte; 128 takes two, `0x8080`.
- **Leading ones.** The one-bits at the very start of a byte, before its first zero.
  *Example:* `110xxxxx` has two leading ones: two more bytes follow.

Both are in the [glossary](../glossary.md).

## Shrink to fit

The trick is in the first byte. It starts with some one-bits and then a zero. The number
of ones, l, says how many more bytes follow. The bits after the zero hold the top of x,
and the l bytes after the first hold the rest, little-endian:

| x is below | bytes | first byte |
| --- | --- | --- |
| 2^7 | 1 | `0xxxxxxx` |
| 2^14 | 2 | `10xxxxxx` |
| 2^21 | 3 | `110xxxxx` |
| ... | ... | ... |
| 2^56 | 8 | `11111110` |
| 2^64 | 9 | `11111111`, then all of x in 8 bytes |

A decoder peeks at the first byte, counts the leading ones, and knows exactly how much to
read. Anything below 128 fits in one byte, which is why a short list costs just one byte
of length. (If you know UTF-8, it's the same trick in a different costume.)

## What the Gray Paper says

Appendix C defines ℰ without a subscript, for any natural below 2^64, in one to nine
bytes. Here is the table above, in the Gray Paper's words:

```text
ℰ(x) = [0]                                         if x = 0
ℰ(x) = [2^8 − 2^(8−l) + ⌊x / 2^(8l)⌋] ⌢ ℰ_l(x mod 2^(8l))   if 2^(7l) ≤ x < 2^(7(l+1)), for l in 0..7
ℰ(x) = [2^8 − 1] ⌢ ℰ_8(x)                           otherwise (x < 2^64)
```

The middle line is the whole table: 2^8 − 2^(8−l) is a byte of l leading ones, and the
condition picks the smallest l that x fits in.

## The tests

One value at each of a few lengths, including our old friend 2^64 − 70 from [lesson 1.2](../01-bytes-and-numbers/02-numbers.md):

**Add to** `test/numbers.test.ts`

```ts
import { toHex } from "../src/bytes.ts";
import { decodeNatural, encodeNatural } from "../src/codec/numbers.ts";

const NATURALS: [bigint, string][] = [
  [0n, "0x00"],
  [127n, "0x7f"],
  [128n, "0x8080"],
  [16384n, "0xc00040"],
  [2n ** 64n - 70n, "0xffbaffffffffffffff"],
];

test("ℰ, the compact natural, at different lengths", () => {
  for (const [x, hex] of NATURALS) {
    assert.equal(toHex(encodeNatural(x)), hex, `ℰ(${x})`);
    assert.deepEqual(decodeNatural(fromHex(hex)), { value: x, length: (hex.length - 2) / 2 });
  }
});

test("decodeNatural can start in the middle of the bytes", () => {
  assert.deepEqual(decodeNatural(fromHex("0xaa8080"), 1), { value: 128n, length: 2 });
});
```

Check 128 by hand. It's at least 2^7 and below 2^14, so l = 1. The first byte is
2^8 − 2^7 + ⌊128 / 2^8⌋ = 128 + 0 = `0x80`, then ℰ₁(128 mod 256) = `0x80`. Together:
`0x8080`. You just did the Gray Paper's arithmetic in your head.

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

The test file exists this time, so Node complains about the *names* it imports instead.

## The code

A compact natural is a first byte glued to the rest, so first a little glue. The Gray
Paper writes joining byte strings as ⌢:

**Add to** `src/bytes.ts`

```ts
/** The parts one after another: the GP's ⌢. */
export function concatBytes(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
```

One array big enough for every part, then each part copied in after the last.

**Add to** `src/codec/numbers.ts`

```ts
import { concatBytes } from "../bytes.ts";

/** ℰ(x): x below 2^64 in 1 to 9 bytes; the first byte says how many follow. */
export function encodeNatural(x: bigint): Bytes {
  for (let l = 0; l < 8; l++) {
    if (x <= 1n << BigInt(7 * (l + 1))) {
      const top = Number(x >> BigInt(8 * l)); // ⌊x / 2^(8l)⌋
      const rest = x & ((1n << BigInt(8 * l)) - 1n); // x mod 2^(8l)
      return concatBytes(Uint8Array.of(256 - (256 >> l) + top), encodeFixed(rest, l));
    }
  }
  return concatBytes(Uint8Array.of(255), encodeFixed(x, 8));
}

/** The natural encoded at bytes[offset], and how many bytes it took. */
export function decodeNatural(bytes: Bytes, offset = 0): { value: bigint; length: number } {
  const first = bytes[offset];
  let l = 0;
  while (l < 8 && first & (0x80 >> l)) l++; // count the leading one-bits
  const rest = decodeFixed(bytes.subarray(offset + 1, offset + 1 + l));
  if (l === 8) return { value: rest, length: 9 };
  const top = BigInt(first & (0x7f >> l)); // the bits after the l ones and the zero
  return { value: (top << BigInt(8 * l)) | rest, length: l + 1 };
}
```

`encodeNatural` tries l = 0, 1, 2 and so on, and takes the first l where x fits below
2^(7(l+1)). (The smaller ones didn't fit, so x is at least 2^(7l): exactly the Gray
Paper's condition.) `256 - (256 >> l)` is 2^8 − 2^(8−l), the l leading ones. If nothing
up to l = 7 fits, x gets `0xff` and all eight bytes.

`decodeNatural` takes an `offset` because it will soon read from the middle of a block,
and returns the `length` so the caller knows where the next value starts.

**Run, expect it to fail**

```sh
npm test
# fails with: ℰ(128)
```

## Bug hunt

Red, with all the code in place. (Yes: your third planted bug.) This one hides at the
edge of a range, where bugs like to live. Your tools:

1. **The test output.** One test failed, *ℰ, the compact natural, at different lengths*,
   with `ℰ(128)` and `'0x80' !== '0x8080'`. That `ℰ(128)` is the test's label: the third
   argument to `assert.equal`, there for exactly this moment. The test checks five
   numbers in a loop, and the label tells you which one broke. 0 and 127 passed (they
   come first, and the loop stops at the first failure).
2. **The dashboard.** *Tests failed* says 1, and *Test results* has the `FAIL` line, label
   and all.

   ![Failed tests panel](./images/02-failed-tests.png)
3. **The reasoning.** 128 is 2^7: the very first number too big for one byte. One byte
   holds 7 bits of x after its leading zero, so 0 to 127, and nothing more. Your code
   gave 128 one byte, `0x80`, whose first bit is a one: a decoder would expect another
   byte after it. So the code let 128 in at l = 0. Look at the condition: `x <= ...`,
   "at most 2^7". The Gray Paper says x < 2^(7(l+1)): *strictly* below.

`<=` where `<` was meant: an *off-by-one*, a bug that's wrong by exactly one, right at a
boundary. It's why the test list has 127 and 128 side by side. The fix is one character:

**Replace in** `src/codec/numbers.ts`

```ts
/** ℰ(x): x below 2^64 in 1 to 9 bytes; the first byte says how many follow. */
export function encodeNatural(x: bigint): Bytes {
  for (let l = 0; l < 8; l++) {
    if (x < 1n << BigInt(7 * (l + 1))) {
      const top = Number(x >> BigInt(8 * l)); // ⌊x / 2^(8l)⌋
      const rest = x & ((1n << BigInt(8 * l)) - 1n); // x mod 2^(8l)
      return concatBytes(Uint8Array.of(256 - (256 >> l) + top), encodeFixed(rest, l));
    }
  }
  return concatBytes(Uint8Array.of(255), encodeFixed(x, 8));
}
```

**Run**

```sh
npm test
# prints: fail 0
# prints: reported
npm run typecheck
```

Green. Your client now writes numbers the way JAM likes them: small when small. And when
you write a test for a range, put a value on each side of every edge.

<details>
<summary>lasair: <code>decode_compact</code> (comments trimmed)</summary>

```ocaml
let decode_compact (bs : bytes) (offset : int) : int64 * int =
  let first = Char.code (Bytes.get bs offset) in
  if first = 0 then
    (0L, 1)
  else if first < 0x80 then
    (Int64.of_int first, 1)
  else if first = 0xFF then
    let v = decode_fixed_int bs (offset + 1) 8 in
    (v, 9)
  else
    let rec count_leading_ones byte count =
      if count >= 8 then count
      else if byte land (0x80 lsr count) <> 0 then count_leading_ones byte (count + 1)
      else count
    in
    let l = count_leading_ones first 0 in
    let total_len = l + 1 in
    let high_mask = (1 lsl (8 - l)) - 1 in
    let high_part = Int64.of_int (first land high_mask) in
    let low_part = decode_fixed_int bs (offset + 1) l in
    let shift = l * 8 in
    let value = Int64.logor (Int64.shift_left high_part shift) low_part in
    (value, total_len)
```

Same dance: count the leading ones, mask off the top bits, glue them above the rest. It
returns a pair, `(value, bytes_consumed)`, where yours returns an object.

</details>

Next: [2.3 Writer and Reader](./03-writer-and-reader.md)
