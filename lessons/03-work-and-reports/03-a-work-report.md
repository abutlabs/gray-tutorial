# A work-report

The package went in (3.1). Each item came back as a digest (3.2). Now the paperwork that
wraps it all up: the *work-report*, the receipt a core produces for one whole
work-package. Validators sign it, pass it around, check it, and finally fold its results
into the chain. Everything from [Part 3](./index.md) meets here.

## New words

- **Work-report.** A core's receipt for one whole work-package: its digests, and enough
  detail to check and fetch everything. *Example:* the `work_report` vector.
- **Availability specification.** How to find a package's data again: its hash, its
  bundle's length, the erasure root and shard count, and its exported segments' root and
  count. *Example:* a report's `package_spec`.
- **Erasure coding.** Chopping data into one piece per validator so cleverly that any
  third of the pieces can rebuild it all. *Example:* 6 shards on tiny, 1,023 on full.

All three are in the [glossary](../glossary.md).

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
for every validator, cut so cleverly that any third of them can rebuild the whole thing.
Hence `erasure_shards`: one per validator. Which means, for the first time, tiny and full
vectors differ: 6 shards on tiny, 1,023 on full.

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

**Run, expect it to fail**

```sh
npm test
```

```text
...
SyntaxError: The requested module '../src/work.ts' does not provide an export named 'WorkReport'
...
✖ test/work.test.ts (219.1ms)
...
ℹ tests 20
ℹ suites 0
ℹ pass 19
ℹ fail 1
...
```

Red: `src/work.ts` doesn't export `WorkReport` yet. (No stub, as in [lesson 2.6](../02-codec/06-the-first-test-vectors.md): an empty record would
fool half the check. The vectors judge the real codec.)

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
reported 32 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791727156593
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
node bin/decode.ts work_report ../vectors/codec/full/work_report.bin
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
reported to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=decode-1791727157021
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

Read that comment twice. Encode `core_index` as one plain byte and every tiny vector
still passes, because tiny's cores are 0 and 1. Only full, with cores up to 340, catches
it. That's why you test both.

</details>

## What you have

[Part 3](./index.md)'s paperwork, complete: package in, digests out, and the report that binds them,
all byte for byte with the official vectors at both sizes. Reports reach the chain
inside blocks, along with tickets, preimages, assurances and disputes: [Part 4](../04-blocks/index.md) encodes a
whole block.

Next: [Part 4 · Blocks](../04-blocks/index.md)
