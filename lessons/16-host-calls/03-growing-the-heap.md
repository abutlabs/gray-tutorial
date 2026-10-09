# Growing the heap

Service 1729 runs to a clean halt now, and spends 17,867 gas doing it. The test vector
says 16,417. Somewhere in there are 1,450 gas your client charges and the real thing
doesn't, and lesson 16.2 pointed at the culprit: two calls to `grow_heap`, each answered
WHAT, at 1,000 gas apiece. Teach your host `grow_heap`, and watch the number land.

## What the Gray Paper says

A program's heap is lesson 15.8's read-write zone: w, then z pages of zeros. **`grow_heap`**
(host call 1, App. B.5, Ω_Gemini) lets a program make it bigger, a page at a time, up
towards the stack. ω₇ is the page the heap should end at: one past its last page.

Three page numbers do the work:

- **a = (2Z_Z + Q(|o|)) / Z_P**: the zone's first page, one empty zone above o (lesson
  15.8).
- **b = (2^32 − 3Z_Z − Z_I − P(s)) / Z_P**: as far as it may ever reach, a whole zone short
  of the stack.
- **h**: where the heap ends today: a, plus however many writable pages there are from a
  to b.

Then:

- **If ω₇ ≤ h** (the heap is already that big) **or ω₇ > b** (that's too big): nothing
  changes, ω₇ becomes h, and it costs 275. So asking for less is how a program asks
  "where does my heap end?".
- **Otherwise** it costs 275 plus 121 for each new page, the pages up to ω₇ become
  writable (all zeros), and ω₇ stays as asked. Without that much gas: out of gas, and
  ω₇ is h.

To find a and b, `grow_heap` needs the program's o and s, so accumulation's F hands it the
service's code.

## The tests

The 16.2 tests' host now needs a program's code too, a tiny one:

**Replace in** `test/host.test.ts`

```ts
/** Accumulation's host, for a tiny program, with an entropy of 32 sevens and no inputs. */
const accumulating = accumulateHost(TINY, tinyCode(), new Uint8Array(32).fill(7), []);
```

**Add to** `test/host.test.ts`

```ts
import { growHeap } from "../src/host.ts";
import type { ServiceCode } from "../src/pvm/program.ts";
import { deblob, unpackCode } from "../src/pvm/program.ts";
import { writeMemory } from "../src/pvm/memory.ts";
import { standardProgram } from "../src/pvm/standard.ts";
import { fromHex } from "../src/bytes.ts";
import { encodeNatural } from "../src/codec/numbers.ts";
import { vectorJson } from "./vectors.ts";

/** A tiny standard program's parts: 3 bytes of o, 2 of w, a heap page, a 100-byte stack. */
function tinyCode(): ServiceCode {
  return {
    metadata: new Uint8Array(0),
    readOnly: Uint8Array.of(1, 2, 3),
    readWrite: Uint8Array.of(4, 5),
    heapPages: 1,
    stackSize: 100,
    program: new Uint8Array(0),
  };
}

/** A machine laid out as tinyCode's program, asking grow_heap for the heap to end at `want`. */
function growing(want: bigint) {
  const { memory, registers } = standardProgram(tinyCode(), new Uint8Array(0));
  registers[7] = want;
  return newMachine(assemble([[0]]), registers, memory, 10_000n);
}

test("grow_heap: w starts at page 48, and with its heap page the heap ends at 50", () => {
  const machine = growing(0n); // asking for no more than it has: just the answer
  assert.equal(growHeap(machine, tinyCode()), "continue");
  assert.deepEqual([machine.registers[7], machine.gas], [50n, 10_000n - 275n]);
});

test("growing it by 3 pages costs 121 more gas a page, and page 52 is writable now", () => {
  const machine = growing(53n);
  assert.equal(growHeap(machine, tinyCode()), "continue");
  assert.deepEqual([machine.registers[7], machine.gas], [53n, 10_000n - 275n - 3n * 121n]);
  assert.equal(writeMemory(machine.memory, 52n * 4096n, Uint8Array.of(1)), null);
});

/** The parts of an accumulate test vector this test reads. */
type AccumulateVector = {
  input: { slot: number };
  pre_state: {
    entropy: string;
    accounts: {
      id: number;
      data: { service: { code_hash: string }; preimage_blobs: { hash: string; blob: string }[] };
    }[];
  };
  post_state: { statistics: { record: { accumulate_gas_used: number } }[] };
};

test("service 1729 accumulates on exactly the 16,417 gas the test vector says", () => {
  const vector = vectorJson("stf/accumulate/tiny/always_accumulate-1.json") as AccumulateVector;
  const { id, data } = vector.pre_state.accounts[0];
  const preimage = data.preimage_blobs.find((p) => p.hash === data.service.code_hash)!;
  const code = unpackCode(fromHex(preimage.blob));
  const [t, s] = [BigInt(vector.input.slot), BigInt(id)]; // the slot, the service, no inputs
  const args = Uint8Array.from([...encodeNatural(t), ...encodeNatural(s), ...encodeNatural(0n)]);
  const { memory, registers } = standardProgram(code, args);
  const machine = newMachine(deblob(code.program), registers, memory, 100_000n);
  machine.pc = 5; // accumulation
  const host = accumulateHost(TINY, code, fromHex(vector.pre_state.entropy), []);
  assert.equal(runWithHost(machine, host), "halt");
  const expected = vector.post_state.statistics[0].record.accumulate_gas_used;
  assert.equal(100_000n - machine.gas, BigInt(expected));
});
```

tinyCode's layout is easy to work out by hand. o is 3 bytes, so Q(|o|) is one zone, and a
is (2 · 65,536 + 65,536) / 4,096 = 48. w takes page 48 and the heap page 49, so h is 50.

The last test is the big one. It sets up service 1729 exactly as the vector does, runs its
accumulation through your host, and compares the gas used with the vector's own record.

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

`grow_heap` rounds sizes just as lesson 15.8's Y does, so Y shares its `roundUp`:

**Replace in** `src/pvm/standard.ts`

```ts
/** x rounded up to a whole number of `size`s: the GP's P (pages) and Q (zones). */
export const roundUp = (x: number, size: number) => Math.ceil(x / size) * size;
```

**Add to** `src/host.ts`

```ts
import { addPages, PAGE_SIZE } from "./pvm/memory.ts";
import type { ServiceCode } from "./pvm/program.ts";
import { INPUT_SIZE, roundUp, ZONE } from "./pvm/standard.ts";

/**
 * grow_heap (GP App. B.5, Ω_Gemini): makes the read-write zone's pages writable up to page
 * ω₇ (not including it), and says where the heap ends now. The zone starts at page a, may
 * reach b, and ends at h today. Asking for no more than h, or past b, just reports h.
 */
export function growHeap(m: Machine, code: ServiceCode): HostExit {
  const a = (2 * ZONE + roundUp(code.readOnly.length, ZONE)) / PAGE_SIZE;
  const b = (2 ** 32 - 3 * ZONE - INPUT_SIZE - roundUp(code.stackSize, PAGE_SIZE)) / PAGE_SIZE;
  const writable = [...m.memory].filter(([p, page]) => p >= a && p < b && page.access === "W");
  const h = a + writable.length;
  const want = m.registers[7];
  if (want <= BigInt(h) || want > BigInt(b)) {
    m.registers[7] = BigInt(h);
    return charge(m, 275) ? "continue" : "oog";
  }
  const g = 275n + (want - BigInt(h)) * 121n; // and 121 for each new page
  m.registers[7] = BigInt(h);
  if (m.gas < g) return "oog";
  m.gas -= g;
  addPages(m.memory, h * PAGE_SIZE, (Number(want) - h) * PAGE_SIZE, "W");
  m.registers[7] = want;
  return "continue";
}
```

`h` counts the writable pages between a and b. Only the pages a program has are in the
memory map, so that's a short walk, not a million steps. New pages come from lesson 15.4's
`addPages`, zeroed and writable.

**Replace in** `src/host.ts`

```ts
/**
 * F (GP App. B.4): the host for a service's accumulation. So far it answers gas, grow_heap
 * (which needs the service's code, to know its layout) and fetch, whose items are the
 * constants (0), the entropy η′₀ (1), and the service's inputs, all of them (14) or one
 * (15). Anything else: WHAT.
 */
export function accumulateHost(
  config: Config,
  code: ServiceCode,
  entropy: Bytes,
  inputs: Bytes[],
): Host {
  const items: Items = (kind, index) => {
    if (kind === 0) return protocolConstants(config);
    if (kind === 1) return entropy;
    if (kind === 14) return concatBytes(encodeNatural(BigInt(inputs.length)), ...inputs);
    if (kind === 15 && index < BigInt(inputs.length)) return inputs[Number(index)];
    return undefined;
  };
  return (call, m) => {
    switch (HOST_CALLS[call]) {
      case "gas":
        return gas(m);
      case "grow_heap":
        return growHeap(m, code);
      case "fetch":
        return fetch(m, items);
      default:
        return unknown(m);
    }
  };
}
```

`bin/host.ts` calls `accumulateHost` too, so it passes the service's code along:

**Replace in** `bin/host.ts`

```ts
const answer = accumulateHost(TINY, code, fromHex(vector.pre_state.entropy), []);
```

**Run**

```sh
npm test
# prints: grow_heap: w starts at page 48, and with its heap page the heap ends at 50
# prints: service 1729 accumulates on exactly the 16,417 gas the test vector says
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**Replace in** `bin/host.ts`

```ts
const exit = runWithHost(machine, host);
console.log(`the service stops: ${JSON.stringify(exit)}, using ${100_000n - machine.gas} gas`);
console.log(`the test vector says: ${vector.post_state.statistics[0].record.accumulate_gas_used}`);
run.event("stop", { exit: JSON.stringify(exit), gas: Number(machine.gas) });
```

**Run**

```sh
node bin/host.ts
# prints: host call 1 (grow_heap): ω₇ = 51, 98728 gas left
# prints: the service stops: "halt", using 16417 gas
# prints: the test vector says: 16417
# prints: reported to Grafana
```

Now the bin compares its answer with the vector's. There it is: 16,417, to the last unit
of gas. Every instruction priced by the pipeline of lesson 15.10, every block paid for by
the meter of 15.11, every host call charged its Gray Paper price. And the two `grow_heap` calls? Both ask for page 51, and the heap
already ends at 51 (a = 48, then w and its two heap pages), so each is the cheap kind: 275,
not 1,000. The *Host calls* panel has the conversation, now word for word what the vector
expects.

<details>
<summary>lasair: finding a, in <code>lib/pvm_host.ml</code></summary>

```ocaml
  (* GP grow_heap: a = (2Z + rnq(|o|)) / P is fixed by the program LAYOUT. With
     an RW region present it is the lowest writable page at or above 2Z (the
     RO region and its guard zone lie below; the stack lies far above b).
```

lasair works a out backwards, from the memory rather than the program's sizes: the lowest
writable page above two zones, or, if there's none yet, from the top of the read-only
pages. Same answer, more detective work. Your `accumulateHost` simply hands
`growHeap` the code, as the Gray Paper's F does.

</details>

## What you have

A host that answers gas, fetch and grow_heap, and a real service's accumulation that
matches the test vector to the last unit of gas. Next: the host calls that change things.
