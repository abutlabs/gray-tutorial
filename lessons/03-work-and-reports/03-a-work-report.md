# A work-report

The package went in (3.1); each item came back as a digest (3.2). The *work-report* wraps
them up: a core's receipt for one whole work-package, which validators sign, check and
finally fold into the chain. Everything from [Part 3](./index.md) meets here.

Here is the vectors' report. Tap any part for what it's for, its value and where its bytes
are. Switch from tiny to full and only one part changes.

<WorkReport />

## New words

- **Work-report.** A core's receipt for one whole work-package: its digests, and enough
  detail to check and fetch everything. *Example:* the `work_report` vector.
- **Availability specification.** How to find a package's data again: its hash, its
  bundle's length, the erasure root and shard count, and its exported segments' root and
  count. *Example:* a report's `package_spec`.
- **Erasure coding.** Chopping data into one piece per validator so cleverly that a third
  of the pieces, plus one, can rebuild it all. *Example:* 1,023 shards on full, any 342 of
  which will do; on tiny, 6, any 3.
- **Bundle.** A work-package with everything needed to refine it again: its extrinsics,
  and the segments it imports, with their proofs. *Example:* its length is in a report's
  `package_spec`.

All four are in the [glossary](../glossary.md).

## What the Gray Paper says

§11 (*Work Report*) says a report is:

- the *availability specification*: how to find the package's data again later;
- the refinement *context* ([lesson 2.6](../02-codec/06-the-first-test-vectors.md)) and the *core* that did the work;
- the *authorizer*'s hash, the gas it used, and its output (the vectors call that
  output `auth_output`);
- a *segment-root lookup*: for work-packages this one imported segments from, by
  package hash, the root of the segments they exported;
- the work *digests*, one per item ([lesson 3.2](./02-work-digests.md)).

And the availability specification (§11, *Availability*) is six things: the package's
hash, the length of its *bundle* (the package plus everything needed to re-run it), an
**erasure root** with the number of **erasure shards**, and the root and count of the
segments it exported.

What are erasure shards? Before a report counts, its bundle is chopped into pieces, one
for every validator, cut so cleverly that a third of them, plus one, can rebuild the whole
thing: any 342 of the 1,023 on full, any 3 of the 6 on tiny.
Hence `erasure_shards`: one per validator. Which means, for the first time, tiny and full
vectors differ: 6 shards on tiny, 1,023 on full.

How can a few pieces hold the whole? The same idea in miniature, not JAM's exact code.
Take the message "135": its bytes are 49, 51 and 53. Draw them as dots at x = 0, 1 and 2.
Through any three dots passes exactly one curve, `y = a + bx + cx²`, and through these it's
the straight line y = 49 + 2x (c is 0, because the bytes climb evenly). Read that line on
at x = 3, 4 and 5: 55, 57 and 59. Six numbers, one per validator: those are the shards.

Now lose any three, even 49, 51 and 53, the message itself. The three left, 55, 57 and
59, lie on only one curve, y = 49 + 2x, and at x = 0, 1 and 2 it gives 49, 51 and 53
back. Lose four and two dots are left, and two dots lie on many curves, each reading a
different message. There's no telling which.

Take validators offline and press *rebuild*. Type JAM and the line bends into
y = 74 − 19.5x + 10.5x².

<ShardRebuild />

Where does a report go once it's made? Onto a core, where it waits for validators to say
they hold their pieces, and then either on to the chain or off the core when time runs out.
[Lesson 11.2](../11-assurances/02-timeouts.md) lets you walk one across a core, block by block.

Two fields are compact naturals: `core_index`, and `auth_gas_used`. Remember [lesson 1.2](../01-bytes-and-numbers/02-numbers.md)?
`auth_gas_used` is the field where lasair's signed-number bug lived.

## The test

**Add to** `test/work.test.ts`

```ts
import { WorkReport } from "../src/work.ts";

for (const spec of ["tiny", "full"]) {
  test(`work_report (${spec})`, () => checkCodecVector(WorkReport, `codec/${spec}/work_report`));
}
```

