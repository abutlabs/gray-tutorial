# Compact naturals

## What the Gray Paper says

Fixed widths waste space on small numbers, and the length in front of every list is
almost always small. So Appendix C also defines ℰ without a subscript, for any natural
below 2^64, in one to nine bytes:

```text
ℰ(x) = [0]                                         if x = 0
ℰ(x) = [2^8 − 2^(8−l) + ⌊x / 2^(8l)⌋] ⌢ ℰ_l(x mod 2^(8l))   if 2^(7l) ≤ x < 2^(7(l+1)), for l in 0..7
ℰ(x) = [2^8 − 1] ⌢ ℰ_8(x)                           otherwise (x < 2^64)
```

This is easier to read in binary. l is the number of bytes that follow the first one,
and the first byte starts with l one-bits and then a zero. The bits after the zero hold
the top of x, and the l bytes that follow hold the rest of x, little-endian:

| x is below | bytes | first byte |
| --- | --- | --- |
| 2^7 | 1 | `0xxxxxxx` |
| 2^14 | 2 | `10xxxxxx` |
| 2^21 | 3 | `110xxxxx` |
| ... | ... | ... |
| 2^56 | 8 | `11111110` |
| 2^64 | 9 | `11111111`, then all of x in 8 bytes |

A decoder reads the first byte, counts its leading ones, and knows how many bytes to
read next. Numbers below 128 take one byte, which is why a short list costs one byte of
length. (If you know UTF-8, or SCALE's compact integers from Polkadot, this is the same
idea with different details.)

Where it is used: the length in front of every variable-length sequence and blob, and
some counts and amounts the Gray Paper chooses to write compactly.

## The code

The test table is the heart of this lesson: one value at each length, including 2^64 −
70, the value from lasair's bug in lesson 1.2. Check a couple of rows by hand against
the table above.

**Add to** `test/numbers.test.ts`

```ts
import { toHex } from "../src/bytes.ts";
import { DecodeError, decodeNatural, encodeNatural } from "../src/codec/numbers.ts";

const NATURALS: [bigint, string][] = [
  [0n, "0x00"],
  [1n, "0x01"],
  [127n, "0x7f"],
  [128n, "0x8080"],
  [16383n, "0xbfff"],
  [16384n, "0xc00040"],
  [2n ** 56n - 1n, "0xfeffffffffffffff"],
  [2n ** 56n, "0xff0000000000000001"],
  [2n ** 64n - 70n, "0xffbaffffffffffffff"],
  [2n ** 64n - 1n, "0xffffffffffffffffff"],
];

test("ℰ, the compact natural, at each length", () => {
  for (const [x, hex] of NATURALS) {
    assert.equal(toHex(encodeNatural(x)), hex, `ℰ(${x})`);
    assert.deepEqual(decodeNatural(fromHex(hex)), { value: x, length: (hex.length - 2) / 2 });
  }
});

test("ℰ round-trips on both sides of every 2^7k", () => {
  for (let k = 1n; k <= 9n; k++) {
    for (const x of [2n ** (7n * k) - 1n, 2n ** (7n * k)]) {
      assert.equal(decodeNatural(encodeNatural(x)).value, x);
    }
  }
});

test("decodeNatural reads at an offset, and refuses to run past the end", () => {
  assert.deepEqual(decodeNatural(fromHex("0xaa8080"), 1), { value: 128n, length: 2 });
  assert.throws(() => decodeNatural(fromHex("0x80")), DecodeError);
  assert.throws(() => decodeNatural(fromHex("0x")), DecodeError);
  assert.throws(() => encodeNatural(2n ** 64n), RangeError);
});
```

Take 128, the first two-byte value. It is at least 2^7 and below 2^14, so l = 1. The
first byte is 2^8 − 2^7 + ⌊128 / 2^8⌋ = 128 + 0 = `0x80`, and then ℰ₁(128 mod 256) =
`0x80`: `0x8080`. The k = 9 case in the second test is 2^63, where a signed 64-bit
integer turns negative, as in lasair's bug.

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

