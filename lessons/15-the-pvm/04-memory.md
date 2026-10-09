# Memory

So far the machine only has registers: thirteen numbers. Real programs need room: a
stack for function calls, data to read, places to write results. This lesson gives the
PVM its **memory**, 4 gigabytes of address space of which a program can touch only the
pages it's been given, and the thirty instructions that load and store.

## What the Gray Paper says

§4 and Appendix A.

**RAM** is 2^32 bytes, cut into **pages** of Z_P = 4,096 bytes. Each page is *readable*
(R), *writable* (W, which is readable too), or *inaccessible*. A fresh machine has only
the pages its program needs. Everything else is empty space.

**Touching memory** (ε^μ, A.4): if an instruction reads an inaccessible byte, or writes
a byte that isn't writable, the machine stops and changes *nothing*:

- if the lowest bad address is below 2^16, that's a **panic**: nothing may live in the
  first 64 kB, so a near-null pointer is always a crash;
- otherwise it's a **fault**, reporting the address of the bad *page* (the bad address
  rounded down to a multiple of 4,096).

The machine stays on the faulting instruction, so whoever runs it could add the page and
carry on.

Addresses wrap round at 2^32 (the GP's ↻), and every value is little-endian.

**The instructions** come in families that differ only in width and form:

| Instructions | Address | Does |
| --- | --- | --- |
| `load_u8` … `load_u64`, `load_i8` … `load_i32` | ν_X | ω_A ← memory; `i` sign-extends |
| `load_ind_u8` … `load_ind_u64`, `load_ind_i…` | ω_B + ν_X | the same, through a register |
| `store_u8` … `store_u64` | ν_X | memory ← ω_A |
| `store_ind_u8` … `store_ind_u64` | ω_B + ν_X | memory ← ω_A |
| `store_imm_u8` … `store_imm_u64` | ν_X | memory ← ν_Y |
| `store_imm_ind_u8` … `store_imm_ind_u64` | ω_A + ν_X | memory ← ν_Y |

A store keeps only the low bytes: `store_u8` writes ω_A mod 2^8.

## The tests

**New file** `test/memory.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { HALT_ADDRESS, newMachine, run, step } from "../src/pvm/machine.ts";
import type { Memory } from "../src/pvm/memory.ts";
import { addPages } from "../src/pvm/memory.ts";
import { assemble } from "../src/pvm/program.ts";

test("store 8 bytes, load them back, and load one as a signed byte", () => {
  const program = assemble([
    [123, 0x12], //  store_ind_u64 r2 at r1 + 0
    [130, 0x13], //  load_ind_u64 r3 from r1 + 0
    [125, 0x14], //  load_ind_i8 r4 from r1 + 0: one byte, sign-extended
    [50, 0x00], //   jump_ind r0: return
  ]);
  const memory: Memory = new Map();
  addPages(memory, 0x20000, 4096, "W"); // one writable page at 0x20000
  const r2 = 0x1122334455667780n; // its lowest byte, 0x80, is −128 as a signed byte
  const machine = newMachine(program, [HALT_ADDRESS, 0x20000n, r2], memory);
  assert.equal(run(machine), "halt");
  assert.equal(machine.registers[3], r2);
  assert.equal(machine.registers[4], 2n ** 64n - 128n);
});

test("no page there: a fault at the page's address; below 2^16: a panic", () => {
  const far = newMachine(assemble([[52, 0x01, 0x05, 0x00, 0x03]])); // load_u8 r1, [0x30005]
  assert.deepEqual(step(far), { fault: 0x30000 });
  assert.equal(far.pc, 0); // the machine stays at the instruction that faulted
  const low = newMachine(assemble([[52, 0x01, 0x00, 0x01]])); // load_u8 r1, [0x0100]
  assert.equal(step(low), "panic");
});

test("writing a read-only page faults, and writes nothing", () => {
  const memory: Memory = new Map();
  addPages(memory, 0x10000, 4096, "R");
  const program = assemble([[30, 0x03, 0x00, 0x00, 0x01, 0x2a]]); // store_imm_u8 [0x10000], 42
  assert.deepEqual(step(newMachine(program, [], memory)), { fault: 0x10000 });
  assert.equal(memory.get(0x10)?.bytes[0], 0);
});
```

The first test is the `ind` forms you saw most in the real code (lesson 15.2): r1
holds an address, like a stack pointer. `0x80` as an unsigned byte is 128; as a signed
byte it's −128, which in 64 bits is `0xffffffffffffff80`.

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The code

**New file** `src/pvm/memory.ts`

```ts
// Memory (GP §4, App. A): 2^32 bytes in pages of 4096. Each page is readable, writable
// (and readable), or not there at all.

import type { Bytes } from "../bytes.ts";

/** Z_P: the size of a page. */
export const PAGE_SIZE = 4096;

/** A page's access: R, read only, or W, read and write. Pages not in memory have neither. */
export type Access = "R" | "W";

/** RAM, by page number: only the pages a program can touch are here. */
export type Memory = Map<number, { access: Access; bytes: Uint8Array }>;

/** What can go wrong touching memory: a panic below 2^16, or a fault at a page's address. */
export type MemoryError = "panic" | { fault: number };

/** Makes the pages covering [start, start + length) accessible, zeroed, with `access`. */
export function addPages(memory: Memory, start: number, length: number, access: Access): void {
  const first = Math.floor(start / PAGE_SIZE);
  const last = Math.ceil((start + length) / PAGE_SIZE);
  for (let page = first; page < last; page++) {
    memory.set(page, { access, bytes: new Uint8Array(PAGE_SIZE) });
  }
}

/** The addresses of n bytes from `address`, wrapping round at 2^32 (the GP's ↻). */
function addresses(address: bigint, n: number): number[] {
  return Array.from({ length: n }, (_, k) => Number((address + BigInt(k)) % 2n ** 32n));
}

/** ε^μ (GP App. A.4): the lowest address that can't be used; below 2^16 it's a panic. */
function check(memory: Memory, at: number[], write: boolean): MemoryError | null {
  const bad = at.filter((i) => {
    const page = memory.get(Math.floor(i / PAGE_SIZE));
    return page === undefined || (write && page.access !== "W");
  });
  if (bad.length === 0) return null;
  const lowest = Math.min(...bad);
  if (lowest < 2 ** 16) return "panic";
  return { fault: Math.floor(lowest / PAGE_SIZE) * PAGE_SIZE };
}

/** Reads n bytes from `address`, or says why it can't. */
export function readMemory(memory: Memory, address: bigint, n: number): Bytes | MemoryError {
  const at = addresses(address, n);
  const error = check(memory, at, false);
  if (error) return error;
  return Uint8Array.from(at, (i) => memory.get(Math.floor(i / PAGE_SIZE))!.bytes[i % PAGE_SIZE]);
}

/** Writes `bytes` at `address`, or says why it can't (and writes nothing). */
export function writeMemory(memory: Memory, address: bigint, bytes: Bytes): MemoryError | null {
  const at = addresses(address, bytes.length);
  const error = check(memory, at, true);
  if (error) return error;
  at.forEach((i, k) => {
    memory.get(Math.floor(i / PAGE_SIZE))!.bytes[i % PAGE_SIZE] = bytes[k];
  });
  return null;
}
```

Memory is a `Map` from page number to page, so the 2^32 bytes cost nothing until a page
is added. `check` follows ε^μ exactly: find every address that can't be used, take the
lowest, and panic or fault on it. Only if every byte is fine does anything get read or
written. The `!` after `memory.get(…)` tells TypeScript the page is there; `check`
already made sure.

Now the machine. It gets a new way to stop, a memory, and the new family.

**Replace in** `src/pvm/machine.ts`

```ts
/** How a step ends (GP's ε): carry on, finish, fail, or fault on a page of memory. */
export type Exit = "continue" | "halt" | "panic" | { fault: number };

/** The machine's state: the program, ı, the registers ω, and the memory μ. */
export type Machine = {
  program: Program;
  pc: number;
  registers: bigint[];
  memory: Memory;
  blocks: Set<number>;
};

/** A machine at instruction 0, with every register 0 unless given, and no memory unless given. */
export function newMachine(
  program: Program,
  registers: bigint[] = [],
  memory: Memory = new Map(),
): Machine {
  const all = Array.from({ length: 13 }, (_, i) => registers[i] ?? 0n);
  return { program, pc: 0, registers: all, memory, blocks: basicBlocks(program) };
}

/** Every family of instructions built so far. */
const FAMILIES: Family[] = [basics, memoryInstructions];
```

**Add to** `src/pvm/machine.ts`

```ts
import { signExtend } from "./instructions.ts";
import type { Memory, MemoryError } from "./memory.ts";
import { readMemory, writeMemory } from "./memory.ts";
import { decodeFixed, encodeFixed } from "../codec/numbers.ts";

/** A memory error leaves the machine as it was, at the instruction that caused it. */
function failed(m: Machine, ins: Instruction, error: MemoryError): Exit {
  m.pc = ins.at;
  return error;
}

/** Lesson 15.4's instructions: loads and stores, in every width and form. */
function memoryInstructions(m: Machine, ins: Instruction): Exit | undefined {
  const [a, b] = ins.registers;
  const [x, y] = ins.immediates;
  const reg = m.registers;
  const load = /^load_(ind_)?([ui])(8|16|32|64)$/.exec(ins.name);
  if (load) {
    const [, indirect, kind, bits] = load;
    const n = Number(bits) / 8;
    const bytes = readMemory(m.memory, indirect ? reg[b] + x : x, n);
    if (!(bytes instanceof Uint8Array)) return failed(m, ins, bytes);
    const value = decodeFixed(bytes); // little-endian
    reg[a] = kind === "i" ? signExtend(n, value) : value; // load_i… sign-extends
    return "continue";
  }
  const store = /^store_(imm_)?(ind_)?u(8|16|32|64)$/.exec(ins.name);
  if (store) {
    const [, imm, indirect, bits] = store;
    const n = Number(bits) / 8;
    const value = imm ? y : reg[a]; // store_imm… stores an immediate, the others ω_A
    const base = !indirect ? 0n : imm ? reg[a] : reg[b]; // …_ind adds a register
    const bytes = encodeFixed(value % 2n ** BigInt(8 * n), n);
    const error = writeMemory(m.memory, base + x, bytes);
    return error ? failed(m, ins, error) : "continue";
  }
  return undefined;
}
```

Thirty instructions in two `if`s: a regular expression reads the name, and the name says
everything. `load_ind_i16` is "load, through a register, signed, 16 bits". The
`([ui])` group catches signed or unsigned, `(ind_)?` the indirect form, `(8|16|32|64)`
the width. That's lesson 15.3's `FAMILIES` paying off: `step` hasn't changed at all.

**Run**

```sh
npm test
# prints: store 8 bytes, load them back, and load one as a signed byte
# prints: no page there: a fault at the page's address; below 2^16: a panic
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**New file** `bin/memory.ts`

```ts
// Runs two tiny programs on your PVM's memory: one stores 8 bytes and loads them back, the
// other reaches for a page that isn't there.
// Usage: node bin/memory.ts

import { toHex } from "../src/bytes.ts";
import { Run } from "../src/obs.ts";
import { HALT_ADDRESS, newMachine, run } from "../src/pvm/machine.ts";
import type { Memory } from "../src/pvm/memory.ts";
import { addPages } from "../src/pvm/memory.ts";
import { assemble } from "../src/pvm/program.ts";

const report = new Run("memory");
const say = (line: string) => {
  console.log(line);
  report.event("memory", { line });
};

const memory: Memory = new Map();
addPages(memory, 0x20000, 4096, "W");
const page = () => toHex((memory.get(0x20) as { bytes: Uint8Array }).bytes.subarray(0, 8));
say(`page 0x20000 before: ${page()}`);
const roundTrip = assemble([[123, 0x12], [130, 0x13], [125, 0x14], [50, 0x00]]);
const machine = newMachine(roundTrip, [HALT_ADDRESS, 0x20000n, 0x1122334455667780n], memory);
say(`run: ${run(machine)}`);
say(`page 0x20000 after:  ${page()}  (little-endian: the lowest byte first)`);
say(`r3 = 0x${machine.registers[3].toString(16)}  (all 8 bytes back)`);
say(`r4 = 0x${machine.registers[4].toString(16)}  (one byte, 0x80, sign-extended: −128)`);

const faulty = newMachine(assemble([[52, 0x01, 0x05, 0x00, 0x03]])); // load_u8 r1, [0x30005]
const exit = run(faulty);
const shown = typeof exit === "object" ? `a fault at 0x${exit.fault.toString(16)}` : exit;
say(`load from 0x30005, where there's no page: ${shown}`);
const link = await report.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/memory.ts
# prints: page 0x20000 after:  0x8077665544332211
# prints: r4 = 0xffffffffffffff80
# prints: a fault at 0x30000
# prints: reported to Grafana
```

Look at the page after the store: `0x8077665544332211`, the register's bytes *backwards*.
That's little-endian, lowest byte first, so the byte at 0x20000 is 0x80, which is why
loading it as a signed byte gives −128. And the fault names 0x30000, the start of the
missing page, not 0x30005. The *Memory* panel has the run.

<details>
<summary>lasair: loads, in <code>lib/pvm.ml</code></summary>

```ocaml
         (* Loads. A fault reports the unmasked address. *)
         | Load_u8 { ra; addr } -> if load c 1 false ra addr then pc := next else exit := Some (PageFault addr)
         | Load_i8 { ra; addr } -> if load c 1 true ra addr then pc := next else exit := Some (PageFault addr)
```

One line per instruction, thirty of them: lasair spells each out where yours reads the
name. And its comment points at a real choice. lasair's fault carries the address it
tried, where yours carries the start of the page, as the Gray Paper's ε^μ does. Most of
the time nobody looks: when a service's code runs, any fault simply counts as a panic
(Ψ_M, Part 16). But one place does look. A machine run *inside* another machine, by the
`invoke` host call, hands its fault back to the program that ran it, and there the
address is part of the answer.

</details>

## What you have

Memory with pages and permissions, and every load and store: the PVM can now hold real
data, and fails exactly the way the Gray Paper says when a program reaches too far.
