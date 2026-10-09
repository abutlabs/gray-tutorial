# Waiting reports

Some work can't go until other work has gone. A report can name *prerequisites*: other
work-packages that must be accumulated first. Lesson 17.1 left those reports out. This
lesson gives them somewhere to wait, a way to know when they're free, and the bookkeeping
that keeps both straight from block to block. Seven more official vectors pass, every one
of them about waiting.

## New words

- **Dependency.** Anything a report waits for: its prerequisites, and any work-packages
  named by its segment-root lookups. *Example:* report D depends on package A.
- **Ready queue.** ω. Where reports with dependencies wait: one list for each slot of an
  epoch, used like a ring. *Example:* a report arriving at slot 43 on tiny waits in list
  43 mod 12 = 7.
- **Accumulated history.** ξ. For each of the last E slots, the set of work-packages that
  were accumulated in it. *Example:* after slot 44, its newest set holds A and D.
- **Unlock.** A waiting report is free to go once its last dependency has been accumulated,
  possibly earlier in the very same block. *Example:* A accumulates, so D, waiting for A,
  goes right after it.

All four are in the [glossary](../glossary.md).

## What the Gray Paper says

§12's *History and Queuing*, in plain steps:

1. **Sort the new reports.** Those with no dependencies go now, as in 17.1. Each of the
   others joins the waiters with its set of dependencies, minus any package the history
   says is already done.
2. **Line up everyone waiting.** The reports already in the queue, read around the ring
   starting from this block's slot, then the new waiters. Take out what the reports going
   now have just done.
3. **Unlock, again and again.** Every waiter with nothing left to wait for goes; their
   packages are now done, which may free others; repeat until nothing more is free.
4. **Accumulate** the reports going now, then the unlocked ones in that order, in one
   round (lesson 17.1).
5. **Remember.** The history moves on one slot: the oldest set drops off, and a new set
   with everything just accumulated goes on the end. The queue's list for this slot gets
   this block's new waiters, and every other list loses whatever is now done. Lists for
   slots the chain skipped since the last block are emptied: their reports have waited a
   whole epoch, and are given up.

The Gray Paper's names: the history is **ξ** (its union **ξ∪**), the queue **ω**, the new
waiters **R^Q**, a report's dependencies **D(r)**. Taking done packages out of a queue is
**E**, the unlocking loop is **Q**, the hashes of some reports **P**. Everything that goes
this block is **R\* = R! ⌢ Q(q)**. The queue's list for this block is ω[τ′ mod E].

## The tests

The vector checks now cover the queue and the history too, and seven more vectors join:

**Replace in** `test/accumulate.test.ts`

```ts
/** A vector's work-reports, decoded. */
const reportsOf = (vector: { input: { reports: unknown[] } }) =>
  vector.input.reports.map((r) => WorkReport.fromJson(r));

/** Checks the whole block of test vector `name`: accounts, statistics, queue and history. */
function checkBlock(name: string) {
  const vector = vectorJson(`stf/accumulate/tiny/${name}.json`) as BlockVector;
  const before = accumulationStateFromJson(vector.pre_state);
  const { state, statistics } = accumulateBlock(TINY, before, vector.input.slot, reportsOf(vector));
  const expected = accumulationStateFromJson(vector.post_state);
  assert.deepEqual(state.accounts, expected.accounts);
  assert.deepEqual(state.ready, expected.ready);
  assert.deepEqual(state.accumulated, expected.accumulated);
  const stats = vector.post_state.statistics.map(({ id, record: r }) => {
    const gasUsed = BigInt(r.accumulate_gas_used);
    return [id, { count: r.accumulate_count, transfers: r.accumulate_transfer_count, gasUsed }];
  });
  assert.deepEqual(statistics, new Map(stats as [number, unknown][]));
}

/** The vectors whose whole block needs nothing beyond this lesson. */
const BLOCK_CASES = [
  "accumulate_ready_queued_reports-1", "always_accumulate-1", "always_accumulate-2",
  "enqueue_and_unlock_chain-1", "enqueue_and_unlock_chain-2", "enqueue_and_unlock_chain-3",
  "enqueue_and_unlock_chain-4", "enqueue_and_unlock_chain_wraps-1",
  "enqueue_and_unlock_chain_wraps-2", "enqueue_and_unlock_chain_wraps-3",
  "enqueue_and_unlock_chain_wraps-4", "enqueue_and_unlock_chain_wraps-5",
  "enqueue_and_unlock_simple-1", "enqueue_and_unlock_simple-2",
  "enqueue_and_unlock_with_sr_lookup-1", "enqueue_and_unlock_with_sr_lookup-2",
  "enqueue_self_referential-1", "enqueue_self_referential-2", "enqueue_self_referential-3",
  "enqueue_self_referential-4", "lookup_foreign_preimage-1", "lookup_foreign_preimage-2",
  "no_available_reports-1", "preimage_len_bound-1", "preimage_len_bound-2",
  "preimage_len_bound-3", "process_one_immediate_report-1", "queues_are_shifted-1",
  "queues_are_shifted-2", "ready_queue_editing-1", "ready_queue_editing-2",
  "ready_queue_editing-3", "same_code_different_services-1", "same_round_storage_isolation-1",
  "same_round_storage_isolation-2", "work_for_ejected_service-1",
];
```

