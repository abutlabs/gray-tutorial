# Tickets and preimages

Time to build a block. Not all at once: a block is a header plus five bags of stuff from
the outside world, and this lesson fills the two simplest bags.

## New words

- **Extrinsic.** The part of a block that comes from outside the chain's state, in five
  lists. *Example:* tickets, preimages, guarantees, assurances, disputes.
- **Ticket.** An anonymous entry in the lottery for who makes blocks in the next epoch.
  *Example:* `attempt` 1, and a 784-byte proof.
- **Ring VRF proof.** Cryptography that proves *some* validator in a set made something,
  without saying *which*. *Example:* every ticket carries one.
- **Preimage.** The data behind a hash: if h = H(d), d is h's preimage. Services ask for
  data by its hash, and blocks deliver it. *Example:* a new version of a service's code.

All four are in the [glossary](../glossary.md).

## What the Gray Paper says

§4 splits a block into its *header* and its *extrinsic* (the data that comes from
*outside* the chain's state), and the extrinsic into five parts:

| Part | What it carries | Lesson |
| --- | --- | --- |
| tickets | entries in the lottery for who authors future blocks | this one |
| preimages | data that services asked for by hash | this one |
| guarantees | work-reports, signed by the validators who vouch for them | 4.3 |
| assurances | validators' promises that they hold reports' data | 4.2 |
| disputes | judgements on reports someone thinks are wrong | 4.4 |

(Appendix C writes them in its own order, header, tickets, preimages, guarantees,
assurances, disputes. You know the drill by now: the encoding's order wins.)

A **ticket** (§6) is an anonymous lottery entry. Every epoch, validators submit tickets
for the right to author blocks in the next one, and the best tickets win slots. Each
ticket says which of its owner's tries it is (`attempt`, one byte), and carries a **ring
VRF proof**: 784 bytes of cryptography that prove *some* validator made it without
revealing *which*. You'll check those proofs in [Part 8](../08-safrole/index.md). Today they're just 784 bytes.

A *preimage* is the data behind a hash. Services can ask for data by its hash, and
anyone can then deliver it in a block: the requesting service's id (ℰ₄) and the data
itself, as a blob.

Each part is a sequence with its length in front.

## A shortcut for vector tests

[Part 4](./index.md) checks a lot of vectors, each at both sizes. One helper registers both tests in
one line:

**Add to** `test/vectors.ts`

```ts
import { test } from "node:test";

/** Tests a codec against a codec vector at both sizes, tiny and full. */
export function testCodecVector(name: string, codec: Codec<unknown>): void {
  for (const spec of ["tiny", "full"]) {
    test(`${name} (${spec})`, () => checkCodecVector(codec, `codec/${spec}/${name}`));
  }
}
```

## The tests

**New file** `test/block.test.ts`

```ts
import { PreimagesExtrinsic, TicketsExtrinsic } from "../src/block.ts";
import { testCodecVector } from "./vectors.ts";

testCodecVector("tickets_extrinsic", TicketsExtrinsic);
testCodecVector("preimages_extrinsic", PreimagesExtrinsic);
```

Four tests in two lines.

**Run, expect it to fail**

```sh
npm test
```

```text
...
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/client/src/block.ts' imported from …/client/test/block.test.ts
...
✖ test/block.test.ts (167.1ms)
...
ℹ tests 33
ℹ suites 0
ℹ pass 32
ℹ fail 1
...
```

Red: there's no `src/block.ts` yet.

## The code

**New file** `src/block.ts`

```ts
// Blocks: a header, and the extrinsic, the data a block brings in from outside (GP §5).

import type { Value } from "./codec/codec.ts";
import { blob, fixedBytes, record, seq, u32, u8 } from "./codec/codec.ts";

/** A ticket (GP §6): an anonymous entry in the draw for who authors which slot. */
export const TicketEnvelope = record({
  attempt: u8, // which of its tries the validator used
  signature: fixedBytes(784), // a ring VRF proof: one of the validators made it, but which?
});
export type TicketEnvelope = Value<typeof TicketEnvelope>;

/** The tickets in a block. */
export const TicketsExtrinsic = seq(TicketEnvelope);

/** A preimage (GP §12): data that a service asked for by its hash, delivered. */
export const Preimage = record({
  requester: u32, // the service that asked
  blob: blob,
});
export type Preimage = Value<typeof Preimage>;

/** The preimages in a block. */
export const PreimagesExtrinsic = seq(Preimage);
```

Nothing new under the sun: records and sequences, the bricks from [Part 2](../02-codec/index.md). The only
surprise is how *big* a ticket is. Those 784 bytes are the price of anonymity.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ preimages_extrinsic (tiny) (1.8ms)
✔ preimages_extrinsic (full) (0.9ms)
...
ℹ tests 36
ℹ suites 0
ℹ pass 36
ℹ fail 0
...
reported 36 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791728268478
...
```

## Watch it

**Replace in** `bin/decode.ts`

```ts
import { PreimagesExtrinsic, TicketsExtrinsic } from "../src/block.ts";

/** The structures this program knows, by the test vectors' names for them. */
const CODECS: Record<string, Codec<unknown>> = {
  refine_context: RefineContext,
  work_item: WorkItem,
  work_package: WorkPackage,
  work_result: WorkDigest,
  work_report: WorkReport,
  tickets_extrinsic: TicketsExtrinsic,
  preimages_extrinsic: PreimagesExtrinsic,
};
```

**Run**

```sh
node bin/decode.ts preimages_extrinsic ../vectors/codec/tiny/preimages_extrinsic.bin
```

```text
    0..1     length                         0x03
    1..5     0.requester                    0x04030201
...
reported to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=decode-1791728269291
```

A list of three preimages: `length 0x03`, then each requester and its blob. The blob's
first byte, `0x10`, is its length: 16 bytes of data follow.

<details>
<summary>lasair: one octet, mind you</summary>

The ticket's `attempt` is one byte, ℰ₁. The official vectors once got that wrong
themselves: their `.bin` files used the compact form, which only differs for attempts of
128 or more. Their changelog for v0.8.0 records the fix:

```text
* `TicketAttempt` is encoded as one octet, as the GP and the schema say. The
  `.bin` files used the compact form, which differs for attempts of 128 or
  more.
```

Even the referee double-checks the rule book. lasair already wrote one octet, so the fix
changed nothing for it, and your `u8` is right from the start.

</details>

## What you have

Two of the five parts of a block's extrinsic. The next part's size depends on the network:
[lesson 4.2](./02-tiny-and-full.md) meets JAM's two sizes, tiny and full.

Next: [4.2 Tiny and full](./02-tiny-and-full.md)
