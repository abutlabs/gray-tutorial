# Branches and calls

Programs make choices (*if the balance is too low, stop*), and they call functions and
come back. Lesson 15.3 gave your machine the two simplest choices, equal and not equal.
This lesson completes the set of sixteen branches, and adds the two instructions for a
call. One question runs right through it: is −1 less than 1? That depends on who's asking.

## What the Gray Paper says

Appendix A.5:

- **Branches** compare ω_A with a register ω_B, or with an immediate ν_X, and jump if the
  comparison holds. It's lesson 15.3's `branch`: the target and the next instruction must
  both start basic blocks. There are ten comparisons: `eq`, `ne`, and `lt`, `le`, `ge`,
  `gt` in two flavours each. `_u` reads the 64 bits as an unsigned number, `_s` as a
  signed one (Z₈, lesson 15.2). The immediate branches have all ten; with two registers
  there are six (no `le` or `gt`: swap the registers and use `ge` or `lt`).
- **−1 against 1.** A register holds −1 as 64 set bits. Unsigned, that's 2^64 − 1, the
  biggest number there is. Signed, it's −1. So `branch_lt_u` says −1 < 1 is false, and
  `branch_lt_s` says it's true. Same bits, opposite answers.
- **`load_imm_jump`** (80) sets ω_A to ν_X and jumps to ν_Y. That's a function call: ν_X
  is the way back, an address in the jump table (lesson 15.3), and the function returns
  with `jump_ind` through ω_A. Programs keep the way back in r0, which is why lesson 15.3's
  program finished by jumping through r0.
- **`load_imm_jump_ind`** (180) is the same call through a register: ω_A gets ν_X, and the
  machine jumps through the table to ω_B + ν_Y. Think *function pointer*. ω_B is read as
  it was before ω_A changes, which matters when they're the same register.
- **`unlikely`** (2) changes nothing at all. It marks a path a branch rarely takes, and
  only the gas meter cares: a branch with `unlikely` (or `trap`) at either end costs less.
  Gas gets its own lessons later.

## The tests

**New file** `test/branches.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { opcodeInfo } from "../src/pvm/instructions.ts";
import { HALT_ADDRESS, newMachine, run, step } from "../src/pvm/machine.ts";
import type { Program } from "../src/pvm/program.ts";
import { assemble } from "../src/pvm/program.ts";

const MAX = 2n ** 64n - 1n; // all 64 bits set: −1, read as signed

/** Runs one branch, with r0 = p and r1 = q: does it jump (to 5), or fall through? */
function jumps(branch: number[], p: bigint, q = 0n): boolean {
  const fallthroughs = Array.from({ length: 5 - branch.length }, () => [1]); // up to 5
  const machine = newMachine(assemble([branch, ...fallthroughs, [0]]), [p, q]);
  step(machine);
  return machine.pc === 5;
}

// A branch on two registers is [opcode, A + 16·B, offset]: here A = r0, B = r1, offset 5.
test("signed or unsigned: −1 is the biggest number there is, or less than 1", () => {
  assert.equal(jumps([172, 0x10, 5], MAX, 1n), false); // branch_lt_u: 2^64 − 1 < 1? no
  assert.equal(jumps([173, 0x10, 5], MAX, 1n), true); // branch_lt_s: −1 < 1? yes
});

// With an immediate it's [opcode, A + 16·l_X, X, offset]: here A = r0 and X is one byte.
test("an immediate branch compares with ν_X, sign-extended like every immediate", () => {
  assert.equal(jumps([84, 0x10, 3, 5], 3n), true); // branch_le_u_imm: 3 ≤ 3
  assert.equal(jumps([83, 0x10, 3, 5], 3n), false); // branch_lt_u_imm: 3 < 3? no
  assert.equal(jumps([86, 0x10, 0xff, 5], 3n), false); // branch_gt_u_imm: 3 > 2^64 − 1? no
  assert.equal(jumps([90, 0x10, 0xff, 5], 3n), true); // branch_gt_s_imm: 3 > −1? yes
});

/** A function that doubles r2, at 6, and a call to it at 0: `call` must leave 2 in r0. */
function withCall(call: number[]): Program {
  const program = assemble([
    call, //                    0: the call, 4 bytes
    [50, 0x01], //              4: jump_ind r1 + 0: halt; the function returns here
    [200, 0x22, 0x02], //       6: add_64 r2 = r2 + r2
    [50, 0x00], //              9: jump_ind r0 + 0: return
  ]);
  return { ...program, jumpTable: [4, 6] }; // address 2 leads to 4, address 4 to 6
}

test("a call: load_imm_jump leaves the way back in r0, and the function returns by it", () => {
  const machine = newMachine(withCall([80, 0x10, 2, 6]), [0n, HALT_ADDRESS, 21n]);
  assert.equal(run(machine), "halt");
  assert.deepEqual(machine.registers.slice(0, 3), [2n, HALT_ADDRESS, 42n]);
});

// load_imm_jump_ind is [opcode, A + 16·B, l_X, X, Y]: here A = r0, B = r3, X = 2, no Y.
test("a call through a register: load_imm_jump_ind jumps to ω_B + ν_Y", () => {
  const registers = [0n, HALT_ADDRESS, 21n, 4n]; // r3 = 4: the function's address
  const machine = newMachine(withCall([180, 0x30, 0x01, 2]), registers);
  assert.equal(run(machine), "halt");
  assert.equal(machine.registers[2], 42n);
});

test("unlikely does nothing but move on", () => {
  const machine = newMachine(assemble([[2], [0]]));
  assert.equal(step(machine), "continue");
  assert.equal(machine.pc, 1);
});

test("every branch in the GP's tables has a comparison: 16 of them", () => {
  let branches = 0;
  for (let opcode = 0; opcode < 256; opcode++) {
    if (!opcodeInfo(opcode)?.name.startsWith("branch_")) continue;
    assert.doesNotThrow(() => step(newMachine(assemble([[opcode], [0]]))));
    branches++;
  }
  assert.equal(branches, 16); // 10 against an immediate, 6 against a register
});
```