**Add to** `test/accumulate.test.ts`

```ts
import type { AccumulationStateJson } from "../src/accumulate.ts";
import { accumulationStateFromJson } from "../src/accumulate.ts";

/** A whole accumulate test vector: the input, the state before and after. */
type BlockVector = {
  input: { slot: number; reports: unknown[] };
  pre_state: AccumulationStateJson;
  post_state: AccumulationStateJson & { statistics: Vector["post_state"]["statistics"] };
};

test("a report waiting for package A goes in the same block as A", () => {
  const vector = vectorJson("stf/accumulate/tiny/enqueue_and_unlock_simple-2.json") as BlockVector;
  const before = accumulationStateFromJson(vector.pre_state);
  assert.equal(before.ready.flat().length, 1); // D waits for A
  const [a] = reportsOf(vector); // the block brings A, which waits for nothing
  const { state } = accumulateBlock(TINY, before, vector.input.slot, [a]);
  assert.equal(state.ready.flat().length, 0); // D has gone
  assert.equal(state.accumulated.at(-1)!.size, 2); // A and D, both accumulated now
});
```

`enqueue_and_unlock_simple-2` is the whole lesson in one vector: D has been waiting since
slot 43 for package A; the block at slot 44 brings A; both go.

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

First the pieces: lesson 17.1's round on its own, the queue's two operations, the state a
block's accumulation works on, and a reader for the vectors' version of it:

**Add to** `src/accumulate.ts`

```ts
import { fromHex } from "./bytes.ts";
import { WorkReport } from "./work.ts";
import type { AccountJson } from "./services.ts";
import { accountFromJson } from "./services.ts";

/**
 * Δ* (GP §12), one round: every service with work in `reports`, and every always-accumulate
 * service, runs once from the same accounts and keeps its own account as its run leaves it.
 * Returns the accounts after the round, and the gas each service used.
 */
export function accumulateRound(
  config: Config,
  accounts: Map<number, Account>,
  free: Map<number, bigint>, // χ_Z: the services that accumulate every block, and their gas
  entropy: Bytes,
  slot: number,
  reports: WorkReport[],
) {
  const digests = reports.flatMap((r) => r.results);
  const services = new Set([...free.keys(), ...digests.map((d) => d.service_id)]);
  const after = copyAccounts(accounts);
  const used = new Map<number, bigint>();
  for (const s of services) {
    const account = accounts.get(s);
    const code = account && codeOf(account);
    if (!code) {
      used.set(s, 0n); // no code to run (or no such service): no gas used
      continue;
    }
    const { inputs, gas } = serviceInputs(reports, s, free.get(s) ?? 0n);
    const mine = copyAccounts(accounts); // every service starts from the same accounts
    const checkpoint = copyAccounts(accounts);
    const a = { id: s, accounts: mine, checkpoint, code, entropy, inputs };
    const result = accumulate(config, a, slot, gas);
    after.set(s, result.accounts.get(s)!);
    used.set(s, result.gasUsed);
  }
  return { accounts: after, used };
}

/** A report in the ready queue (GP §12, ω), and the packages it still waits for, in hex. */
export type Waiting = { report: WorkReport; dependencies: Set<string> };

/** A report's work-package hash, in hex. */
const packageOf = (r: WorkReport) => toHex(r.package_spec.hash);

/** E (GP §12): the queue without the reports whose packages are done, and without the done
 * packages in what the rest wait for. */
export function edit(queue: Waiting[], done: Set<string>): Waiting[] {
  return queue
    .filter((w) => !done.has(packageOf(w.report)))
    .map((w) => ({
      report: w.report,
      dependencies: new Set([...w.dependencies].filter((d) => !done.has(d))),
    }));
}

/** Q (GP §12): the reports the queue lets go now, in order: those waiting for nothing,
 * then the ones they free up, and so on, until nothing more is free. */
export function unlock(queue: Waiting[]): WorkReport[] {
  const out: WorkReport[] = [];
  for (;;) {
    const free = queue.filter((w) => w.dependencies.size === 0).map((w) => w.report);
    if (free.length === 0) return out;
    out.push(...free);
    queue = edit(queue, new Set(free.map(packageOf)));
  }
}

/** What a block's accumulation reads from the state, and gives back changed (GP §12). */
export type AccumulationState = {
  slot: number; // τ: the slot of the block before
  accounts: Map<number, Account>; // δ
  free: Map<number, bigint>; // χ_Z
  entropy: Bytes; // η′₀
  ready: Waiting[][]; // ω: for each slot of an epoch, the reports that wait
  accumulated: Set<string>[]; // ξ: for each of the last E slots, the packages accumulated
};

/** A block's accumulation state, as the accumulate test vectors write it. */
export type AccumulationStateJson = {
  slot: number;
  entropy: string;
  accounts: { id: number; data: AccountJson }[];
  privileges: { always_acc: { id: number; gas: number }[] };
  ready_queue: { report: unknown; dependencies: string[] }[][];
  accumulated: string[][];
};

/** An AccumulationState from the accumulate test vectors' JSON. */
export function accumulationStateFromJson(json: AccumulationStateJson): AccumulationState {
  const waiting = (w: { report: unknown; dependencies: string[] }) => ({
    report: WorkReport.fromJson(w.report),
    dependencies: new Set(w.dependencies),
  });
  return {
    slot: json.slot,
    accounts: new Map(json.accounts.map((a) => [a.id, accountFromJson(a.data)])),
    free: new Map(json.privileges.always_acc.map((x) => [x.id, BigInt(x.gas)])),
    entropy: fromHex(json.entropy),
    ready: json.ready_queue.map((slot) => slot.map(waiting)),
    accumulated: json.accumulated.map((hashes) => new Set(hashes)),
  };
}
```