## The code

**Add to** `src/work.ts`

```ts
/** An availability specification (GP §11): how to find a package's data again. */
export const AvailabilitySpec = record({
  hash: hash, // the work-package's hash
  length: u32, // the size of its bundle, the package plus everything needed to re-run it
  erasure_root: hash, // the root of its erasure-coded chunks
  erasure_shards: u16, // how many chunks: one per validator
  exports_root: hash, // the root of the segments it exported
  exports_count: u16,
});
export type AvailabilitySpec = Value<typeof AvailabilitySpec>;

/** A segment-root lookup entry: a work-package's hash and the root of its segments. */
export const SegmentRootLookupItem = record({
  work_package_hash: hash,
  segment_tree_root: hash,
});
export type SegmentRootLookupItem = Value<typeof SegmentRootLookupItem>;

/** A work-report (GP §11): what a core sends back for one work-package. */
export const WorkReport = record({
  package_spec: AvailabilitySpec,
  context: RefineContext,
  core_index: natural32,
  authorizer_hash: hash,
  auth_gas_used: natural,
  auth_output: blob,
  segment_root_lookup: seq(SegmentRootLookupItem),
  results: seq(WorkDigest),
});
export type WorkReport = Value<typeof WorkReport>;
```

The Gray Paper calls the lookup a *dictionary* (hash to hash), and Appendix C encodes a
small dictionary as a list of its key-value pairs, sorted by key, length in front. So
that's what this is: a `seq` of pairs. (The vectors' lookup is empty, but the shape is
ready.)

Once more the encoding's order beats the definition's: §11 lists the authorizer's gas
*last*, Appendix C writes it fifth. The record follows Appendix C.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ work_report (tiny) (0.9ms)
✔ work_report (full) (0.7ms)
...
ℹ tests 32
ℹ suites 0
ℹ pass 32
ℹ fail 0
...
reported 32 tests to Grafana: http://127.0.0.1:3300/d/the-gray-tutor?var-client=you&var-run_id=test-1791727156593
...
```

## Watch it

**Replace in** `bin/decode.ts`

```ts
import { WorkReport } from "../src/work.ts";

/** The structures this program knows, by the test vectors' names for them. */
const CODECS: Record<string, Codec<unknown>> = {
  refine_context: RefineContext,
  work_item: WorkItem,
  work_package: WorkPackage,
  work_result: WorkDigest,
  work_report: WorkReport,
};
```

**Run**

```sh
npm pkg set scripts.decode-work-report="node bin/decode.ts work_report ../vectors/codec/full/work_report.bin"
npm run decode-work-report
```

```text
    0..32    package_spec.hash              0x30466e0ae1b05dde5249872475f6beeac368fd014b5a3413ceb32d3872143284
   32..36    package_spec.length            0x2a000000
   36..68    package_spec.erasure_root      0x7af11fdaa717c398e223211842b41392f18df4bbc4ea0f4cfb972f19c7a64949
   68..70    package_spec.erasure_shards    0xff03
   70..102   package_spec.exports_root      0xe8e52949f6e4fb1d943248df48c3f2b538200fddfea22388e5e061be8ebf21a7
  102..104   package_spec.exports_count     0x4500
...
  273..274   core_index                     0x03