`jumps` runs one branch whose target is 5, with fallthroughs filling the gap so that both
ways start basic blocks. Then it asks one thing: did the machine land on 5?

`withCall` is a whole program with a function in it. The call at 0 goes to the function
at 6, which doubles r2 and returns through r0 to 4. The jump table has two entries:
address 2 leads to 4, just after the call, and address 4 leads to 6, the function. Notice
the halt address sits in r1 this time: r0 is busy holding the way back. (A real program
would save r0 in memory before making a call of its own.)

**Run, expect it to fail**

```sh
npm test
# fails with: isn't built yet
```

## The code

The four branches in `basics` move out to join their twelve siblings:

**Replace in** `src/pvm/machine.ts`

```ts
/** Lesson 15.3's instructions: jumps, and loading and moving values. */
function basics(m: Machine, ins: Instruction): Exit | undefined {
  const [a, b] = ins.registers; // the GP's register letters, in its order
  const [x] = ins.immediates;
  const reg = m.registers; // ω
  switch (ins.name) {
    case "trap":
      return "panic";
    case "fallthrough":
      return jumpTo(m, ins.next);
    case "jump":
      return jumpTo(m, ins.target as number);
    case "jump_ind":
      return jumpIndirect(m, (reg[a] + x) % 2n ** 32n);
    case "load_imm":
    case "load_imm_64":
      reg[a] = x;
      return "continue";
    case "move_reg": // registers [D, A]: ω′_D = ω_A
      reg[a] = reg[b];
      return "continue";
    default:
      return undefined; // not one of these
  }
}

/** Every family of instructions built so far. */
const FAMILIES: Family[] = [basics, memoryInstructions, arithmetic, decisions];
```

**Add to** `src/pvm/machine.ts`

