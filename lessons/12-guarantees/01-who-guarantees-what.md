# Who guarantees what

Work arrives at JAM as work-packages, and every package needs *guarantors*: validators
who run it, sign the resulting report, and put their stake behind it. But which
validators get which core? If you could pick, you'd pick your friends. So JAM deals them
out: three validators per core, shuffled with randomness nobody could steer ([lesson
7.2](../07-time-and-shuffling/02-the-shuffle.md)), and reshuffled along every few slots so nobody stays on one core for long. This
lesson deals the hand.

## New words

- **Guarantor.** A validator who runs a work-package and signs the report, vouching for
  it with its stake. *Example:* three guarantors per core.
- **Rotation.** Every R slots, the guarantors move on to the next core: 4 slots on tiny,
  10 on full. *Example:* on tiny, slots 12 to 15 are one rotation.
- **Active core.** One of the cores the current validators can staff, three guarantors
  apiece: the first |κ′|/3 of them. *Example:* 6 validators keep 2 cores active.

All three are in the [glossary](../glossary.md).

## What the Gray Paper says

§11 (*Guarantor Assignments*). With v validators, only the first v/3 cores are
*active cores*: three *guarantors* each. P(v, e, t), the core of each validator at slot t:

1. Start with the seats: validator i gets core ⌊i/3⌋, so `0 0 0 1 1 1 2 2 2 …`.
2. **Shuffle** them ([lesson 7.2](../07-time-and-shuffling/02-the-shuffle.md)) with entropy e.
3. **Rotate**: every R slots, a new *rotation*: everyone moves on one core, wrapping
   round the active cores. At slot t, that's ⌊(t mod E)/R⌋ moves since the epoch began.

**M**, this rotation's assignment, is P(|κ′|, η′₂, τ′) with the keys of κ′, offenders
zeroed by [lesson 8.2](../08-safrole/02-rotating-the-validators.md)'s Φ. η′₂, not η′₁, says the Gray Paper: randomness from two epochs
back, which no fork at the end of the last epoch can disagree about.

**M\***, the *last* rotation's, is P at τ′ − R. If τ′ − R falls in the same epoch, it
uses κ′ and η′₂ again; if it's in the previous epoch, λ′ and η′₃, that epoch's own
validators and randomness.

**Which applies?** A guarantee carries the slot it was made at. If that slot is in the
same rotation as the block (⌊τ′/R⌋ = ⌊t/R⌋), its signers must be assigned by M,
otherwise by M\*. A guarantee made just before a rotation still counts in the next.

## The size grows, once more

R is 10 slots on full and 4 on tiny:

**Replace in** `src/config.ts`

```ts
/** The protocol constants that depend on the size of the network. */
export type Config = {
  name: string;
  validators_count: number; // V: validators in a set
  core_count: number; // C: cores doing work in parallel
  epoch_length: number; // E: timeslots in an epoch
  epoch_tail_start: number; // Y: the slot of an epoch at which the ticket lottery closes
  rotation_period: number; // R: slots between reshuffles of the guarantors
};

export const TINY: Config = {
  name: "tiny",
  validators_count: 6,
  core_count: 2,
  epoch_length: 12,
  epoch_tail_start: 10,
  rotation_period: 4,
};

export const FULL: Config = {
  name: "full",
  validators_count: 1023,
  core_count: 341,
  epoch_length: 600,
  epoch_tail_start: 500,
  rotation_period: 10,
};
```

## The tests

**New file** `test/guarantors.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { GuaranteesExtrinsic } from "../src/block.ts";
import { fromHex } from "../src/bytes.ts";
import type { Config } from "../src/config.ts";
import { FULL, TINY } from "../src/config.ts";
import { assignCores, assignmentFor, guarantorAssignments } from "../src/guarantors.ts";
import { ValidatorKey } from "../src/state.ts";
import { vectorFiles, vectorJson } from "./vectors.ts";

test("P: three guarantors per core, and every R slots they all move on one core", () => {
  const e = new Uint8Array(32).fill(7); // any entropy will do
  const now = assignCores(TINY, 6, e, 0);
  assert.deepEqual([0, 1].map((core) => now.filter((c) => c === core).length), [3, 3]);
  const next = assignCores(TINY, 6, e, 4); // R = 4 slots later, on tiny
  assert.deepEqual(next, now.map((core) => (core + 1) % 2));
});

/** A reports test vector: the parts of it this lesson uses. */
type ReportsVector = {
  input: { guarantees: unknown[]; slot: number };
  pre_state: {
    curr_validators: unknown[];
    prev_validators: unknown[];
    entropy: string[];
    offenders: string[];
  };
  output: { err?: string };
};

/** For each guarantee in a reports vector: its report's core, and the signers' cores. */
function signerCores(config: Config, vector: ReportsVector) {
  const { input, pre_state } = vector;
  const keys = (list: unknown[]) => list.map((key) => ValidatorKey.fromJson(key));
  const assignments = guarantorAssignments(
    config,
    input.slot,
    pre_state.entropy.map(fromHex),
    keys(pre_state.curr_validators),
    keys(pre_state.prev_validators),
    pre_state.offenders.map(fromHex),
  );
  return GuaranteesExtrinsic.fromJson(input.guarantees).map((guarantee) => {
    const { cores } = assignmentFor(config, input.slot, guarantee.slot, assignments);
    const signers = guarantee.signatures.map((s) => cores[s.validator_index]);
    return { core: guarantee.report.core_index, signers };
  });
}

test("every guarantor of every accepted report is assigned to that report's core", () => {
  let signatures = 0;
  for (const config of [TINY, FULL]) {
    for (const name of vectorFiles(`stf/reports/${config.name}`)) {
      const vector = vectorJson(name) as ReportsVector;
      if (vector.output.err) continue; // a rejected block changes nothing
      for (const { core, signers } of signerCores(config, vector)) {
        for (const signer of signers) assert.equal(signer, core, name);
        signatures += signers.length;
      }
    }
  }
  assert.equal(signatures, 130); // 62 on tiny, 68 on full
});

test("a guarantor from another core is caught", () => {
  const vector = vectorJson("stf/reports/tiny/wrong_assignment-1.json") as ReportsVector;
  const [{ core, signers }] = signerCores(TINY, vector);
  assert.ok(signers.some((signer) => signer !== core));
});
```

