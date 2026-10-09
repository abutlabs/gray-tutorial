# Numbers

## What the Gray Paper says

JAM's numbers are naturals with a bound: the Gray Paper writes ℕ_{2^32} for a natural
below 2^32 (timeslots, service ids, lengths) and ℕ_{2^64} for one below 2^64 (gas,
balances). Section 4 says what that means for a programmer: a timeslot is *"a natural
less than 2^32 (in compute parlance, a 32-bit unsigned integer)"*.

## What JavaScript does

A JavaScript `number` is a 64-bit floating-point value. It holds every integer exactly up
to 2^53 − 1 (`Number.MAX_SAFE_INTEGER`), and above that it rounds:

```ts
2 ** 64 - 70 === 2 ** 64   // true: both round to the same float
```

A `bigint` is exact at any size: `2n ** 64n - 70n` is 18446744073709551546. So the rule for
the whole client:

- **u8, u16, u32 values are `number`**: timeslots, service ids, indices, lengths. They are
  exact, fast and easy to use.
- **u64 values are `bigint`**: gas, balances, anything that can pass 2^53.

TypeScript keeps the two apart: `1n + 1` is a type error, so you can't mix them by
accident. You convert on purpose, with `BigInt(x)` and `Number(x)`.

A second trap, for later: the bitwise operators `|`, `&`, `^`, `<<` and `>>` work on
*signed* 32-bit integers. `0xffffffff | 0` is −1. `x >>> 0` turns the result back into an
unsigned value. JAM's virtual machine will need this.

## A bug from lasair

lasair, written in OCaml, holds 64-bit values in OCaml's `int64`, which is *signed*: a
value of 2^63 or more is negative there. In one encoding function, a plain `<` compared
such a value as negative, so 2^64 − 70 was written as if it were small. The official
fuzzer found it: a work-report's `auth_gas_used` of 2^64 − 70 encoded wrongly, its hash
came out wrong, and lasair rejected a valid block. `bigint` has no sign to get wrong, and
lesson 2.2 tests that exact value.

## JSON

The test vectors are JSON, and `JSON.parse` turns every number into a float. A u64 above
2^53 in a vector would arrive rounded, silently, and a test comparing rounded numbers
would pass when it shouldn't.

Today every number in the vectors' JSON fits below 2^53, so this has not bitten anyone.
The parser below makes sure it can't. Node 24's `JSON.parse` passes a reviver function
the source text of each value, so a big integer can be read from its digits as a
`bigint`.

**New file** `test/json.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJson } from "../src/json.ts";

test("JSON.parse rounds big integers; parseJson keeps them exact, as bigint", () => {
  assert.equal(JSON.parse("18446744073709551615"), 18446744073709552000);
  assert.equal(parseJson("18446744073709551615"), 2n ** 64n - 1n);
  const parsed = parseJson('{"gas": 18446744073709551546, "slot": 7}');
  assert.deepEqual(parsed, { gas: 2n ** 64n - 70n, slot: 7 });
});

test("everything else is as JSON.parse gives it", () => {
  assert.deepEqual(
    parseJson('[9007199254740991, -1, 0.5, "0x01", null, true]'),
    [9007199254740991, -1, 0.5, "0x01", null, true],
  );
});
```

Look at the first assertion: `JSON.parse` turned 18446744073709551615 into
18446744073709552000, a different number, without a word.

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

**New file** `src/json.ts`

```ts
// JSON as the test vectors write it, with every integer read exactly.

/**
 * JSON.parse, except that an integer too big for a number (beyond 2^53 - 1) becomes a
 * bigint read from its digits, instead of a rounded number.
 */
export function parseJson(text: string): unknown {
  return JSON.parse(text, (_key, value: unknown, context?: { source?: string }) => {
    const source = context?.source;
    const unsafe = typeof value === "number" && !Number.isSafeInteger(value);
    return unsafe && source && /^-?\d+$/.test(source) ? BigInt(source) : value;
  });
}
```

The return type is `unknown`: TypeScript doesn't know what is in the JSON, and makes the
code that reads it check before using it. The codec in Part 2 does exactly that.

**Run**

```sh
npm test
# prints: fail 0
# prints: reported
npm run typecheck
```

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

`ult` is "unsigned less than", and every comparison in that encoder now goes through
it. In TypeScript, a `bigint` is never negative unless you subtract your way there.

</details>

Next: [Part 2 · The codec](../02-codec/index.md)
