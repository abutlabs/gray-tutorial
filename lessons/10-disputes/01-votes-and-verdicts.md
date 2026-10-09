# Votes and verdicts

Back in lesson 4.4 you decoded disputes: trials held right in the blocks. Now your client
gets to be the court clerk. When validators challenge a work-report, two thirds of them
plus one vote on it, and every vote is signed. The clerk's job: check every signature,
count the votes, and record the verdict, *good*, *bad* or *wonky*, in the state for
good. This lesson is that clerk.

## What the Gray Paper says

§10 (*Disputes, Verdicts and Judgments*).

**Who votes.** A verdict's `age` names an epoch: this one or the one before. Its judges
are κ, the current validators, if the age is the current epoch, and λ, the previous
ones, otherwise. That rule is K.

**What a vote signs.** Ed25519 (lesson 5.3), over a prefix and the report's hash:
`$jam_valid` for "this report is good", `$jam_invalid` for "it isn't". The `$` is
notation, as always: the bytes are `jam_valid` and `jam_invalid`. The prefix is part of
the message, so a "valid" signature can't be passed off as an "invalid" one.

**What it decides.** Count the "valid" votes, t, out of the judges' number, |K|:

| t | The report is |
| --- | --- |
| ⌊2·\|K\|/3⌋ + 1 (5 on tiny, 683 on full) | **good** |
| 0 | **bad** |
| ⌊\|K\|/3⌋ (2 on tiny, 341 on full) | **wonky**: nobody can tell |

**What the state keeps.** ψ (C(5), lesson 6.2) holds three sets of report hashes, good,
bad and wonky, plus the offenders' keys (next lesson). Each verdict's report joins the
set of its outcome. Sets in the state are kept sorted.

## The tests

**New file** `test/disputes.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DisputesExtrinsic } from "../src/block.ts";
import type { Verdict } from "../src/block.ts";
import { FULL, TINY } from "../src/config.ts";
import { judges, outcome, PastJudgements, recordVerdicts, votesSigned } from "../src/disputes.ts";
import { ValidatorKey } from "../src/state.ts";
import { vectorFiles, vectorJson } from "./vectors.ts";

/** A verdict with `valid` "valid" votes out of `count`, unsigned: enough for counting. */
function verdictWith(valid: number, count: number): Verdict {
  const votes = Array.from({ length: count }, (_, index) => ({
    vote: index < valid,
    index,
    signature: new Uint8Array(64),
  }));
  return { target: new Uint8Array(32), age: 0, votes };
}

test("V: with 6 judges, 5 valid votes is good, 0 is bad, 2 is wonky", () => {
  assert.equal(outcome(verdictWith(5, 5), 6), "good"); // ⌊2 × 6 / 3⌋ + 1 = 5
  assert.equal(outcome(verdictWith(0, 5), 6), "bad");
  assert.equal(outcome(verdictWith(2, 5), 6), "wonky"); // ⌊6 / 3⌋ = 2
});

/** A disputes test vector: the parts of it this lesson uses. */
type DisputesVector = {
  input: { disputes: unknown };
  pre_state: { psi: unknown; tau: number; kappa: unknown[]; lambda: unknown[] };
  post_state: { psi: unknown };
  output: { err?: string };
};

/** A disputes vector's verdicts, each with its judges' keys (κ or λ, by its age). */
function judgedVerdicts(config: typeof TINY, vector: DisputesVector) {
  const { input, pre_state } = vector;
  const keys = (list: unknown[]) => list.map((key) => ValidatorKey.fromJson(key));
  const [active, previous] = [keys(pre_state.kappa), keys(pre_state.lambda)];
  return DisputesExtrinsic.fromJson(input.disputes).verdicts.map((verdict) => ({
    verdict,
    keys: judges(config, pre_state.tau, verdict.age, active, previous),
  }));
}

/** The accepted disputes vectors of a size: a rejected block changes nothing. */
function acceptedVectors(config: typeof TINY): { name: string; vector: DisputesVector }[] {
  return vectorFiles(`stf/disputes/${config.name}`)
    .map((name) => ({ name, vector: vectorJson(name) as DisputesVector }))
    .filter(({ vector }) => !vector.output.err);
}

test("every vote is signed by its judge (tiny: full verdicts are 683 votes each)", () => {
  for (const { name, vector } of acceptedVectors(TINY)) {
    for (const { verdict, keys } of judgedVerdicts(TINY, vector)) {
      assert.ok(votesSigned(verdict, keys), name);
    }
  }
});

test("each judged report joins the set of its verdict's outcome", () => {
  let accepted = 0;
  for (const config of [TINY, FULL]) {
    for (const { name, vector } of acceptedVectors(config)) {
      const outcomes = judgedVerdicts(config, vector).map(({ verdict, keys }) => ({
        target: verdict.target,
        outcome: outcome(verdict, keys.length),
      }));
      const after = recordVerdicts(PastJudgements.fromJson(vector.pre_state.psi), outcomes);
      const { good, bad, wonky } = PastJudgements.fromJson(vector.post_state.psi);
      assert.deepEqual([after.good, after.bad, after.wonky], [good, bad, wonky], name);
      accepted++;
    }
  }
  assert.equal(accepted, 21); // 10 tiny, 11 full
});

test("a forged vote is caught", () => {
  const vector = vectorJson("stf/disputes/tiny/progress_with_bad_signatures-1.json");
  const [{ verdict, keys }] = judgedVerdicts(TINY, vector as DisputesVector);
  assert.equal(votesSigned(verdict, keys), false);
});
```

