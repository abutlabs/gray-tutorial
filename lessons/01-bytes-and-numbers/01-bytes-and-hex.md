# Bytes and hex

Before JAM can be clever, it has to be bytes. Hashes, keys, blocks, whole states: all
bytes in the end. This lesson gives your client a word for bytes and a way to read and
write them the way the test vectors do. It also hands you your second bug to catch.

## New words

- **Byte.** Eight bits: a whole number from 0 to 255. The Gray Paper says *octet*.
  *Example:* 255 is the biggest byte there is.
- **Hex.** Writing bytes as text, two digits per byte, with the digits 0-9 and a-f.
  *Example:* the bytes 1, 2 and 255 are `0x0102ff`.
- **`Uint8Array`.** JavaScript's row of bytes. *Example:* `Uint8Array.of(1, 2, 255)`.
- **Type alias.** A second name for a type you already have. *Example:*
  `type Bytes = Uint8Array`.
- **Stack trace.** When a program crashes, the list of function calls it was in the
  middle of, innermost first. *Example:* `at fromHex (src/bytes.ts:13:21)`.

All five are in the [glossary](../glossary.md).

## Bytes in TypeScript

A `Uint8Array`: a row of numbers from 0 to 255, stored as raw bytes. (A plain `number[]`
would take eight times the memory and happily hold 300 or −1.5. Node's `Buffer` is a
`Uint8Array` with a few surprises, and only exists in Node. `Uint8Array` it is.)

## Hex

The test vectors write bytes as text: `0x`, then two hex digits per byte. The bytes 1, 2
and 255 become `"0x0102ff"`. Node 26 speaks hex already: `bytes.toHex()` gives
`"0102ff"`, and `Uint8Array.fromHex("0102ff")` gives the bytes back. Your client's job is
the `0x`.

## What the Gray Paper says

Section 3 (*Notational Conventions*) names the building blocks. Two you'll meet on nearly
every page:

- **𝔹**, the octet strings, which the paper calls *blobs*. 𝔹ₙ are the ones of length n.
- **ℍ = 𝔹₃₂**, 32-byte values. Every hash in JAM is one.

It also draws a firm line: *"an octet is always serialized to itself, whereas a natural
number may be serialized as a sequence of potentially several octets"*. The byte 5 and
the number 5 are different creatures in JAM. Your client keeps them apart from the start.

## The tests

The test first, as always:

**New file** `test/bytes.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromHex, toHex } from "../src/bytes.ts";

test("hex there and back", () => {
  const bytes = Uint8Array.of(1, 2, 255);
  assert.equal(toHex(bytes), "0x0102ff");
  assert.deepEqual(fromHex("0x0102ff"), bytes);
});

test("no bytes at all is just 0x", () => {
  assert.equal(toHex(new Uint8Array(0)), "0x");
  assert.deepEqual(fromHex("0x"), new Uint8Array(0));
});
```

`assert.deepEqual` compares two arrays byte by byte. (Plain `===` would only ask whether
they are the very same object, which two separate arrays never are.)

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

Red: there's no `src/bytes.ts` yet. Let's fix that.

## The code

**New file** `src/bytes.ts`

```ts
// Bytes: the Gray Paper's octet strings (GP §3).

/** An octet string: the GP's 𝔹, and fixed-length kinds of it such as ℍ (32 bytes). */
export type Bytes = Uint8Array;

/** The bytes as the test vectors write them: "0x", then two hex digits per byte. */
export function toHex(bytes: Bytes): string {
  return "0x" + bytes.toHex();
}

/** The bytes back from "0x" hex. */
export function fromHex(hex: string): Bytes {
  return Uint8Array.fromHex(hex);
}
```

`type Bytes = Uint8Array` is a type alias. It checks nothing extra, but from now on every
function that takes bytes says so out loud.

**Run, expect it to fail**

```sh
npm test
# fails with: Input string must contain hex characters in even length
```

## Bug hunt

Red again, with the file right there. (On purpose: your second planted bug, after 0.4's.)
Last time the code gave a wrong answer. This time it crashes, and a crash leaves a trail.

1. **The test output.** Both tests failed, with the same message: `SyntaxError: Input
   string must contain hex characters in even length`. Under it is a stack trace. Skip
   the lines inside Node and find the first one in your own code: `at fromHex
   (.../src/bytes.ts:13:21)`. That's line 13, the inside of `fromHex`. The line below
   it, in `test/bytes.test.ts`, is the test that called it.
2. **The dashboard.** *Tests failed* says 2, and *Test results* has two `FAIL` lines with
   the same message. Two tests, one cause: both call `fromHex`. And `toHex` is fine: its
   assertions come first, and they passed.

   ![Failed tests panel](./images/01-failed-tests.png)
3. **The reasoning.** The message is odd: `"0x0102ff"` has eight characters, and eight is
   even. An error message is a clue, not a verdict: Node gives this one for any text it
   can't read as hex. So what can't it read? The `x`. `toHex` puts `0x` on the front, so
   `fromHex` has to take it off before Node sees the rest.

The fix:

**Replace in** `src/bytes.ts`

```ts
/** The bytes back from "0x" hex. */
export function fromHex(hex: string): Bytes {
  return Uint8Array.fromHex(hex.slice(2)); // slice(2) skips the "0x"
}
```

**Run**

```sh
npm test
# prints: fail 0
# prints: reported
npm run typecheck
```

Green. Four tests on the dashboard now. Keep the trick from step 1: when something
crashes, find the first line of the stack trace that's yours.

<details>
<summary>lasair: hex by hand, in <code>lib/serialization.ml</code></summary>

OCaml has no hex built in, so lasair does it one *nibble* (half a byte) at a time:

```ocaml
(** Convert bytes to hex string for debugging *)
let bytes_to_hex (bs : bytes) : string =
  let hex = Bytes.create (Bytes.length bs * 2) in
  for i = 0 to Bytes.length bs - 1 do
    let b = Char.code (Bytes.get bs i) in
    let hi = b lsr 4 in
    let lo = b land 0xF in
    Bytes.set hex (i * 2) (if hi < 10 then Char.chr (hi + 48) else Char.chr (hi + 87));
    Bytes.set hex (i * 2 + 1) (if lo < 10 then Char.chr (lo + 48) else Char.chr (lo + 87))
  done;
  Bytes.to_string hex
```

`b lsr 4` is the top four bits, `b land 0xF` the bottom four. Then a little ASCII magic:
48 is the character `0`, and adding 87 turns 10 into `a`. This is what `toHex` does for
you, inside Node.

</details>

Next: [1.2 Numbers](./02-numbers.md)
