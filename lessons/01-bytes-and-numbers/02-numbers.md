# Numbers

JavaScript has a little secret about numbers, and JAM is exactly the kind of program it
bites. This lesson says what the secret is, proves it with three tiny tests, and sets the
one rule your client follows from here on.

## New words

- **Floating point.** How a JavaScript `number` is stored: about 16 significant digits
  and an exponent, so a huge whole number gets rounded. *Example:* `2 ** 64 - 70` and
  `2 ** 64` come out equal.
- **`bigint`.** A JavaScript whole number with no size limit, written with an `n` after
  its digits. *Example:* `2n` is the `bigint` two, and `2n ** 64n - 70n` is exactly
  18446744073709551546n.
- **Unsigned integer (u8, u16, u32, u64).** A whole number that is never negative, kept in
  a fixed number of bits. *Example:* a u32 goes from 0 to 2^32 − 1, which is 4294967295.
- **Bitwise operator.** One that works on a number's bits: `|` (or), `&` (and), `^`
  (xor) and the shifts `<<`, `>>`, `>>>`. *Example:* `6 & 3` is 2 (binary 110 and 011
  share only the 2s bit).

All four are in the [glossary](../glossary.md).

## The secret

A JavaScript `number` is a 64-bit *floating-point* value. It holds every whole number
exactly up to 2^53 − 1 (that's `Number.MAX_SAFE_INTEGER`, about 9 quadrillion). Above
that, it quietly rounds. So 2^64 − 70, a perfectly good JAM gas amount, comes out as
2^64. No error, no warning, just a different number.

A `bigint` is exact at any size. It's slower, and you can't mix it with plain numbers,
but it never rounds.

The only difference you see is one letter: an `n` after the digits makes a `bigint`.
`2` is the `number` two, `2n` the `bigint` two, and `typeof 2n` says `"bigint"`. A
calculation takes one kind or the other, never both, so every value in it needs its `n`:
2^64 − 70 as a `bigint` is `2n ** 64n - 70n`. Mixing them, as in `1n + 1`, stops with
`TypeError: Cannot mix BigInt and other types`.

One more trap while we're here: in JavaScript, `**` raises to a power, and `^` doesn't.
`^` is *xor*, one of the bitwise operators below, so `2 ** 53` is 9007199254740992 and
`2 ^ 53` is 55.

## What the Gray Paper says

JAM's numbers are naturals (whole numbers from 0 up) with a ceiling. The Gray Paper
writes ℕ_{2^32} for a natural below 2^32 (timeslots, service ids, lengths) and ℕ_{2^64}
for one below 2^64 (gas, balances). Section 4 translates for programmers: a timeslot is
*"a natural less than 2^32 (in compute parlance, a 32-bit unsigned integer)"*.

## The rule

So, for the whole client:

- **u8, u16 and u32 values are `number`**: timeslots, service ids, indices, lengths.
  Exact, fast, easy.
- **u64 values are `bigint`**: gas, balances, anything that can climb past 2^53.

TypeScript keeps the two apart: `1n + 1` is a type error, so you can't mix them by
accident. You convert on purpose, with `BigInt(x)` and `Number(x)`.

## Prove it

Tests usually check your code. These check JavaScript itself, so nobody on the project
ever has to rediscover its quirks the hard way:

**New file** `test/js-numbers.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

test("a number rounds above 2^53: 2^64 - 70 and 2^64 are the same float", () => {
  const twoTo64Minus70: number = 2 ** 64 - 70;
  const twoTo64: number = 2 ** 64;
  assert.equal(twoTo64Minus70, twoTo64);
});

test("a bigint never rounds", () => {
  const twoTo64Minus70: bigint = 2n ** 64n - 70n;
  const twoTo64: bigint = 2n ** 64n;
  assert.notEqual(twoTo64Minus70, twoTo64);
  assert.equal(twoTo64Minus70, 18446744073709551546n);
});

test("bitwise operators work on signed 32-bit integers", () => {
  const allOnes: number = 0xffffffff;
  const signed: number = allOnes | 0;
  assert.equal(signed, -1);
  const unsigned: number = signed >>> 0;
  assert.equal(unsigned, 0xffffffff);
});
```

Every value gets a name and says its kind, `: number` or `: bigint`, so each test reads
as what it's about: the same two values, once as `number` and once as `bigint`. (The names
pay off again in the debugger, below.)

