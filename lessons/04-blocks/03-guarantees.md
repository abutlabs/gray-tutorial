# Guarantees

A work-report doesn't just wander into a block. Somebody has to vouch for it: two or
three validators from the core that did the work sign it, putting their names (and,
eventually, their stake) on "this report is correct". A signed report is a
**guarantee**, and guarantees are how work from the cores reaches the chain.


## New words

- **Guarantee.** A work-report signed by the validators who vouch for it. *Example:* one
  report, signed at slot 42 by validators 3 and 4.
- **Credential.** One guarantor's signature on a guarantee: its validator index and its
  Ed25519 signature. *Example:* index 3, then 64 bytes.

Both are in the [glossary](../glossary.md).

## What the Gray Paper says

§11 (*Work Report Guarantees*): a guarantee is three things:

- the **work-report** itself ([lesson 3.3](../03-work-and-reports/03-a-work-report.md));
- the **timeslot** the guarantors signed it in;
- a **credential**: two or three signatures, each a validator's index and its Ed25519
  signature.

A block carries at most one guarantee per core, in order of core.

Appendix C encodes a guarantee as the report, ℰ₄ of the slot, then the signatures with
their length in front, each as ℰ₂ of the index and the 64-byte signature.

## The test

**Add to** `test/block.test.ts`

```ts
import { GuaranteesExtrinsic } from "../src/block.ts";

testCodecVector("guarantees_extrinsic", GuaranteesExtrinsic);
```

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

**Add to** `src/block.ts`

```ts
import { WorkReport } from "./work.ts";

/** A guarantor's signature: which validator, and its Ed25519 signature. */
export const ValidatorSignature = record({
  validator_index: u16,
  signature: fixedBytes(64),
});
export type ValidatorSignature = Value<typeof ValidatorSignature>;

/** A guarantee (GP §11): a work-report, vouched for by two or three validators. */
export const ReportGuarantee = record({
  report: WorkReport,
  slot: u32, // when the guarantors signed it
  signatures: seq(ValidatorSignature),
});
export type ReportGuarantee = Value<typeof ReportGuarantee>;

/** The guarantees in a block: at most one per core. */
export const GuaranteesExtrinsic = seq(ReportGuarantee);
```

The whole work-report from Part 3 slots straight in as one field. Every piece you've
built so far is a brick for the next.

The report has a size-dependent part (its erasure shards, [lesson 3.3](../03-work-and-reports/03-a-work-report.md)) only in its
*values*, not its shape: 6 or 1,023, it's a u16 either way. So `GuaranteesExtrinsic` is
a plain codec, not a function of the config.

**Run**

```sh
npm test
# prints: guarantees_extrinsic (full)
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**Replace in** `bin/decode.ts`

```ts
import { GuaranteesExtrinsic } from "../src/block.ts";

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
  guarantees_extrinsic: GuaranteesExtrinsic,
});
```

**Run**

```sh
node bin/decode.ts guarantees_extrinsic ../vectors/codec/tiny/guarantees_extrinsic.bin
# prints: 0.slot                         0x2a000000
# prints: 0.signatures.1.validator_index 0x0100
# prints: reported to Grafana
```

Scroll the trace: the whole work-report goes by first (`0.report.package_spec...` down
to `0.report.results.1.refine_load.exports`), then the slot, 42, and two signatures, from
validators 0 and 1. Two guarantors, the minimum.

<details>
<summary>lasair: <code>decode_guarantee</code>, in <code>conformance/block_codec.ml</code></summary>

```ocaml
let decode_guarantee b off =
  let (report, consumed) =
    Lasair.Serialization.decode_work_report (Bytes.sub b off (Bytes.length b - off)) 0 in
  let off = off + consumed in
  let slot = u32_le b off in
  let off = off + 4 in
  let (signatures, off) = dec_list b off (fun b off ->
    let idx = u16_le b off in
    let (s, off) = dec_bytes b (off + 2) 64 in
    ((idx, s), off))
  in
  ({ rg_report = report; rg_slot = slot; rg_signatures = signatures }, off)
```

Count the `off` variables: every step works out where the next one starts. That's the
bookkeeping your Reader does for you ([lesson 2.3](../02-codec/03-writer-and-reader.md)), and why your version is a five-line
record.

</details>

## What you have

Four of the five extrinsic parts. One left, and it's the dramatic one: disputes.

Next: [4.4 Disputes](./04-disputes.md)
