# Bits and bytes

Most instructions do sums. These ten *look* at a number instead: how many 1s does it have?
How many 0s sit above its highest 1? What do its bytes look like back to front? They're
small, a little odd, and handy: a program that juggles bitmaps, or reads big-endian data,
would sorely miss them. After this lesson, your machine runs every instruction in the
Gray Paper but one.

## What the Gray Paper says

Appendix A.5, the instructions with two registers (101 to 110). Each one makes ω′_D from
ω_A alone, and the byte after the opcode is D + 16·A.

- **`count_set_bits`**: how many bits are 1.
- **`leading_zero_bits`**: how many 0s come above the highest 1. **`trailing_zero_bits`**:
  how many come below the lowest 1. Zero has no 1 to stop at, so both give 64.
- Each count comes in **64 and 32** bits. The `_32` forms see only the low 32 bits:
  `count_set_bits_32` of all ones is 32, and `trailing_zero_bits_32` of zero is 32.
- **`sign_extend_8`** and **`sign_extend_16`** take the lowest byte or two and read them
  as a signed number (Z, lesson 15.2): 0x80 becomes −128. **`zero_extend_16`** keeps the
  lowest two bytes as they are, and clears the rest.
- **`reverse_bytes`** turns the 8 bytes round, first to last. Registers go to memory
  little-endian (lesson 15.4); plenty of data out in the world is big-endian. One
  instruction flips between them.

The Gray Paper counts with B, which lists a number's bits lowest first, and B with an
arrow over it, the same bits highest first. That second one is how people write numbers,
and as you'll see, it's how your code will too.

## The tests

**New file** `test/bits.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { BIT_OPERATIONS } from "../src/pvm/bits.ts";
import { opcodeInfo } from "../src/pvm/instructions.ts";
import { newMachine, step } from "../src/pvm/machine.ts";
import { assemble } from "../src/pvm/program.ts";

const MAX = 2n ** 64n - 1n; // all 64 bits set

/** ω′_D after one two-register instruction, [opcode, D + 16·A]: here D = r1, A = r0. */
function one(opcode: number, r0: bigint): bigint {
  const machine = newMachine(assemble([[opcode, 0x01]]), [r0]);
  step(machine);
  return machine.registers[1];
}

test("counting bits: the 1s, the 0s before the first 1, the 0s after the last", () => {
  assert.equal(one(101, 0b1011n), 3n); // count_set_bits_64
  assert.equal(one(103, 1n), 63n); // leading_zero_bits_64: 63 zeros, then the 1
  assert.equal(one(105, 0b1000n), 3n); // trailing_zero_bits_64
});

test("the 32-bit counts see only the low 32 bits, and zero is all zeros", () => {
  assert.equal(one(102, MAX), 32n); // count_set_bits_32
  assert.equal(one(104, 1n), 31n); // leading_zero_bits_32
  assert.equal(one(103, 0n), 64n); // leading_zero_bits_64: no 1 to stop at
  assert.equal(one(106, 0n), 32n); // trailing_zero_bits_32
});

test("extending: the lowest byte or two, read as signed or unsigned", () => {
  assert.equal(one(107, 0x180n), MAX - 127n); // sign_extend_8: 0x80 is −128
  assert.equal(one(108, 0x12345n), 0x2345n); // sign_extend_16: 0x2345 is positive
  assert.equal(one(109, MAX), 0xffffn); // zero_extend_16
});

test("reverse_bytes turns little-endian into big-endian", () => {
  assert.equal(one(110, 0x0102030405060708n), 0x0807060504030201n);
});

test("every two-register instruction after move_reg has an operation: 10 of them", () => {
  for (let opcode = 101; opcode <= 110; opcode++) {
    const { name } = opcodeInfo(opcode)!;
    assert.ok(BIT_OPERATIONS[name], name);
  }
  assert.equal(opcodeInfo(111), undefined); // and the table ends there
});
```

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The code

**New file** `src/pvm/bits.ts`

```ts
// Bits and bytes (GP App. A.5, two registers): instructions that count a register's bits,
// widen its lowest bytes, or turn it back to front. Each makes ω′_D from ω_A alone.

import { decodeFixed, encodeFixed } from "../codec/numbers.ts";
import { signExtend } from "./instructions.ts";

/** x's lowest n bits as a string of 0s and 1s, the highest first (the GP's B, reversed). */
const bits = (x: bigint, n: number) => BigInt.asUintN(n, x).toString(2).padStart(n, "0");
/** How many 1s there are, how many 0s come before the first 1, and how many after the last. */
const ones = (s: string) => BigInt(s.replaceAll("0", "").length);
const leadingZeros = (s: string) => BigInt(/^0*/.exec(s)![0].length);
const trailingZeros = (s: string) => BigInt(/0*$/.exec(s)![0].length);

/** Each instruction's operation, by name: x is ω_A, and the answer goes to ω′_D. */
export const BIT_OPERATIONS: Record<string, (x: bigint) => bigint> = {
  count_set_bits_64: (x) => ones(bits(x, 64)),
  count_set_bits_32: (x) => ones(bits(x, 32)),
  leading_zero_bits_64: (x) => leadingZeros(bits(x, 64)),
  leading_zero_bits_32: (x) => leadingZeros(bits(x, 32)),
  trailing_zero_bits_64: (x) => trailingZeros(bits(x, 64)),
  trailing_zero_bits_32: (x) => trailingZeros(bits(x, 32)),
  sign_extend_8: (x) => signExtend(1, BigInt.asUintN(8, x)),
  sign_extend_16: (x) => signExtend(2, BigInt.asUintN(16, x)),
  zero_extend_16: (x) => BigInt.asUintN(16, x),
  reverse_bytes: (x) => decodeFixed(encodeFixed(x, 8).reverse()), // ℰ₈, back to front
};
```

