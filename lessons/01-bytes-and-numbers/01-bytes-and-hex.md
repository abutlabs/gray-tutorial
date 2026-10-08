# Bytes and hex

## What the Gray Paper says

Section 3 of the Gray Paper (Notational Conventions) names the sets everything else is
built from. Two you will meet on every page:

- **𝔹**, the octet strings, which the paper calls *blobs*. 𝔹ₙ are those of length n.
- **ℍ = 𝔹₃₂**, 32-byte values. Every hash in JAM is one.

It also draws a line between bytes and numbers: *"an octet is always serialized to
itself, whereas a natural number may be serialized as a sequence of potentially several
octets"*. The number 5 and the byte 5 are different things in JAM, and the client keeps
them apart from the first line.

## Bytes in TypeScript

A `Uint8Array`: a fixed-length array of integers 0 to 255, stored as raw bytes. Two
alternatives you might reach for, and why not:

- `number[]` takes eight times the memory and allows any number, 300 or −1.5.
- Node's `Buffer` is a `Uint8Array` with surprises: `buf.slice()` shares memory instead
  of copying, and `assert.deepEqual` treats a `Buffer` and a `Uint8Array` with the same
  bytes as different. It also exists only in Node.

## Hex

The test vectors write bytes as text: `"0x"` and then two hex digits per byte, so the
bytes 1, 2, 255 are `"0x0102ff"`. You need to turn bytes into hex and back. (JavaScript
is getting this built in, as `Uint8Array.fromHex`, but Node 24 doesn't have it yet.)

The tests first:

**New file** `test/bytes.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { bytesEqual, concatBytes, fromHex, toHex } from "../src/bytes.ts";

test("hex there and back", () => {
  const b = Uint8Array.of(0, 1, 0x7f, 0x80, 0xff);
  assert.equal(toHex(b), "0x00017f80ff");
  assert.deepEqual(fromHex("0x00017f80ff"), b);
  assert.deepEqual(fromHex("0x00017F80FF"), b);
  assert.equal(toHex(new Uint8Array(0)), "0x");
});

test("fromHex refuses what is not 0x and whole bytes", () => {
  for (const bad of ["00", "0x0", "0xzz", "0x 1"]) {
    assert.throws(() => fromHex(bad), /not 0x/);
  }
});

test("equal and concat", () => {
  assert.ok(bytesEqual(fromHex("0x0102"), Uint8Array.of(1, 2)));
  assert.ok(!bytesEqual(fromHex("0x0102"), fromHex("0x010203")));
  assert.ok(!bytesEqual(fromHex("0x0102"), fromHex("0x0103")));
  const joined = concatBytes(fromHex("0x01"), fromHex("0x"), fromHex("0x0203"));
  assert.deepEqual(joined, fromHex("0x010203"));
});
```

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

**New file** `src/bytes.ts`

```ts
// Bytes: the Gray Paper's octet strings (GP §3).

/** An octet string: the GP's 𝔹, and its fixed-length kinds such as ℍ (32 bytes). */
export type Bytes = Uint8Array;

/** The bytes as the test vectors write them: "0x" and two lowercase hex digits each. */
export function toHex(bytes: Bytes): string {
  let hex = "0x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** The bytes written as "0x" hex; throws on anything else. */
export function fromHex(hex: string): Bytes {
  if (!/^0x([0-9a-fA-F]{2})*$/.test(hex)) {
    throw new Error(`not 0x and whole bytes of hex: ${hex.slice(0, 20)}`);
  }
  const bytes = new Uint8Array((hex.length - 2) / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(2 + 2 * i, 4 + 2 * i), 16);
  return bytes;
}

/** Whether two byte strings hold the same bytes. (=== asks whether they are the same object.) */
export function bytesEqual(a: Bytes, b: Bytes): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** The parts one after another: the GP's ⌢ operator. */
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

`type Bytes = Uint8Array` is an alias: it adds no checks, but every signature now says
what it means. `/^0x([0-9a-fA-F]{2})*$/` accepts `0x` followed by any number of pairs of
hex digits, so it rejects an odd count of digits along with everything else.

**Run**

```sh
npm test
# prints: fail 0
npm run typecheck
```

<details>
<summary>lasair: OCaml's <code>bytes</code></summary>

OCaml has a built-in `bytes` type, a mutable string of bytes, and lasair uses it for
every 𝔹. Joining encodings, the GP's ⌢, is a function over a list of them, from
`lib/serialization.ml`:

```ocaml
(** Concatenate multiple encoded values *)
let encode_tuple (parts : bytes list) : bytes =
```

OCaml writes the type after the name (`parts : bytes list`, a list of bytes values) and
the return type after the arguments (`: bytes`).

</details>

Next: [1.2 Numbers](./02-numbers.md)
