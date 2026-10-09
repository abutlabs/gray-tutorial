# Tiny and full

There are two JAMs. The **full** one is the real network: 1,023 validators and 341
cores. Testing anything on that is slow, so there's also a **tiny** one: 6 validators
and 2 cores, same rules, a lot less waiting. The official vectors come in both sizes,
in folders named after them, and until now every structure looked the same in both.

Today that changes. Meet the first structure whose *shape* depends on the size of the
network: the assurance.

## What the Gray Paper says

§11 (*The Assurances Extrinsic*): each validator can say, in a block, which cores' data
it is holding. An assurance is four things:

- an **anchor**: the parent block's hash (every assurance in a block names the same one);
- a **bitfield**: one bit per core, 1 for "I've got its chunks";
- the **validator**'s index, ℰ₂;
- its **signature**: 64 bytes of Ed25519.

One bit per core means C bits. Appendix C packs bits into bytes, eight to a byte, lowest
bit first, so the bitfield takes ⌈C/8⌉ bytes: **1 byte on tiny, 43 on full**. A codec
that reads one byte where there are 43 would misread every assurance after the first.

## The configuration

**New file** `src/config.ts`

```ts
// Two sizes of JAM: the real network ("full"), and a tiny one that tests run fast on.
// The official test vectors come in both, in folders named after them.

/** The protocol constants that depend on the size of the network. */
export type Config = {
  name: string;
  validators_count: number; // V: validators in a set
  core_count: number; // C: cores doing work in parallel
};

export const TINY: Config = { name: "tiny", validators_count: 6, core_count: 2 };

export const FULL: Config = { name: "full", validators_count: 1023, core_count: 341 };
```

Just the two numbers we need, for now. More constants will move in as later lessons need
them.

## A codec that depends on the size

The trick is simple: a codec whose shape depends on the size becomes a *function* that
takes a config and returns a codec.

**Add to** `src/block.ts`

```ts
import { hash, u16 } from "./codec/codec.ts";
import type { Config } from "./config.ts";

/** An assurance (GP §11): a validator's promise that it holds its chunks for these cores. */
export function Assurance(config: Config) {
  return record({
    anchor: hash, // the parent block's hash
    bitfield: fixedBytes(Math.ceil(config.core_count / 8)), // one bit per core, lowest first
    validator_index: u16,
    signature: fixedBytes(64), // the validator's Ed25519 signature
  });
}
export type Assurance = Value<ReturnType<typeof Assurance>>;

/** The assurances in a block. */
export function AssurancesExtrinsic(config: Config) {
  return seq(Assurance(config));
}
```

`ReturnType<typeof Assurance>` is "whatever `Assurance` returns", a codec, and `Value` of
that is the assurance itself. The bitfield stays as bytes, exactly as the vectors write
it. When a later lesson needs to ask "is core 7 available?", it'll pick the bit out.

## Testing both sizes

`testCodecVector` has to build the codec for each size. A codec object or a function of
the config: it now takes either.

**Replace in** `test/vectors.ts`

```ts
import type { Config } from "../src/config.ts";
import { FULL, TINY } from "../src/config.ts";

/**
 * Tests a codec against a codec vector at both sizes, tiny and full. A codec whose shape
 * depends on the size comes as a function of the config.
 */
export function testCodecVector(
  name: string,
  codec: Codec<unknown> | ((config: Config) => Codec<unknown>),
): void {
  for (const config of [TINY, FULL]) {
    const sized = typeof codec === "function" ? codec(config) : codec;
    test(`${name} (${config.name})`, () => checkCodecVector(sized, `codec/${config.name}/${name}`));
  }
}
```

**Add to** `test/block.test.ts`

```ts
import { AssurancesExtrinsic } from "../src/block.ts";

testCodecVector("assurances_extrinsic", AssurancesExtrinsic);
```

**Run**

```sh
npm test
# prints: assurances_extrinsic (full)
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch both sizes

`bin/decode.ts` needs to know the size too. The vectors keep each size in its own folder,
so the file's path says which.

**Replace in** `bin/decode.ts`

```ts
import { AssurancesExtrinsic } from "../src/block.ts";
import type { Config } from "../src/config.ts";
import { FULL, TINY } from "../src/config.ts";

/** The structures this program knows, by the test vectors' names; some depend on the size. */
const CODECS = (config: Config): Record<string, Codec<unknown>> => ({
  refine_context: RefineContext,
  work_item: WorkItem,
  work_package: WorkPackage,
  work_result: WorkDigest,
  work_report: WorkReport,
  tickets_extrinsic: TicketsExtrinsic,
  preimages_extrinsic: PreimagesExtrinsic,
  assurances_extrinsic: AssurancesExtrinsic(config),
});

// the vectors keep each size in its own folder, tiny/ or full/
const codec = CODECS(file?.includes("/full/") ? FULL : TINY)[name];
if (!codec || !file) {
  throw new Error(`usage: node bin/decode.ts <${Object.keys(CODECS(TINY)).join("|")}> <file.bin>`);
}
```

**Run**

```sh
node bin/decode.ts assurances_extrinsic ../vectors/codec/tiny/assurances_extrinsic.bin
# prints: 33..34    0.bitfield                     0x01
node bin/decode.ts assurances_extrinsic ../vectors/codec/full/assurances_extrinsic.bin
# prints: 33..76    0.bitfield
# prints: reported to Grafana
```

Same assurance, two sizes. On tiny the bitfield is one byte, `0x01`: core 0, available.
On full it's 42 bytes of `0x55` and a last `0x15`. `0x55` is `01010101` in binary, so
every *other* core says "got it": 171 of the 341. (The last byte is smaller because 341
cores need only 5 of its 8 bits.)

<details>
<summary>lasair: the codec that froze at tiny</summary>

lasair got this wrong once, in a way that's easy to miss. Its bitfield size was a
module-level value, computed once, when the program loaded:

```ocaml
let bitfield_bytes = ((Stf_config.num_cores ()) + 7) / 8
```

At load time the spec was still tiny, so `bitfield_bytes` was 1 forever, even after the
program switched to full. Every tiny test passed. Then the official fuzzer sent a
full-size block, and lasair crashed with `decode: bad list count`. The fix, commit F5, is
two characters: `()`, which turns the value into a function, computed each time:

```ocaml
let bitfield_bytes () = ((Stf_config.num_cores ()) + 7) / 8
```

Your `Assurance(config)` takes the size as an argument every time, so it can't freeze.

</details>

## What you have

A client that knows JAM comes in two sizes, and codecs that change shape to match.
Three of the five extrinsic parts done.

Next: [4.3 Guarantees](./03-guarantees.md)