```ts
import { signed } from "./instructions.ts";

/** How a branch compares ω_A with ω_B or ν_X: as unsigned numbers (u), or signed (s, Z₈). */
const COMPARISONS: Record<string, (p: bigint, q: bigint) => boolean> = {
  eq: (p, q) => p === q,
  ne: (p, q) => p !== q,
  lt_u: (p, q) => p < q,
  le_u: (p, q) => p <= q,
  ge_u: (p, q) => p >= q,
  gt_u: (p, q) => p > q,
  lt_s: (p, q) => signed(8, p) < signed(8, q),
  le_s: (p, q) => signed(8, p) <= signed(8, q),
  ge_s: (p, q) => signed(8, p) >= signed(8, q),
  gt_s: (p, q) => signed(8, p) > signed(8, q),
};

/** Lesson 15.6's instructions: every branch, the jumps that load a register, and unlikely. */
function decisions(m: Machine, ins: Instruction): Exit | undefined {
  const [a, b] = ins.registers;
  const [x, y] = ins.immediates;
  const reg = m.registers;
  if (ins.name.startsWith("branch_")) {
    const comparison = ins.name.slice("branch_".length).replace("_imm", "");
    const q = ins.name.endsWith("_imm") ? x : reg[b]; // ω_A against ν_X, or against ω_B
    return branch(m, ins, ins.target as number, COMPARISONS[comparison](reg[a], q));
  }
  switch (ins.name) {
    case "load_imm_jump": // ω′_A = ν_X, and jump to ν_Y
      reg[a] = x;
      return jumpTo(m, ins.target as number);
    case "load_imm_jump_ind": {
      const address = (reg[b] + y) % 2n ** 32n; // from ω_B as it was, before ω_A changes
      reg[a] = x;
      return jumpIndirect(m, address);
    }
    case "unlikely": // does nothing at all; it's a hint for the gas meter
      return "continue";
    default:
      return undefined;
  }
}
```

`COMPARISONS` is the whole Gray Paper table in ten lines. A branch's name says which
comparison it wants (`branch_lt_s_imm` → `lt_s`) and whether its other side is ν_X or
ω_B. In `load_imm_jump_ind`, the address is worked out *before* ω_A changes: write the
two lines the other way round and a call through r0 would jump to its own way back.

**Run**

```sh
npm test
# prints: a call through a register: load_imm_jump_ind jumps to ω_B + ν_Y
# prints: every branch in the GP's tables has a comparison: 16 of them
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**New file** `bin/branches.ts`

```ts
// Runs every branch on your PVM with r0 = −1 and r1 = 1 (ν_X = 1 for the immediate ones),
// and shows which of them jump: the same bits give different answers, unsigned and signed.
// Usage: node bin/branches.ts

import { Run } from "../src/obs.ts";
import { opcodeInfo } from "../src/pvm/instructions.ts";
import { newMachine, step } from "../src/pvm/machine.ts";
import { assemble } from "../src/pvm/program.ts";

const MINUS_ONE = 2n ** 64n - 1n; // all 64 bits set

const run = new Run("branches");
console.log("r0 = −1, against r1 = 1 or ν_X = 1:");
for (let opcode = 0; opcode < 256; opcode++) {
  const name = opcodeInfo(opcode)?.name ?? "";
  if (!name.startsWith("branch_")) continue;
  const branch = name.endsWith("_imm") ? [opcode, 0x10, 1, 5] : [opcode, 0x10, 5]; // to 5
  const fallthroughs = Array.from({ length: 5 - branch.length }, () => [1]);
  const machine = newMachine(assemble([branch, ...fallthroughs, [0]]), [MINUS_ONE, 1n]);
  step(machine);
  const taken = machine.pc === 5;
  console.log(`${name.padEnd(16)} ${taken ? "jumps" : "falls through"}`);
  run.event("branch", { name, taken });
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/branches.ts
# prints: branch_lt_u      falls through
# prints: branch_lt_s      jumps
# prints: reported to Grafana
```

Read it in pairs. Every unsigned comparison and its signed twin disagree about −1 and 1:
`lt_u` falls through where `lt_s` jumps, `ge_u` jumps where `ge_s` falls through. Only
`eq` and `ne` have no twin, and now you can see why: equal bits are equal however you
read them. The *Branches* panel has all sixteen.

<details>
<summary>lasair: <code>Load_imm_jump_ind</code>, in <code>lib/pvm.ml</code></summary>

```ocaml
         | Load_imm_jump_ind { ra; rb; imm; offset } ->
           (* the base is read before ra is written; ra is written even when
              the jump halts or panics *)
           let base = rget r rb in
           rset r ra imm;
```

The same order as yours, and a comment to stop anyone "tidying" it. For the branches,
lasair has the opposite problem to yours: OCaml's `Int64` compares as signed, so lasair
writes a `compare_u64` for the `_u` branches, while your `bigint`s are unsigned and need
`signed` for the `_s` ones.

</details>

## What you have

Every branch, and calls both ways. Your machine now runs every instruction but eleven:
ten that count and shuffle bits, and `ecalli`, the door out to the host.

Next: [15.7 Bits and bytes](./07-bits-and-bytes.md)