`edit` and `unlock` are the Gray Paper's E and Q, nearly word for word. Hashes travel as
hex strings in `Set`s, so "is this package done?" is a plain `has`.

Then the block, which takes the whole state now and gives back the new one:

**Replace in** `src/accumulate.ts`

```ts
/**
 * A block's accumulation (GP §12): the reports that can go now (R!, then what they and
 * the history unlock from the queue: R*) accumulate in one round. Every service that did
 * anything gets its statistics and its last-accumulation slot; the history ξ moves on one
 * slot, and the reports still waiting go back into the queue ω.
 */
export function accumulateBlock(
  config: Config,
  state: AccumulationState,
  slot: number, // τ′
  reports: WorkReport[], // the reports that just became available
) {
  const E = config.epoch_length;
  const waits = (r: WorkReport) =>
    r.context.prerequisites.length > 0 || r.segment_root_lookup.length > 0;
  const dependencies = (r: WorkReport) => [
    ...r.context.prerequisites,
    ...r.segment_root_lookup.map((l) => l.work_package_hash),
  ];
  const history = new Set(state.accumulated.flatMap((x) => [...x])); // ξ∪
  const now = reports.filter((r) => !waits(r)); // R!
  const fresh = reports.filter(waits).map((r) => ({
    report: r,
    dependencies: new Set(dependencies(r).map(toHex)),
  }));
  const queued = edit(fresh, history); // R^Q
  const m = slot % E;
  const ring = [...state.ready.slice(m), ...state.ready.slice(0, m)].flat();
  const all = [...now, ...unlock(edit([...ring, ...queued], new Set(now.map(packageOf))))];

  const { accounts, used } = accumulateRound(
    config, state.accounts, state.free, state.entropy, slot, all,
  );
  const digests = all.flatMap((r) => r.results);
  const statistics = new Map<number, AccumulationStats>();
  for (const [s, gasUsed] of used) {
    const count = digests.filter((d) => d.service_id === s).length;
    if (count === 0 && gasUsed === 0n) continue;
    statistics.set(s, { count, transfers: 0, gasUsed });
    const account = accounts.get(s);
    if (account) account.info.last_accumulation_slot = slot;
  }

  const done = new Set(all.map(packageOf));
  const accumulated = [...state.accumulated.slice(1), done]; // ξ′: newest last
  const ready: Waiting[][] = []; // ω′, slot by slot back from m
  for (let i = 0; i < E; i++) {
    const at = (m - i + E) % E;
    if (i === 0) ready[at] = edit(queued, done); // this block's newcomers
    else if (i < slot - state.slot) ready[at] = []; // slots the chain skipped: emptied
    else ready[at] = edit(state.ready[at], done);
  }
  const after = { ...state, slot, accounts, ready, accumulated };
  return { state: after, statistics };
}
```