`verdictWith` builds a fake verdict with blank signatures: plenty for testing the count.
The signatures get their own test, on tiny only. A full verdict has 683 votes, and
checking the 10,000-odd votes of all the full vectors would take your test run from
about three seconds to about twelve.

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The code

**New file** `src/disputes.ts`

```ts
// Disputes (GP §10): when a work-report is challenged, validators vote on it, and the chain
// records the verdict for good.

import type { Verdict } from "./block.ts";
import type { Bytes } from "./bytes.ts";
import { concatBytes, toHex } from "./bytes.ts";
import type { Value } from "./codec/codec.ts";
import { fixedBytes, hash, record, seq } from "./codec/codec.ts";
import type { Config } from "./config.ts";
import { epochOf } from "./epoch.ts";
import { verifyEd25519 } from "./signature.ts";
import type { ValidatorKey } from "./state.ts";

/** ψ, C(5): the reports judged good, bad or wonky so far, and the offenders' Ed25519 keys. */
export const PastJudgements = record({
  good: seq(hash),
  bad: seq(hash),
  wonky: seq(hash),
  offenders: seq(fixedBytes(32)),
});
export type PastJudgements = Value<typeof PastJudgements>;

/** X_⊺ and X_⊥: "$jam_valid" and "$jam_invalid" in the GP. */
const VALID = new TextEncoder().encode("jam_valid");
const INVALID = new TextEncoder().encode("jam_invalid");

/** What a vote signs: its prefix, valid or invalid, then the report's hash. */
export function voteMessage(vote: boolean, target: Bytes): Bytes {
  return concatBytes(vote ? VALID : INVALID, target);
}

/** K: whose keys a verdict's votes are signed with. κ if its age is this epoch, else λ. */
export function judges(
  config: Config,
  time: number, // τ
  age: number, // the verdict's epoch
  active: ValidatorKey[], // κ
  previous: ValidatorKey[], // λ
): ValidatorKey[] {
  return age === epochOf(config, time) ? active : previous;
}

/** Whether every vote of a verdict is signed by the validator it names. */
export function votesSigned(verdict: Verdict, keys: ValidatorKey[]): boolean {
  return verdict.votes.every((vote) => {
    const message = voteMessage(vote.vote, verdict.target);
    return verifyEd25519(keys[vote.index].ed25519, message, vote.signature);
  });
}

/** A verdict's outcome: the report is good, bad, or wonky (nobody can tell). */
export type Outcome = "good" | "bad" | "wonky";

/** V: a verdict's outcome, by how many of its judges said "valid": all, none, or a third. */
export function outcome(verdict: Verdict, judges: number): Outcome {
  const valid = verdict.votes.filter((vote) => vote.vote).length;
  if (valid === Math.floor((2 * judges) / 3) + 1) return "good";
  if (valid === 0) return "bad";
  return "wonky"; // ⌊judges / 3⌋ said "valid": no side won
}

/** Hashes as a set: sorted, the way the state keeps them. */
const sorted = (hashes: Bytes[]) => [...hashes].sort((a, b) => toHex(a).localeCompare(toHex(b)));

/** ψ′'s three sets: each judged report joins the set of its outcome. */
export function recordVerdicts(
  before: PastJudgements,
  judged: { target: Bytes; outcome: Outcome }[],
): PastJudgements {
  const after = { ...before };
  for (const set of ["good", "bad", "wonky"] as const) {
    const reports = judged.filter((j) => j.outcome === set).map((j) => j.target);
    after[set] = sorted([...before[set], ...reports]);
  }
  return after;
}
```