The third test is a trap for later. `|`, `&`, `^`, `<<` and `>>` treat numbers as
*signed* 32-bit integers, so `allOnes`, all 32 bits set, comes out of `| 0` as −1.
`>>> 0` turns it back into the unsigned value. JAM's virtual machine will lean on that.

**Run**

```sh
npm test
```

```text
...
✔ hex there and back (0.8ms)
✔ no bytes at all is just 0x (0.1ms)
✔ a number rounds above 2^53: 2^64 - 70 and 2^64 are the same float (0.6ms)
✔ a bigint never rounds (0.1ms)
✔ bitwise operators work on signed 32-bit integers (0.1ms)
✔ slot 0 is the first six seconds of the JAM Common Era (1.3ms)
✔ an hour is 600 slots (0.1ms)
ℹ tests 7
...
ℹ fail 0
...
reported 7 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791726099568
```

All green on the first try, because these tests pin down how JavaScript already
behaves. Seven tests on the dashboard now.

Want to watch the trap spring? In `test/js-numbers.test.ts`, put a breakpoint on each
test's last `assert`: lines 7, 14 and 22. With that file open, pick *Tests: the open
file* in *Run and Debug* and press <kbd>F5</kbd>, then <kbd>F5</kbd> again at each stop.
The debugger's *Variables* list shows:

1. `twoTo64Minus70` and `twoTo64` both 18446744073709552000: two different numbers,
   rounded to one.
2. The same two as `bigint` values, 18446744073709551546n and 18446744073709551616n:
   70 apart, as they should be.
3. `allOnes` 4294967295, `signed` −1 and `unsigned` 4294967295 again.

While it's paused, the *Debug Console* runs any JavaScript you type. Try
`twoTo64Minus70 === twoTo64` at the first stop.

> [!NOTE]
> **From here on, the debug configurations are yours.** The lessons after this one won't
> mention `.vscode/launch.json`. *Tests: the open file* and *Program: the open file*
> cover anything new. And when you build something you'll run again and again, give it a
> configuration of its own: copy one, then change its `name` and `program`. It's a good
> habit on any system you build: the next time something goes wrong, you're one keypress
> away from watching it happen.

## The same trap, in another language

lasair, written in OCaml, keeps 64-bit values in OCaml's `int64`, which is *signed*: from
2^63 up, a value looks negative. In one encoding function a plain `<` compared such a
value as negative, so 2^64 − 70 was written down as if it were tiny. The official fuzzer
caught it: a work-report's `auth_gas_used` of 2^64 − 70 got the wrong encoding, so its
hash was wrong, so lasair rejected a perfectly valid block. A `bigint` has no sign bit to
trip over, and [lesson 2.2](../02-codec/02-compact-naturals.md) tests that exact value.

<details>
<summary>lasair: the fix, in <code>lib/serialization.ml</code></summary>

```ocaml
(** A compact natural goes up to 2^64 - 1 and is held in an int64, so it is compared
    UNSIGNED: a value >= 2^63 is negative as an int64 and a signed test put it in the
    1-byte form (official fuzzer GP 0.8.0 session 1790609924_6095: a work report's
    auth_gas_used 2^64 - 70 re-encoded as one byte, so its hash and the block's
    extrinsic hash were wrong and a valid block was rejected). *)
let ult (a : int64) (b : int64) = Int64.unsigned_compare a b < 0
```

`ult` is "unsigned less than", and every comparison in that encoder now goes through it.

</details>

## What you have

One rule for every number in your client, `number` up to 32 bits and `bigint` for 64,
and three tests that keep JavaScript's quirks in plain sight. Bytes and numbers are the
raw material. [Part 2](../02-codec/index.md) builds what turns any JAM value into them and back: the codec.

Next: [Part 2 · The codec](../02-codec/index.md)
