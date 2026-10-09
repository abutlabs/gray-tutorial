# The program blob

Part 15 is the big one: the **PVM**, the Polkadot Virtual Machine, the little computer
inside every JAM node that runs services' code. Before it can run anything, though, it
has to *unpack* it. A service's code arrives as one long preimage (lesson 14.1), and
inside it, like nesting dolls, are a label, a memory layout, and finally the program the
PVM steps through. This lesson opens all the dolls, on a real service's real code.

## What the Gray Paper says

Three layers, from the outside in.

**1. The code preimage** (§9): E(↕m) ⌢ c. First the **metadata** m, with its length in
front: a name, a version, a licence, for people rather than the PVM. Then the code c.

**2. The standard program** (App. A, the function Y): c holds what the program's memory
starts with. Four sizes, ℰ₃(|o|) ⌢ ℰ₃(|w|) ⌢ ℰ₂(z) ⌢ ℰ₃(s), then the data they size:

- o, **read-only data** the program may read;
- w, **read-write data**, followed by z pages of zeroed heap;
- s, the **stack** size;

and then ℰ₄(|p|) ⌢ p, the PVM program blob itself. (A later lesson lays these out in
memory.)

**3. The PVM blob** (App. A, deblob): ℰ(|j|) ⌢ ℰ₁(z) ⌢ ℰ(|c|), then:

- j, the **jump table**: |j| entries of z bytes each, the places an indirect jump may land;
- c, the **code**: the instructions, byte after byte;
- k, the **opcode bitmask**: one bit per byte of c, saying which bytes *start* an
  instruction. Instructions take 1 to 16 bytes, so without k you couldn't tell an
  opcode from an argument. Bits are packed least significant first, like lesson 11.1's
  bitfields.

## The tests

The tests need the trace's service code, and later lessons will too, so a helper finds
it, next to the other vector readers:

**Add to** `test/vectors.ts`

```ts
import { toHex } from "../src/bytes.ts";
import { blake2b256 } from "../src/hash.ts";
import { readService } from "../src/services.ts";

/** The code of service 0, from the state before the first block of the fallback trace. */
export function bootstrapCode(): Uint8Array {
  const { entries } = traceState("fallback", 1);
  const { code_hash } = readService(entries, 0);
  const preimage = entries.find((e) => toHex(blake2b256(e.value)) === toHex(code_hash));
  return (preimage as { value: Uint8Array }).value;
}
```

**New file** `test/program.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromHex, toHex } from "../src/bytes.ts";
import { deblob, startsInstruction, unpackCode } from "../src/pvm/program.ts";
import { bootstrapCode } from "./vectors.ts";

test("deblob by hand: one jump, three bytes of code, two instructions", () => {
  // |j| = 1, z = 1, |c| = 3 | j = [2] | c = 00 01 02 | k = 0000 0101: bytes 0 and 2 start one
  const program = deblob(fromHex("0x01010302" + "000102" + "05"));
  assert.deepEqual(program.jumpTable, [2]);
  assert.equal(toHex(program.code), "0x000102");
  assert.deepEqual([0, 1, 2].map((i) => startsInstruction(program, i)), [true, false, true]);
});

test("a real service's code: metadata, then a standard program that ends it exactly", () => {
  const preimage = bootstrapCode();
  const code = unpackCode(preimage);
  assert.equal(new TextDecoder().decode(code.metadata).includes("jam-bootstrap-service"), true);
  assert.deepEqual([code.readOnly.length, code.readWrite.length], [9904, 48]);
  assert.deepEqual([code.heapPages, code.stackSize], [2, 8192]);
  const tail = preimage.subarray(preimage.length - code.program.length);
  assert.deepEqual(tail, code.program); // nothing left over after the PVM blob
});

test("its PVM blob: 39,849 instructions, and all 1,601 jumps land on one", () => {
  const program = deblob(unpackCode(bootstrapCode()).program);
  let instructions = 0;
  for (let i = 0; i < program.code.length; i++) if (startsInstruction(program, i)) instructions++;
  assert.equal(instructions, 39849);
  assert.equal(startsInstruction(program, 0), true); // the code starts with an instruction
  assert.equal(program.jumpTable.length, 1601);
  for (const target of program.jumpTable) assert.ok(startsInstruction(program, target));
});
```

