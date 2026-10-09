# The gas meter

Two lessons built the price list: what each instruction costs, and what each basic block
costs once the model CPU has run it. Now the meter that charges it. The rule is short and
strict: **pay for the whole block on the way in.** Not as you go, not afterwards. If the
gas for the block isn't there, not one instruction of it runs. A program that loops
forever? It pays at every lap, and sooner or later it can't.

## What the Gray Paper says

App. A.4, the start of Ψ₁. The machine carries its gas ϱ and a flag: has the basic block
it's in been paid for yet?

- **On a step, if the flag is off**, the block's cost ϱ^Δ (lesson 15.10) is due. With
  enough gas, it's paid and the flag goes on. Without enough, the machine stops with
  **oog**, out of gas, and nothing else changes: no instruction runs, and the gas stays
  as it was.
- **After a terminator** that carries on (a jump, a branch, a fallthrough), the flag goes
  off: wherever the machine lands is a new block, and the next step pays for it. A jump
  back to the start of the same block pays again. That's how a loop pays every lap.
- A host call doesn't reset it: `ecalli` isn't a terminator, so when the host is done, the
  rest of the block is already paid for.

## The tests

**Add to** `test/gas.test.ts`

```ts
import { runWithGas } from "../src/pvm/gas.ts";
import { newMachine } from "../src/pvm/machine.ts";
import { standardProgram } from "../src/pvm/standard.ts";

test("an endless loop runs out of gas: each lap pays 15, until there's too little", () => {
  const machine = newMachine(assemble([[40, 0]]), [], new Map(), 100n); // jump to itself
  assert.equal(runWithGas(machine), "oog");
  assert.equal(machine.gas, 10n); // six laps paid for, and 10 isn't enough for a seventh
});

test("a block is paid for in full before any of it runs", () => {
  const block = assemble([[51, 0x02, 7], [0]]); // load_imm r2, 7; trap: 2 gas
  const poor = newMachine(block, [], new Map(), 1n);
  assert.equal(runWithGas(poor), "oog");
  assert.equal(poor.registers[2], 0n); // not even the load_imm ran
  const rich = newMachine(block, [], new Map(), 2n);
  assert.equal(runWithGas(rich), "panic"); // the trap
  assert.deepEqual([rich.registers[2], rich.gas], [7n, 0n]);
});

test("the bootstrap service spends 243 gas to reach its first host call", () => {
  const code = unpackCode(bootstrapCode());
  const args = Uint8Array.from([1, 0, 0]); // slot 1, service 0, no inputs: each one byte
  const { memory, registers } = standardProgram(code, args);
  const machine = newMachine(deblob(code.program), registers, memory, 1000n);
  machine.pc = 5; // accumulation
  assert.deepEqual(runWithGas(machine), { host: 2 });
  assert.equal(machine.gas, 1000n - 243n);
});
```

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

The machine gets a purse: its gas, the flag, and a new way to stop.

**Replace in** `src/pvm/machine.ts`

```ts
/** How a step ends (GP's ε): carry on, finish, fail, run out of gas, fault, or call the host. */
export type Exit = "continue" | "halt" | "panic" | "oog" | { fault: number } | { host: number };

/** The machine's state: the program, ı, the registers ω, the memory μ, and its gas. */
export type Machine = {
  program: Program;
  pc: number;
  registers: bigint[];
  memory: Memory;
  blocks: Set<number>;
  gas: bigint; // ϱ: what's left to spend
  charged: boolean; // has the basic block it's in been paid for?
};

/** A machine at instruction 0: every register 0, no memory and no gas, unless given. */
export function newMachine(
  program: Program,
  registers: bigint[] = [],
  memory: Memory = new Map(),
  gas = 0n,
): Machine {
  const all = Array.from({ length: 13 }, (_, i) => registers[i] ?? 0n);
  const blocks = basicBlocks(program);
  return { program, pc: 0, registers: all, memory, blocks, gas, charged: false };
}
```

Gas is a `bigint`: a service's budget can be bigger than JavaScript's safe whole numbers.
It starts at 0, so all the machines from earlier lessons, which never pay, run as before.

**Add to** `src/pvm/gas.ts`

