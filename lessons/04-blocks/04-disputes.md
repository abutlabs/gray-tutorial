# Disputes

Every system that trusts people needs a way to say "that was wrong". In JAM, if a
guaranteed work-report turns out to be bad, the validators hold a trial, right in the
blocks: they vote, a verdict is recorded, and whoever vouched for the bad report is named
a *culprit*. Validators who voted the wrong way are recorded as *faults*. It's the
most dramatic part of the extrinsic, and the last one.

## New words

- **Verdict.** The votes of two thirds of the validators, plus one, on one report.
  *Example:* 5 votes on tiny.
- **Culprit.** A validator who vouched for a report that turned out bad. *Example:* a
  guarantor's key and its signed guarantee, as evidence.
- **Fault.** A validator whose vote went against the verdict. *Example:* "valid", on a
  report judged bad.

All three are in the [glossary](../glossary.md).

## What the Gray Paper says

§10 (*Disputes, Verdicts and Judgments*) puts three lists in a block:

- **verdicts**: each one names a work-report (by its hash, the `target`), the epoch whose
  validators voted (`age`), and the votes themselves: two thirds of the validators, plus
  one. Each vote (a *judgement*) is a yes or no, the voter's index and its signature.
- **culprits**: guarantors of a report found bad: the report's hash, the guarantor's
  Ed25519 key, and its signature as evidence.
- **faults**: validators whose vote went against the verdict: the report, how they
  voted, their key, their signature.

Appendix C encodes all three as lists with their lengths in front, the verdicts as
(target, ℰ₄ of the age, the votes with their length in front).

How many votes? ⌊2V/3⌋ + 1: **5 on tiny, 683 on full**. The vectors have exactly that
many.

## A yes or no

A vote needs one new primitive: a boolean, one byte, 1 for yes and 0 for no.

**Add to** `src/codec/codec.ts`

```ts
/** A yes or no, as one byte: 1 or 0. */
export const bool: Codec<boolean> = {
  encode: (w, x) => w.fixed(x ? 1n : 0n, 1),
  decode: (r) => r.fixed(1) === 1n,
  fromJson: (json) => json as boolean,
};
```

## The test

**Add to** `test/block.test.ts`

```ts
import { DisputesExtrinsic } from "../src/block.ts";

testCodecVector("disputes_extrinsic", DisputesExtrinsic);
```

**Run, expect it to fail**

```sh
npm test
```

```text
...
SyntaxError: The requested module '../src/block.ts' does not provide an export named 'DisputesExtrinsic'
...
✖ test/block.test.ts (192.3ms)
...
ℹ tests 33
ℹ suites 0
ℹ pass 32
ℹ fail 1
...
```

Red: `src/block.ts` doesn't export `DisputesExtrinsic` yet.

## The code

**Add to** `src/block.ts`

```ts
import { bool } from "./codec/codec.ts";

/** A judgement (GP §10): one validator's vote on whether a work-report is valid. */
export const Judgement = record({
  vote: bool, // true: valid
  index: u16, // which validator voted
  signature: fixedBytes(64),
});
export type Judgement = Value<typeof Judgement>;

/** A verdict: the votes of two thirds of the validators, plus one, on one report. */
export const Verdict = record({
  target: hash, // the work-report's hash
  age: u32, // the epoch whose validators voted: this one or the one before
  votes: seq(Judgement),
});
export type Verdict = Value<typeof Verdict>;

/** A culprit: a guarantor who vouched for a report that turned out bad. */
export const Culprit = record({
  target: hash,
  key: fixedBytes(32), // the guarantor's Ed25519 key
  signature: fixedBytes(64), // its guarantee, as evidence
});
export type Culprit = Value<typeof Culprit>;

/** A fault: a validator who voted against the verdict. */
export const Fault = record({
  target: hash,
  vote: bool,
  key: fixedBytes(32),
  signature: fixedBytes(64),
});
export type Fault = Value<typeof Fault>;

/** The disputes in a block (GP §10). */
export const DisputesExtrinsic = record({
  verdicts: seq(Verdict),
  culprits: seq(Culprit),
  faults: seq(Fault),
});
export type DisputesExtrinsic = Value<typeof DisputesExtrinsic>;
```

683 votes on full, 5 on tiny, and the codec doesn't care: the votes carry their own
length, so `DisputesExtrinsic` is a plain codec, not a function of the config.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ disputes_extrinsic (tiny) (0.7ms)
✔ disputes_extrinsic (full) (12.7ms)
...
ℹ tests 42
ℹ suites 0
ℹ pass 42
ℹ fail 0
...
reported 42 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791728272265
...
```

## Watch it

**Replace in** `bin/decode.ts`

```ts
import { DisputesExtrinsic } from "../src/block.ts";

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
  disputes_extrinsic: DisputesExtrinsic,
});
```

**Run**

```sh
node bin/decode.ts disputes_extrinsic ../vectors/codec/full/disputes_extrinsic.bin
```

```text
    0..1     verdicts.length                0x02
...
   37..39    verdicts.0.votes.length        0x82ab
...
reported to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=decode-1791728272718
```

`0x82ab` is a two-byte compact natural ([lesson 2.2](../02-codec/02-compact-naturals.md)): the first byte's leading `1` says
one more byte follows, and together they make 683. Then 683 votes scroll past. It's a
big jury.

<details>
<summary>lasair: the rule that changed</summary>

In Gray Paper 0.7.2, the votes had *no* length in front. From `text/serialization.tex` at
v0.7.2:

```tex
\tup{\xv¬reporthash, \encode[4]{\xv¬epochindex},
  \sq{\build{
```

and at v0.8.0:

```tex
\tup{\xv¬reporthash, \encode[4]{\xv¬epochindex},
  \var{\sq{\build{
```

That `\var` is the length prefix. Without it, a decoder had to *know* how many votes to
read, which means knowing V, which means knowing the size of the network. That's exactly
where lasair's frozen-at-tiny bug ([lesson 4.2](./02-tiny-and-full.md)) bit: its vote count, like its bitfield
size, was computed once at tiny and never again. Under 0.8.0 the votes say how many they
are, and that trap is gone. They have to: 0.8.0 lets the validator count change, so the
network's size no longer tells a decoder how many to read. Specs evolve, and sometimes they make your life easier.

</details>

## What you have

All five parts of a block's extrinsic: tickets, preimages, assurances, guarantees and
disputes, each matching the official vectors at both sizes. The header still needs two
shapes the codec doesn't have: a value that may be missing, and a list of exactly n.
[Lesson 4.5](./05-maybe-and-exactly-n.md) adds both.

Next: [4.5 Maybe, and exactly n](./05-maybe-and-exactly-n.md)