The first test builds a blob by hand, eight bytes you can read: one jump to byte 2,
three bytes of code, and a bitmask of `0000 0101` that marks bytes 0 and 2 as
instructions. The others unpack the code of the trace's service 0, the 159,322-byte
preimage from lesson 6.1, and check that every layer fits *exactly*: no bytes left over
at the end of the preimage, every jump landing on an instruction.

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The code

**New file** `src/pvm/program.ts`

```ts
// Programs (GP §9, App. A): how a service's code is packed, from its preimage down to the
// instructions the PVM runs.

import { bitAt } from "../assurances.ts";
import type { Bytes } from "../bytes.ts";
import { Reader } from "../codec/reader.ts";

/** A service's code, unpacked: its metadata, and the standard program's parts (GP App. A). */
export type ServiceCode = {
  metadata: Bytes; // a name, a version, a licence: for people, not the PVM
  readOnly: Bytes; // o: data the program may read
  readWrite: Bytes; // w: data it may read and write
  heapPages: number; // z: pages of zeroed heap after w
  stackSize: number; // s
  program: Bytes; // the PVM program blob
};

/** Unpacks a code preimage: E(↕m) ⌢ c (GP §9), and c is Y's standard program (App. A). */
export function unpackCode(preimage: Bytes): ServiceCode {
  const r = new Reader(preimage);
  const metadata = r.bytes(Number(r.natural()));
  const readOnlyLength = Number(r.fixed(3));
  const readWriteLength = Number(r.fixed(3));
  const heapPages = Number(r.fixed(2));
  const stackSize = Number(r.fixed(3));
  const readOnly = r.bytes(readOnlyLength);
  const readWrite = r.bytes(readWriteLength);
  const program = r.bytes(Number(r.fixed(4)));
  return { metadata, readOnly, readWrite, heapPages, stackSize, program };
}

/** A PVM program blob, unpacked: the jump table, the code, and the opcode bitmask. */
export type Program = { jumpTable: number[]; code: Bytes; bitmask: Bytes };

/** deblob (GP App. A): E(|j|) ⌢ E₁(z) ⌢ E(|c|) ⌢ j, each entry z bytes ⌢ c ⌢ k. */
export function deblob(blob: Bytes): Program {
  const r = new Reader(blob);
  const jumps = Number(r.natural());
  const z = Number(r.fixed(1)); // bytes per jump-table entry
  const codeLength = Number(r.natural());
  const jumpTable = Array.from({ length: jumps }, () => Number(r.fixed(z)));
  const code = r.bytes(codeLength);
  const bitmask = r.bytes(Math.ceil(codeLength / 8)); // one bit per byte of code
  return { jumpTable, code, bitmask };
}

/** Whether byte i of the code starts an instruction: bit i of k, least significant first. */
export function startsInstruction(program: Program, i: number): boolean {
  return i < program.code.length && bitAt(program.bitmask, i);
}
```

The PVM gets a folder of its own, `src/pvm/`, since several files are coming. All of
this is Part 2's `Reader`: `fixed(3)` for ℰ₃, `natural()` for ℰ, `bytes(n)` for the
data. `startsInstruction` reuses lesson 11.1's `bitAt`: the same packing, so the same
function.

**Run**

```sh
npm test
# prints: deblob by hand: one jump, three bytes of code, two instructions
# prints: its PVM blob: 39,849 instructions, and all 1,601 jumps land on one
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**New file** `bin/program.ts`

```ts
// Unpacks a service's code from the state before a trace's block, layer by layer: the
// metadata, the standard program, and the PVM blob's jump table, code and bitmask.
// Usage: node bin/program.ts <trace.json> [service id, 0 unless you say], e.g.
//        node bin/program.ts ../vectors/traces/fallback/00000001.json