```ts
import type { Exit, Machine } from "./machine.ts";
import { step } from "./machine.ts";

/**
 * Ψ₁ with gas (GP App. A.4). A basic block is paid for in full on the way in, before any
 * of it runs. Without the gas for it, the machine stops "oog" (out of gas), as it was.
 */
export function stepWithGas(m: Machine): Exit {
  if (!m.charged) {
    const cost = BigInt(blockCost(m.program, m.pc));
    if (m.gas < cost) return "oog";
    m.gas -= cost;
    m.charged = true;
  }
  const opcode = m.program.code[m.pc];
  const exit = step(m);
  if (exit === "continue" && TERMINATORS.has(opcode)) m.charged = false; // a new block next
  return exit;
}

/** Ψ with gas: steps until the machine stops, or its gas runs out. */
export function runWithGas(m: Machine): Exit {
  for (;;) {
    const exit = stepWithGas(m);
    if (exit !== "continue") return exit;
  }
}
```

The meter wraps lesson 15.3's `step` rather than living inside it, so `machine.ts` never
needs `gas.ts` (which already needs `machine.ts`). `stepWithGas` notes the opcode before
stepping, because `step` moves ı on: afterwards, the question is whether the instruction
that just ran was a terminator.

**Run**

```sh
npm test
# prints: an endless loop runs out of gas: each lap pays 15, until there's too little
# prints: the bootstrap service spends 243 gas to reach its first host call
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**New file** `bin/gas.ts`

```ts
// Runs the bootstrap service from accumulation's entry point with a gas budget, and shows
// each basic block it pays for on the way to its first host call. Then again, short.
// Usage: node bin/gas.ts

import { readFileSync } from "node:fs";
import { fromHex } from "../src/bytes.ts";
import { Run } from "../src/obs.ts";
import { stepWithGas } from "../src/pvm/gas.ts";
import { newMachine } from "../src/pvm/machine.ts";
import { deblob, unpackCode } from "../src/pvm/program.ts";
import { standardProgram } from "../src/pvm/standard.ts";
import { serviceCode } from "../src/services.ts";
import type { KeyValue } from "../src/trie.ts";

const trace = JSON.parse(readFileSync("../vectors/traces/fallback/00000001.json", "utf8"));
const entries: KeyValue[] = trace.pre_state.keyvals.map((e: { key: string; value: string }) => ({
  key: fromHex(e.key),
  value: fromHex(e.value),
}));
const code = unpackCode(serviceCode(entries, 0)!);

const run = new Run("gas");
for (const budget of [1000n, 100n]) {
  const { memory, registers } = standardProgram(code, Uint8Array.from([1, 0, 0]));
  const machine = newMachine(deblob(code.program), registers, memory, budget);
  machine.pc = 5; // accumulation
  console.log(`with ${budget} gas:`);
  for (;;) {
    const [at, before] = [machine.pc, machine.gas];
    const exit = stepWithGas(machine);
    if (machine.gas !== before) {
      const paid = before - machine.gas;
      console.log(`  block at ${String(at).padStart(6)} costs ${paid}, leaving ${machine.gas}`);
      run.event("block", { budget: Number(budget), at, paid: Number(paid) });
    }
    if (exit !== "continue") {
      const spent = budget - machine.gas;
      console.log(`  stops: ${JSON.stringify(exit)} at ${machine.pc}, having spent ${spent}`);
      const stop = { budget: Number(budget), exit: JSON.stringify(exit), spent: Number(spent) };
      run.event("stop", stop);
      break;
    }
  }
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/gas.ts
# prints: block at  92078 costs 26, leaving 959
# prints: stops: {"host":2} at 121489, having spent 243
# prints: stops: "oog" at 121410, having spent 68
# prints: reported to Grafana
```

The same 38 steps as lesson 15.8, now in five payments: 15, 26 (lesson 15.10's block),
27, 73, and 102 for the last block, the one with `ecalli` in it: that instruction's 100
cycles are most of the bill. 243 in all. Then the same start on a budget of 100: three
blocks paid, 32 gas left, and the fourth costs 73. Out of gas, at the door of the block
it couldn't afford. The *Gas* panel has both runs.

<details>
<summary>lasair: paying for a block, in <code>lib/pvm.ml</code></summary>

```ocaml
    else if not !charged
         && (let cost = Int64.of_int (Pvm_gas.block_cost inf (Pvm_gas.block_start inf p)) in
             if Int64.compare !gas cost < 0 then true
             else (gas := Int64.sub !gas cost; charged := true; false))
    then exit := Some OutOfGas
```

The same check, in the middle of lasair's run loop. One difference: lasair prices
`block_start inf p`, the start of whichever block p is in (the Gray Paper's 𝔏). Your
meter prices the block starting at ı. That's the same thing whenever ı starts a block,
and so far it always does. A machine started in the middle of a block is a later story,
in `HARDENING.md`.

</details>

## What you have

A complete PVM: every instruction, memory, a real program's setup, host calls as a way
out, and gas, priced and charged the Gray Paper's way. Part 15, done. Next, the host
answers back.