The five steps are in order. The ring is read from this block's slot round to the one
before it; afterwards, `at` walks back from this block's slot, one list at a time.

The bin uses the block too, so it changes with it:

**Rewrite** `bin/accumulate.ts`

```ts
// Accumulates a test vector's block the way Part 17 does so far, and shows the queue: what
// waited, which packages went, what still waits; then each service next to the vector.
// Usage: node bin/accumulate.ts [vector], enqueue_and_unlock_simple-2 if not given

import { readFileSync } from "node:fs";
import { accumulateBlock, accumulationStateFromJson } from "../src/accumulate.ts";
import { TINY } from "../src/config.ts";
import { Run } from "../src/obs.ts";
import { WorkReport } from "../src/work.ts";

type Stat = { id: number; record: { accumulate_count: number; accumulate_gas_used: number } };

const DEFAULT = "../vectors/stf/accumulate/tiny/enqueue_and_unlock_simple-2.json";
const vector = JSON.parse(readFileSync(process.argv[2] ?? DEFAULT, "utf8"));
const before = accumulationStateFromJson(vector.pre_state);
const reports = vector.input.reports.map((r: unknown) => WorkReport.fromJson(r));
const slot = vector.input.slot;
const { state, statistics } = accumulateBlock(TINY, before, slot, reports);

const run = new Run("accumulate");
const short = (hash: string) => hash.slice(0, 10);
const went = [...state.accumulated.at(-1)!].map(short);
console.log(`slot ${slot}: ${reports.length} new report(s), ${before.ready.flat().length} waiting`);
console.log(`accumulated: ${went.join(", ") || "nothing"}`);
console.log(`still waiting: ${state.ready.flat().length}`);
run.event("block", { slot, went: went.join(", "), waiting: state.ready.flat().length });
for (const [s, { count, gasUsed }] of statistics) {
  const theirs = (vector.post_state.statistics as Stat[]).find((x) => x.id === s)?.record;
  console.log(`service ${s}: ${count} digest(s), ${gasUsed} gas`);
  const said = `${theirs?.accumulate_count} digest(s), ${theirs?.accumulate_gas_used} gas`;
  console.log(`  the vector says: ${said}`);
  const expected = theirs?.accumulate_gas_used;
  run.event("service", { s, count, used: Number(gasUsed), expected });
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
npm test
# prints: a report waiting for package A goes in the same block as A
# prints: enqueue_and_unlock_chain-4: the block ends as the vector says
# prints: fail 0
# prints: reported
npm run typecheck
```

Thirty-six official vectors now end exactly as their post-states say: every account, every
statistic, the ready queue and the history.

## Watch it

**Run**

```sh
node bin/accumulate.ts
# prints: slot 44: 1 new report(s), 1 waiting
# prints: accumulated: 0x9aa14535, 0xd97d7965
# prints: still waiting: 0
# prints: reported to Grafana
```

A comes in, D was waiting for it, both go, nobody's left waiting, and service 1729's two
digests use exactly the vector's gas. Try the chains:
`node bin/accumulate.ts ../vectors/stf/accumulate/tiny/enqueue_and_unlock_chain-4.json`.
The *Accumulate* panel shows each block's line, then its services.

<details>
<summary>lasair: unlocking, in <code>conformance/accumulate_stf.ml</code></summary>

```ocaml
  let rec resolve_ready (items : ready_item list) (known : bytes list) : ready_item list =
    (* First, edit all items' deps to remove those that are known *)
    let edited_items = List.map (fun item -> edit_item_deps item known) items in
    (* Find items with no remaining dependencies *)
    let (ready, pending) = List.partition (fun item ->
      List.length item.ri_dependencies = 0
    ) edited_items in
    if List.length ready = 0 then
      [] (* No more items can become ready *)
    else begin
      (* Add ready items' hashes to known set and recurse *)
      let new_known = List.map get_package_hash ready in
      let more_ready = resolve_ready pending new_known in
      ready @ more_ready
    end
```

lasair's Q, written the way the Gray Paper writes it: take what's free, then call itself on
the rest with the newly done packages. Your `unlock` is the same recursion as a loop.

</details>

## What you have

Reports that wait for each other, unlocked in the right order, and a queue and history
that match 36 official vectors.