import { readFileSync } from "node:fs";
import { fromHex, toHex } from "../src/bytes.ts";
import { blake2b256 } from "../src/hash.ts";
import { Run } from "../src/obs.ts";
import { deblob, startsInstruction, unpackCode } from "../src/pvm/program.ts";
import { readService } from "../src/services.ts";
import type { KeyValue } from "../src/trie.ts";

const [file, id] = process.argv.slice(2);
const trace = JSON.parse(readFileSync(file, "utf8"));
const entries: KeyValue[] = trace.pre_state.keyvals.map((e: { key: string; value: string }) => ({
  key: fromHex(e.key),
  value: fromHex(e.value),
}));
const { code_hash } = readService(entries, Number(id ?? 0));
const preimage = entries.find((e) => toHex(blake2b256(e.value)) === toHex(code_hash));
if (!preimage) throw new Error("the service's code isn't in this state");
const code = unpackCode(preimage.value);
const program = deblob(code.program);
const opcodes = new Map<number, number>(); // how often each opcode starts an instruction
for (let i = 0; i < program.code.length; i++) {
  if (!startsInstruction(program, i)) continue;
  const opcode = program.code[i];
  opcodes.set(opcode, (opcodes.get(opcode) ?? 0) + 1);
}
const instructions = [...opcodes.values()].reduce((a, b) => a + b, 0);
const common = [...opcodes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
const run = new Run("program");
const lines = [
  `the code preimage: ${preimage.value.length} bytes`,
  `  metadata: ${code.metadata.length} bytes`,
  `  read-only data ${code.readOnly.length}, read-write ${code.readWrite.length}, ` +
    `heap pages ${code.heapPages}, stack ${code.stackSize}`,
  `  the PVM blob: ${code.program.length} bytes`,
  `    jump table: ${program.jumpTable.length} entries`,
  `    code: ${program.code.length} bytes, ${instructions} instructions`,
  `    bitmask: ${program.bitmask.length} bytes`,
  `most common opcodes: ${common.map(([op, n]) => `${op} (${n}×)`).join(", ")}`,
];
for (const line of lines) {
  console.log(line);
  run.event("layer", { line });
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/program.ts ../vectors/traces/fallback/00000001.json
# prints: metadata: 80 bytes
# prints: code: 128413 bytes, 39849 instructions
# prints: reported to Grafana
```

159,322 bytes: 80 of metadata (it calls itself `jam-bootstrap-service`, version 0.1.29,
Apache-2.0 licensed), almost 10 kB of read-only data, and a PVM blob of 149,274 bytes
holding 39,849 instructions. 128,413 bytes of code over 39,849 instructions is about
3.2 bytes each. And a few opcodes do most of the work: 130, 123 and 51 alone start more
than a third of all instructions. Next lesson finds out what they are. The *Program* panel
shows the layers.

<details>
<summary>lasair: <code>parse_program</code>, in <code>lib/pvm.ml</code></summary>

```ocaml
        let code_len, pos3 = decode_natural blob pos2 in
        (* Z_J, Z_C; a count past 2^62 wraps negative in an int *)
        if jump_count < 0 || jump_count > Definitions.Constants.c_max_jump_table_entries
           || code_len < 0 || code_len > Definitions.Constants.c_max_code_size then None
        else
        let jump_table_size = jump_count * z in
        let bitmask_size = (code_len + 7) / 8 in
        let expected_size = pos3 + jump_table_size + code_len + bitmask_size in

        if Bytes.length blob < expected_size then None
```

The same three layers of sizes, plus the hardening: limits on the jump table and the
code, and a refusal when the blob is shorter than its own sizes promise. A program blob
comes from a service, so from anyone, and a client must survive a hostile one. A few
lines further down, lasair also *expands* the bitmask into a byte per code byte, trading
memory for a faster "does this byte start an instruction?". Both are for the hardening
pass; your `deblob` shows the shape.

</details>

## What you have

A real service's code, unpacked down to its instructions: metadata, memory layout, jump
table, code and bitmask, every byte accounted for.

Next: [15.2 Instructions](./02-instructions.md)
