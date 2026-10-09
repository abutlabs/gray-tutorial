# Bad culprits and faults

Lesson 10.4 checked the verdicts. Now the accusations. A culprit says "this validator
vouched for a report that turned out bad", a fault says "this validator voted the wrong
way", and either one gets a validator punished. So they had better be true: about a real
validator, backed by that validator's own signature, and not about someone already
punished. This lesson writes down those rules, and with lesson 10.4's, your client's
disputes now agree with every disputes vector.

## New words

- **Evidence.** What makes an accusation stick: the accused's own signature. *Example:* a
  culprit carries the guarantee its validator signed; a fault, the vote.
- **Offenders (ψ_O).** The keys of every validator found guilty so far. Nobody is accused
  twice. *Example:* a culprit naming a key already in ψ_O sinks the block.
- **If and only if (⇔).** The Gray Paper's ⇔ says two things are true together or false
  together. *Example:* "the report is bad ⇔ the fault voted valid".

All three are in the [glossary](../glossary.md).

## What the Gray Paper says

§10 again, after the verdicts. ψ′ here means the judged sets *after* this block's verdicts
(lesson 10.1's `recordVerdicts`). Every culprit must keep four rules:

1. **In order.** Culprits sorted by key, no key twice. (`culprits_not_sorted_unique`)
2. **About a bad report.** Its report is in ψ′'s bad set. (`culprits_verdict_not_bad`)
3. **About a validator.** Its key is one of κ's or λ's (`bad_guarantor_key`), and not
   already an offender (`offender_already_reported`).
4. **With evidence.** Its signature is the validator's guarantee of that report (lesson
   10.2's `culpritSigned`). (`bad_signature`)

Every fault keeps the same kind of four, and two of its own:

5. **In order**, by key. (`faults_not_sorted_unique`)
6. **Against the verdict.** It voted valid on a report now judged bad, or invalid on one
   now judged good. (`fault_verdict_wrong`)
7. **About a validator**, not yet an offender (`bad_auditor_key`,
   `offender_already_reported`), **with evidence** (`faultSigned`, `bad_signature`).
8. **Every good verdict has a fault.** A dispute only starts when someone calls a report
   invalid. If it's judged good after all, that someone was wrong, and at least one fault
   must name the report. (`not_enough_faults`)

The Gray Paper writes rule 6 as a double ⇔: r ∈ ψ′_B ⇔ r ∉ ψ′_G ⇔ v. All three are true
together or false together, so a fault on a wonky report (neither bad nor good) fails it
too. A culprit is a guarantor, a fault an auditor, which is where the vectors' names
`bad_guarantor_key` and `bad_auditor_key` come from.

## The tests

**Add to** `test/disputes.test.ts`

```ts
import { disputesError } from "../src/disputes.ts";

/** What every disputes rule says of vector `name`: null (accepted) or the rule broken. */
function disputesVerdict(config: typeof TINY, name: string) {
  const { input, pre_state } = vectorJson(name) as DisputesVector;
  const keys = (list: unknown[]) => list.map((key) => ValidatorKey.fromJson(key));
  const disputes = DisputesExtrinsic.fromJson(input.disputes);
  const before = PastJudgements.fromJson(pre_state.psi);
  const [active, previous] = [keys(pre_state.kappa), keys(pre_state.lambda)];
  return disputesError(config, disputes, before, pre_state.tau, active, previous);
}

test("a fault must have voted against the verdict", () => {
  const name = "stf/disputes/tiny/progress_with_faults-7.json";
  assert.equal(disputesVerdict(TINY, name), "fault_verdict_wrong");
});

for (const { config, name } of VERDICT_VECTORS) {
  test(`${name}: accepted or refused, as the vector says`, () => {
    const { output } = vectorJson(name) as DisputesVector;
    assert.equal(disputesVerdict(config, name), output.err ?? null);
  });
}
```

This time no list of bad vectors is needed. `disputesError` runs every rule, lesson
10.4's and these, so its answer must be exactly the vector's: accepted, or the error the
vector names. The same vectors as lesson 10.4: every tiny one, and the full ones tiny
can't have.

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

**Add to** `src/disputes.ts`

```ts
/**
 * Are a block's culprits and faults valid (GP §10)? The first rule they break, under the
 * test vectors' name for it, or null. Its verdicts are taken as valid: `verdictError`
 * comes first.
 */
export function offenseError(
  config: Config,
  disputes: DisputesExtrinsic,
  before: PastJudgements, // ψ
  time: number,
  active: ValidatorKey[],
  previous: ValidatorKey[],
): string | null {
  const { verdicts, culprits, faults } = disputes;
  const judged = verdicts.map((v) => ({
    target: v.target,
    outcome: outcome(v, judges(config, time, v.age, active, previous).length),
  }));
  const after = recordVerdicts(before, judged); // ψ′
  const [bad, good] = [new Set(after.bad.map(toHex)), new Set(after.good.map(toHex))];
  const validators = new Set([...active, ...previous].map((k) => toHex(k.ed25519))); // κ ∪ λ
  const punished = new Set(before.offenders.map(toHex)); // ψ_O
  const byKey = (list: { key: Bytes }[]) =>
    list.every((x, i) => i === 0 || toHex(list[i - 1].key) < toHex(x.key));
  const known = (x: { key: Bytes }) => validators.has(toHex(x.key));
  const fresh = (x: { key: Bytes }) => !punished.has(toHex(x.key));
  const wrong = (f: Fault) => (f.vote ? bad : good).has(toHex(f.target)); // voted against it
  const faulted = (target: Bytes) => faults.some((f) => toHex(f.target) === toHex(target));
  if (!byKey(culprits)) return "culprits_not_sorted_unique";
  if (!culprits.every((c) => bad.has(toHex(c.target)))) return "culprits_verdict_not_bad";
  if (!culprits.every(known)) return "bad_guarantor_key";
  if (!culprits.every(fresh)) return "offender_already_reported";
  if (!culprits.every(culpritSigned)) return "bad_signature";
  if (!byKey(faults)) return "faults_not_sorted_unique";
  if (!faults.every(wrong)) return "fault_verdict_wrong";
  if (!faults.every(known)) return "bad_auditor_key";
  if (!faults.every(fresh)) return "offender_already_reported";
  if (!faults.every(faultSigned)) return "bad_signature";
  if (!judged.every((j) => j.outcome !== "good" || faulted(j.target))) return "not_enough_faults";
  return null;
}

/** Every disputes rule (GP §10): the verdicts' first (lesson 10.4), then the offenders'. */
export function disputesError(
  config: Config,
  disputes: DisputesExtrinsic,
  before: PastJudgements,
  time: number,
  active: ValidatorKey[],
  previous: ValidatorKey[],
): string | null {
  const verdicts = verdictError(config, disputes.verdicts, before, time, active, previous);
  return verdicts ?? offenseError(config, disputes, before, time, active, previous);
}
```

`offenseError` works out ψ′'s bad and good sets the way lesson 10.1 does, then the rules,
in the order above. `wrong` is rule 6 in one line: a fault that voted valid must name a
bad report, one that voted invalid a good report. `disputesError` puts the two lessons
together: the verdicts first, then the accusations.

**Run**

```sh
npm test
# prints: a fault must have voted against the verdict
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

`bin/check-disputes.ts` checks every rule now, and only mentions the vector when the two
disagree:

**Rewrite** `bin/check-disputes.ts`

```ts
// Checks the disputes of every disputes test vector of one size against the rules (the
// verdicts', then the culprits' and faults'), and shows each verdict next to the vector's:
// accepted, or the first rule broken.
// Usage: node bin/check-disputes.ts [tiny or full], tiny if not given

import { readdirSync, readFileSync } from "node:fs";
import { DisputesExtrinsic } from "../src/block.ts";
import { FULL, TINY } from "../src/config.ts";
import { disputesError, PastJudgements } from "../src/disputes.ts";
import { Run } from "../src/obs.ts";
import { ValidatorKey } from "../src/state.ts";

const config = process.argv[2] === "full" ? FULL : TINY;
const dir = `../vectors/stf/disputes/${config.name}`;
const keys = (list: unknown[]) => list.map((key) => ValidatorKey.fromJson(key));
const run = new Run("dispute-check");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const { input, pre_state, output } = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
  const disputes = DisputesExtrinsic.fromJson(input.disputes);
  const before = PastJudgements.fromJson(pre_state.psi);
  const [active, previous] = [keys(pre_state.kappa), keys(pre_state.lambda)];
  const error = disputesError(config, disputes, before, pre_state.tau, active, previous);
  const ours = error ?? "accepted";
  const theirs = output.err ?? "accepted";
  const name = file.replace(".json", "");
  console.log(`${name}: ${ours}${ours === theirs ? "" : ` (the vector says ${theirs})`}`);
  run.event("vector", { name, ours, theirs, agree: ours === theirs });
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/check-disputes.ts
# prints: progress_with_faults-7: fault_verdict_wrong
# prints: progress_with_invalid_keys-2: bad_auditor_key
```

Twenty-nine vectors and not one "the vector says": your client's disputes agree with all
of them. `node bin/check-disputes.ts full` says the same of the full ones (give it a
minute). The *Dispute checks* panel keeps the list.

<details>
<summary>lasair: rule 6 word for word, in <code>conformance/disputes_stf.ml</code></summary>

```ocaml
    let fault_consistent (f : fault) =
      let in_bad = List.exists (Bytes.equal f.target) psi_after_verdicts.bad in
      let not_good = not (List.exists (Bytes.equal f.target) psi_after_verdicts.good) in
      in_bad = not_good && not_good = f.vote in
```

lasair copies the Gray Paper's double ⇔ term by term: in the bad set, equals not in the
good set, equals the vote. Your `wrong` says the same in fewer words, because it leans on
one more fact: a report is never judged both good and bad. Both ways, a fault on a wonky
report is refused.

</details>

## What you have

The whole court, checked: every verdict, culprit and fault in a block follows the rules,
and every disputes vector is accepted or refused just as it should be.

Next: [Part 11 · Assurances](../11-assurances/index.md)