The first test checks P's two promises without any vectors: three guarantors for each
core, and one rotation later, everyone one core along. The second checks every signer of
every accepted guarantee, 130 of them, against M or M\*.

**Run, expect it to fail**

```sh
npm test
```

```text
...
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/client/src/guarantors.ts' imported from …/client/test/guarantors.test.ts
...
✖ test/guarantors.test.ts (335.0ms)
...
ℹ tests 186
ℹ suites 0
ℹ pass 185
ℹ fail 1
...
```

Red: `src/guarantors.ts` doesn't exist yet. P, M and M\*, and the choice between them
lean on one another, so they come as one file, and the next Run turns all three tests
green.

## The code

**New file** `src/guarantors.ts`

```ts
// Guarantor assignments (GP §11): which validators may guarantee work for which core.
// Three per core, dealt out by a shuffle, and moved on to the next core every R slots.

import type { Bytes } from "./bytes.ts";
import type { Config } from "./config.ts";
import { epochOf } from "./epoch.ts";
import { withoutOffenders } from "./safrole.ts";
import { shuffleWithHash } from "./shuffle.ts";
import type { ValidatorKey } from "./state.ts";

/** P (GP §11): the core each of v validators guarantees at a slot, dealt with entropy e. */
export function assignCores(config: Config, v: number, e: Bytes, slot: number): number[] {
  const seats = Array.from({ length: v }, (_, i) => Math.floor(i / 3)); // 0 0 0 1 1 1 2 …
  const shuffled = shuffleWithHash(seats, e);
  const turns = Math.floor((slot % config.epoch_length) / config.rotation_period);
  const activeCores = v / 3;
  return shuffled.map((core) => (core + turns) % activeCores); // R: everyone moves on
}

/** An assignment (GP's M): each validator's core, and the validators' keys (offenders out). */
export type Assignment = { cores: number[]; keys: ValidatorKey[] };

/** M and M*: the guarantors of this rotation, and of the one before it. */
export function guarantorAssignments(
  config: Config,
  slot: number, // τ′
  entropy: Bytes[], // η′
  active: ValidatorKey[], // κ′
  previous: ValidatorKey[], // λ′
  offenders: Bytes[], // ψ′_O
): { current: Assignment; last: Assignment } {
  const assignment = (keys: ValidatorKey[], e: Bytes, at: number): Assignment => ({
    cores: assignCores(config, keys.length, e, at),
    keys: withoutOffenders(keys, offenders),
  });
  const then = slot - config.rotation_period; // a slot in the last rotation
  const sameEpoch = epochOf(config, then) === epochOf(config, slot);
  return {
    current: assignment(active, entropy[2], slot),
    last: sameEpoch ? assignment(active, entropy[2], then) : assignment(previous, entropy[3], then),
  };
}

/** Which assignment a guarantee made at `made` answers to, in a block at `slot`. */
export function assignmentFor(
  config: Config,
  slot: number,
  made: number,
  assignments: { current: Assignment; last: Assignment },
): Assignment {
  const R = config.rotation_period;
  return Math.floor(slot / R) === Math.floor(made / R) ? assignments.current : assignments.last;
}
```

`assignCores` is the Gray Paper's P in three lines, seats, shuffle, rotate:

```ts
  const seats = Array.from({ length: v }, (_, i) => Math.floor(i / 3)); // 0 0 0 1 1 1 2 …
  const shuffled = shuffleWithHash(seats, e);
  return shuffled.map((core) => (core + turns) % activeCores); // R: everyone moves on
```