The test file exists, so this time Node complains about the names it imports, not the
file. You add them next.

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

It makes one array big enough for every part, then copies each part in after the last.

**Add to** `src/codec/numbers.ts`

```ts
import { concatBytes } from "../bytes.ts";

/** A decoder met bytes that are not an encoding of what it expected, or ran out of them. */
export class DecodeError extends Error {
  name = "DecodeError";
}

/** ℰ(x): x below 2^64 in 1 to 9 bytes; the first byte says how many follow. */
export function encodeNatural(x: bigint): Bytes {
  if (x < 0n || x >= 1n << 64n) throw new RangeError(`${x} is not a natural below 2^64`);
  for (let l = 0; l < 8; l++) {
    if (x < 1n << BigInt(7 * (l + 1))) {
      const top = Number(x >> BigInt(8 * l)); // ⌊x / 2^(8l)⌋
      const rest = x & ((1n << BigInt(8 * l)) - 1n); // x mod 2^(8l)
      return concatBytes(Uint8Array.of(256 - (256 >> l) + top), encodeFixed(rest, l));
    }
  }
  return concatBytes(Uint8Array.of(255), encodeFixed(x, 8));
}

/** The natural encoded at bytes[offset], and how many bytes it took. */
export function decodeNatural(bytes: Bytes, offset = 0): { value: bigint; length: number } {
  if (offset >= bytes.length) throw new DecodeError("no bytes left for a natural");
  const first = bytes[offset];
  let l = 0;
  while (l < 8 && first & (0x80 >> l)) l++; // count the leading one-bits
  if (offset + 1 + l > bytes.length) throw new DecodeError(`a natural needs ${l} more bytes`);
  const rest = decodeFixed(bytes.subarray(offset + 1, offset + 1 + l));
  if (l === 8) return { value: rest, length: 9 };
  const top = BigInt(first & (0x7f >> l)); // the bits after the l ones and the zero
  return { value: (top << BigInt(8 * l)) | rest, length: l + 1 };
}
```

The loop in `encodeNatural` tries l = 0, 1, 2 and so on, and stops at the first l with
x < 2^(7(l+1)). Because the smaller ls failed, x ≥ 2^(7l) holds too: that is the Gray
Paper's condition. `256 - (256 >> l)` is 2^8 − 2^(8−l), the l leading ones. When no l
fits, x needs all 8 bytes after a `0xff`.

`decodeNatural` takes an `offset` because it will read from the middle of a block's
bytes, and it returns the length so the caller knows where the next value starts.

One question to keep in mind: `0x8005` also decodes to 5, though ℰ(5) is `0x05`. The
Gray Paper calls ℰ's inverse the decoder, and no value encodes to `0x8005`, so strictly
those bytes are not an encoding at all. This decoder, like lasair's, accepts them.

**Run**

```sh
npm test
# prints: fail 0
# prints: reported
npm run typecheck
```

<details>
<summary>lasair: <code>decode_compact</code> (a few comments trimmed)</summary>

```ocaml
let decode_compact (bs : bytes) (offset : int) : int64 * int =
  let first = Char.code (Bytes.get bs offset) in
  if first = 0 then
    (0L, 1)
  else if first < 0x80 then
    (* Single byte value < 128 *)
    (Int64.of_int first, 1)
  else if first = 0xFF then
    (* 9-byte encoding: 0xFF + 8 bytes *)
    let v = decode_fixed_int bs (offset + 1) 8 in
    (v, 9)
  else
    (* Multi-byte encoding: count leading 1 bits to determine l *)
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

It returns a pair, `(value, bytes_consumed)`, where yours returns an object. It does not
check the end of the input: `Bytes.get` raises OCaml's own exception there, and the
caller deals with it.

</details>

Next: [2.3 Writer and Reader](./03-writer-and-reader.md)