...
reported to Grafana: http://127.0.0.1:3300/d/the-gray-tutor?var-client=you&var-run_id=decode-1791727157021
```

`0xff03`, little end first, is `0x03ff`: 1,023 shards, one per validator on the full
network. Run the same file from `tiny/` and you get `0x0600`. And `core_index` is a single
byte, `0x03`: compact, because it's small.

<details>
<summary>lasair: a trap that tiny can't see, in <code>lib/serialization.ml</code></summary>

```ocaml
let encode_work_report (r : work_report) : bytes =
  let pkg = encode_package_spec r.package_spec in
  let ctx = encode_refinement_context r.context in
  (* core_index is a JAM compact natural, NOT a fixed byte: full-spec cores
     reach 340 (>127 = 2 compact bytes). For tiny cores (0..1, <128) compact ==
     a single byte, so this stays byte-identical for tiny. *)
  let core = encode_compact (Int64.of_int r.core_index) in
  let auth = encode_hash r.authorizer_hash in
  let gas = encode_compact r.auth_gas_used in
  let trace = encode_var r.auth_output in
  let srl = encode_var_sequence encode_segment_lookup_entry r.segment_root_lookup in
  (* All work result items include exports field per graypaper serialization.tex *)
  let res = encode_work_result_items r.results in
  encode_tuple [pkg; ctx; core; auth; gas; trace; srl; res]
```

Read that comment twice. Encode `core_index` as one plain byte and every vector here
still passes: both sizes' vectors put their report on core 3 (a codec vector needn't be a
real chain's), and a real tiny chain's cores only go up to 1. Only a core of 128 or more,
which only full has (up to 340), shows the mistake, and no binary vector in this tutorial
carries one. Some rules no test catches for you: this one
you get right by reading it.

</details>

## Check your understanding

::: check
**`erasure_shards` is `ff 03` on full and `06 00` on tiny. Why do they differ?**

- [ ] The full report's bundle is bigger, so it is cut into more pieces
  > No: both reports say the bundle is 42 bytes, `2a 00 00 00`. The number of shards
  > doesn't depend on the data's size.
- [x] There is one shard per validator: 1,023 on full, 6 on tiny
  > Yes: `0x03ff` is 1,023 and `0x0006` is 6. Every validator holds one piece.
- [ ] Full writes its numbers in a different order
  > No: both are a u16, little end first. `ff 03` is `0x03ff`, 1,023.

**On tiny, 4 of the 6 validators go offline. Can the bundle be rebuilt from the other 2 shards?**

- [ ] Yes: each shard is a full copy, so any one will do
  > No: a shard is a piece, not a copy. If one were enough, the rule would be any 1 of
  > the 6, not any 3.
- [ ] Yes: 2 is a third of 6, and a third is enough
  > No: it takes a third *plus one*: 6 ÷ 3 + 1 = 3 shards.
- [x] No: it takes 3, and more than one bundle fits the same 2 shards
  > Yes: as with the curve, any 3 points fix it, but 2 points fit many curves. With 3
  > validators left, it rebuilds.

**What does erasure coding buy?**

- [ ] Compression: the shards together are smaller than the bundle
  > No: they're bigger. Any 342 of the 1,023 shards hold the whole bundle, so all 1,023
  > hold about three times as much.
- [ ] Secrecy: no single validator can read the bundle
  > No: it isn't encryption. It is about getting the data back, not hiding it.
- [x] The bundle survives even if most validators vanish, and no one has to keep all of it
  > Yes: each validator keeps one piece, and any 342 of the 1,023 rebuild the bundle. So
  > 681 can be gone and the data is still there.

**Write `core_index` as one plain byte instead of a compact natural, and every vector here still passes. Why?**

- [x] Below 128 a compact natural is one byte, the number itself, and the vectors use core 3
  > Yes: core 3 is `03` either way. Only a core of 128 or more, on full, tells them
  > apart: core 340 is `81 54` as a compact natural.
- [ ] A compact natural and a plain byte are the same thing
  > No: they match only below 128. 128 as a compact natural is two bytes, `80 80`.
- [ ] The vectors don't check `core_index`
  > No: they check every byte. `03` simply comes out the same both ways.
:::

## What you have

[Part 3](./index.md)'s paperwork, complete: package in, digests out, and the report that binds them,
all byte for byte with the official vectors at both sizes. Reports reach the chain
inside blocks, along with tickets, preimages, assurances and disputes: [Part 4](../04-blocks/index.md) encodes a
whole block.

Next: [Part 4 · Blocks](../04-blocks/index.md)