The rotation is `% activeCores`, not `% C`: on a network with fewer validators than usual, guarantors
only ever rotate among the cores that have any. `guarantorAssignments` builds both M and
M\* at once, and `assignmentFor` picks the one a guarantee answers to.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ P: three guarantors per core, and every R slots they all move on one core (6.9ms)
✔ every guarantor of every accepted report is assigned to that report's core (2296.7ms)
✔ a guarantor from another core is caught (0.9ms)
...
ℹ tests 188
ℹ suites 0
ℹ pass 188
ℹ fail 0
...
reported 188 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791734292556
...
```

## Watch it

**New file** `bin/guarantors.ts`

```ts
// Shows who guarantees which core in a reports test vector, this rotation and the last,
// and checks each guarantee's signers against the assignment it answers to.
// Usage: node bin/guarantors.ts <vector.json>, e.g.
//        node bin/guarantors.ts ../vectors/stf/reports/tiny/report_prev_rotation-1.json

import { readFileSync } from "node:fs";
import { GuaranteesExtrinsic } from "../src/block.ts";
import { fromHex } from "../src/bytes.ts";
import { FULL, TINY } from "../src/config.ts";
import type { Assignment } from "../src/guarantors.ts";
import { assignmentFor, guarantorAssignments } from "../src/guarantors.ts";
import { Run } from "../src/obs.ts";
import { ValidatorKey } from "../src/state.ts";

const [file] = process.argv.slice(2);
const config = file.includes("/full/") ? FULL : TINY;
const { input, pre_state } = JSON.parse(readFileSync(file, "utf8"));
const keys = (list: unknown[]) => list.map((key) => ValidatorKey.fromJson(key));
const assignments = guarantorAssignments(
  config,
  input.slot,
  pre_state.entropy.map(fromHex),
  keys(pre_state.curr_validators),
  keys(pre_state.prev_validators),
  pre_state.offenders.map(fromHex),
);
const run = new Run("guarantors");

/** Each core's guarantors in an assignment, as validator indices. */
function byCore(assignment: Assignment): string {
  const cores = [...new Set(assignment.cores)].sort((a, b) => a - b);
  const seats = (core: number) => assignment.cores.flatMap((c, v) => (c === core ? [v] : []));
  return cores.map((core) => `core ${core}: ${seats(core).join(" ")}`).join(" | ");
}
console.log(`slot ${input.slot}, rotation ${Math.floor(input.slot / config.rotation_period)}`);
console.log(`  this rotation: ${byCore(assignments.current)}`);
console.log(`  the last one:  ${byCore(assignments.last)}`);
for (const guarantee of GuaranteesExtrinsic.fromJson(input.guarantees)) {
  const assignment = assignmentFor(config, input.slot, guarantee.slot, assignments);
  const which = assignment === assignments.current ? "this rotation" : "the last rotation";
  const signers = guarantee.signatures.map((s) => s.validator_index);
  const core = guarantee.report.core_index;
  const assigned = signers.every((v) => assignment.cores[v] === core);
  console.log(`guarantee for core ${core}, made at slot ${guarantee.slot} (${which}):`);
  console.log(`  signed by ${signers.join(", ")}: all assigned to core ${core}? ${assigned}`);
  const made = guarantee.slot;
  run.event("guarantee", { core, made, which, signers: signers.join(" "), assigned });
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/guarantors.ts ../vectors/stf/reports/tiny/report_prev_rotation-1.json
```

```text
slot 14, rotation 3
  this rotation: core 0: 1 4 5 | core 1: 0 2 3
  the last one:  core 0: 1 2 5 | core 1: 0 3 4
guarantee for core 0, made at slot 10 (the last rotation):
  signed by 1, 2, 5: all assigned to core 0? true
reported to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=guarantors-1791734301753
```

The block is at slot 14, but the guarantee was made at slot 10, in the last rotation.
Validator 2 has since moved to core 1, yet its signature for core 0 still counts,
because back then core 0 was its job. (And slot 10 was in the *previous epoch*, so
the last rotation's hand was dealt from λ′ with η′₃.) Now try `wrong_assignment-1.json`:
the same validator 2 signs for core 0 *this* rotation, where it belongs to core 1, and
it's caught. The *Guarantors* panel shows each guarantee's check.

![Guarantors panel](./images/01-guarantors.png)

<details>
<summary>lasair: <code>guarantor_assignment</code>, in <code>conformance/stf_guarantees.ml</code></summary>

```ocaml
let guarantor_assignment ~(v : int) ~(entropy : bytes) ~(slot : int) : int array =
  let active = max 1 (v / 3) in
  let base = Array.init v (fun i -> i / 3) in
  let shuffled = Lasair.Utilities.shuffle_array_with_hash base entropy in
  let n = (slot mod Stf_config.epoch_length ()) / Stf_config.rotation_period () in
  Array.map (fun c -> (c + n) mod active) shuffled
```

Your `assignCores`, line for line: seats, shuffle, turns, rotate among the active cores.
lasair's comment adds something worth knowing: both its block importer *and* its own
guarantor, when it makes guarantees itself, use this one function. A client that checks
guarantees and a client that makes them had better deal the same hand.

</details>

## What you have

The guarantor deal: who may vouch for which core, this rotation and the last, checked
against every guarantee in the vectors. Being assigned isn't the same as having signed,
though: [lesson 12.2](./02-signed-and-counted.md) checks the signatures.

Next: [12.2 Signed and counted](./02-signed-and-counted.md)