`PastJudgements` is ψ as a `record`, so it's C(5)'s codec too. `outcome` takes the
*judges'* number, not always V: a verdict from the previous epoch is counted against
λ's size. `recordVerdicts` copies ψ with `{ ...before }`, then rebuilds each set, sorted.
The sort compares hex strings, which sort in the same order as the bytes they spell.

**Run**

```sh
npm test
# prints: every vote is signed by its judge (tiny: full verdicts are 683 votes each)
# prints: each judged report joins the set of its verdict's outcome
# prints: a forged vote is caught
# prints: fail 0
# prints: reported
npm run typecheck
```

21 accepted blocks, every verdict recorded where it belongs: 10 on tiny, 11 on full.

A word on that last row of the table. `outcome` says *wonky* for any count that isn't
all or nothing, but the Gray Paper only allows exactly ⌊|K|/3⌋. A block whose votes
split any other way must be rejected. That's a check for the hardening pass, and lasair
has a story about it (below).

## Watch it

**New file** `bin/verdicts.ts`

```ts
// Shows each verdict in a disputes test vector: whose judges voted, how they voted, whether
// every vote is really theirs, and what the verdict decides.
// Usage: node bin/verdicts.ts <vector.json>, e.g.
//        node bin/verdicts.ts ../vectors/stf/disputes/tiny/progress_with_verdicts-4.json

import { readFileSync } from "node:fs";
import { DisputesExtrinsic } from "../src/block.ts";
import { toHex } from "../src/bytes.ts";
import { FULL, TINY } from "../src/config.ts";
import { judges, outcome, votesSigned } from "../src/disputes.ts";
import { Run } from "../src/obs.ts";
import { ValidatorKey } from "../src/state.ts";

const [file] = process.argv.slice(2);
const config = file.includes("/full/") ? FULL : TINY;
const { input, pre_state } = JSON.parse(readFileSync(file, "utf8"));
const keys = (list: unknown[]) => list.map((key) => ValidatorKey.fromJson(key));
const [active, previous] = [keys(pre_state.kappa), keys(pre_state.lambda)];
const run = new Run("verdicts");
for (const verdict of DisputesExtrinsic.fromJson(input.disputes).verdicts) {
  const judgeKeys = judges(config, pre_state.tau, verdict.age, active, previous);
  const set = judgeKeys === active ? "κ" : "λ";
  const valid = verdict.votes.filter((vote) => vote.vote).length;
  const votes = verdict.votes.length;
  const signed = votesSigned(verdict, judgeKeys);
  const decided = outcome(verdict, judgeKeys.length);
  const report = `${toHex(verdict.target).slice(0, 10)}…`;
  console.log(`report ${report}: ${valid} of ${votes} say valid, judged by ${set}`);
  console.log(`  every vote signed by its judge: ${signed}. The report is ${decided}.`);
  run.event("verdict", { report: verdict.target, set, valid, votes, signed, decided });
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/verdicts.ts ../vectors/stf/disputes/tiny/progress_with_verdicts-4.json
# prints: 5 of 5 say valid, judged by κ
# prints: The report is good.
# prints: The report is bad.
# prints: reported to Grafana
```

Two trials in one block: one report cleared, one condemned. Now try
`progress_with_bad_signatures-1.json`: `every vote signed by its judge: false`, a forged
vote. Then `progress_with_verdict_signatures_from_previous_set-1.json`, judged by λ. And
that report's hash, `0x0e5751c0…`, should ring a bell: it's the Blake2b of no bytes at
all, from lesson 5.1. Test vectors need report hashes from somewhere! The *Verdicts*
panel has every trial.

<details>
<summary>lasair: <code>classify_verdict</code>, in <code>conformance/disputes_stf.ml</code></summary>

```ocaml
let classify_verdict (k : validator_key list) (judgements : judgement_vote list) : verdict_result =
  let valid_count = List.length (List.filter (fun j -> j.is_valid) judgements) in
  if valid_count = verdict_threshold_for k then VerdictGood
  else if valid_count = 0 then VerdictBad
  else if valid_count = wonky_tally_for k then VerdictWonky
  else VerdictBadSplit
```

Four answers, not three: lasair rejects every other split as `VerdictBadSplit`. Its
comment tells why it's there. An older version treated *any* split as wonky, like your
`outcome` does today, and nobody noticed, because no test vector votes 3 of 5 or 342 of
683. A rule the vectors never exercise is a rule you have to read the Gray Paper for.

</details>

## What you have

A court clerk: every vote's signature checked against the right judges, every verdict
counted and filed in ψ.