The trick: turn the number into a *string*. `toString(2)` writes a bigint in binary, and
`padStart` fills in the zeros above its highest 1, so `bits(5n, 8)` is `"00000101"`.
(`BigInt.asUintN(n, x)` keeps x's lowest n bits, x mod 2^n.) Counting is now string work:
drop the 0s and count what's left, or let `/^0*/` match the run of 0s at the start and
`/0*$/` the run at the end. Zero needs no special case: its string is all 0s, so both runs
are the whole thing.

`reverse_bytes` is the Gray Paper's own definition, almost word for word: encode in 8
bytes (ℰ₈, from Part 2), reverse them, decode.

A family to run them, and a place in the line-up:

**Add to** `src/pvm/machine.ts`

```ts
import { BIT_OPERATIONS } from "./bits.ts";

/** Lesson 15.7's instructions: ω′_D from ω_A alone, by counting, widening or reversing. */
function bitsAndBytes(m: Machine, ins: Instruction): Exit | undefined {
  const f = BIT_OPERATIONS[ins.name];
  if (!f) return undefined;
  const [d, a] = ins.registers; // two registers: [D, A]
  m.registers[d] = f(m.registers[a]);
  return "continue";
}
```

**Replace in** `src/pvm/machine.ts`

```ts
/** Every family of instructions built so far. */
const FAMILIES: Family[] = [basics, memoryInstructions, arithmetic, decisions, bitsAndBytes];
```

**Run**

```sh
npm test
# prints: reverse_bytes turns little-endian into big-endian
# prints: every two-register instruction after move_reg has an operation: 10 of them
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**New file** `bin/bits.ts`

```ts
// Runs the ten bit-and-byte instructions on one number, on your PVM, and shows its bits and
// every answer.
// Usage: node bin/bits.ts [number], e.g. node bin/bits.ts 0xdeadbeef (0x1f0 if not given)

import { Run } from "../src/obs.ts";
import { opcodeInfo, signed } from "../src/pvm/instructions.ts";
import { newMachine, step } from "../src/pvm/machine.ts";
import { assemble } from "../src/pvm/program.ts";

const x = BigInt.asUintN(64, BigInt(process.argv[2] ?? "0x1f0")); // as 64 unsigned bits
const hex = (v: bigint) => `0x${v.toString(16).padStart(16, "0")}`;

const run = new Run("bits");
console.log(`r0 = ${hex(x)}, in bits:`);
console.log(x.toString(2).padStart(64, "0"));
for (let opcode = 101; opcode <= 110; opcode++) {
  const { name } = opcodeInfo(opcode)!;
  const machine = newMachine(assemble([[opcode, 0x01]]), [x]); // r1 = the answer, from r0
  step(machine);
  const answer = `${hex(machine.registers[1])} = ${signed(8, machine.registers[1])}`;
  console.log(`${name.padEnd(22)} ${answer}`);
  run.event("bits", { name, x: hex(x), answer });
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/bits.ts
# prints: 0000000000000000000000000000000000000000000000000000000111110000
# prints: leading_zero_bits_64   0x0000000000000037 = 55
# prints: sign_extend_8          0xfffffffffffffff0 = -16
# prints: reported to Grafana
```

0x1f0 is five 1s with four 0s below them, and you can count each answer off the string
of bits at the top. Look at the lowest byte, 0xf0: unsigned it's 240, signed it's −16, and
`sign_extend_8` picks signed. `reverse_bytes` moves that 0xf0 from the bottom of the
register to the top. Try `node bin/bits.ts 0xdeadbeef` and `node bin/bits.ts -1`. The
*Bits* panel keeps every run.

<details>
<summary>lasair: <code>clz64</code>, in <code>lib/pvm.ml</code></summary>

```ocaml
let clz64 (x : int64) : int =
  if x = 0L then 64
  else
    let rec count n i =
      if i < 0 then n
      else if Int64.(logand (shift_right_logical x i) 1L) <> 0L then 64 - i - 1
      else count n (i - 1)
    in
    count 0 63
```

`leading_zero_bits_64`, the classic way: test the bits one at a time from the top, with
shifts and masks, and treat zero on its own. Your string version takes the same walk
with no shifts, no masks and no special case.

</details>

## What you have

Every instruction in the Gray Paper's tables, bar one: `ecalli`, the door out of the
machine to the host. That's next.

Next: [15.8 A real program](./08-a-real-program.md)
