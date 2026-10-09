# Asking for preimages

Lesson 16.8's `lookup` reads the preimages a service already has. But how does a preimage
get there? The service *asks* for it. It files a request: "I want the data whose hash is
h, z bytes long". Later a block provides it (lesson 14.1), and later still the service may
let it go. This lesson gives a running service the three host calls for that: `solicit`
to ask, `query` to see how the asking is going, and `forget` to give up.

## What the Gray Paper says

Each request is a pair, the hash h and the length z, and its value is a short history of
up to three slots (§9):

| History | Meaning |
| --- | --- |
| [] | asked for, not provided yet |
| [x] | provided at slot x |
| [x, y] | provided at x, forgotten at y |
| [x, y, w] | provided at x, forgotten at y, asked for again at w |

The three calls (App. B.7) all take the hash from memory at ω₇ and the length from ω₈.
A length of 2^32 or more is HUH (no preimage is that long); an unreadable hash, a panic.
Then:

- **`solicit`** (24, 2,193 gas) asks. A new request starts as []; one that's been forgotten,
  [x, y], is asked for again: [x, y, t]. Anything else is HUH. A request takes deposit
  (lesson 14.2: 2 items, and 81 + z bytes), so if the balance can't cover it: FULL.
- **`forget`** (25, 3,250 gas) gives up. A request never provided, [], goes, and so does one
  forgotten more than D slots ago, [x, y] with y < t − D: the request and the preimage, and
  the deposit with them. One that's provided, [x], is marked forgotten now: [x, t]. One asked
  for again, [x, y, w] with y long enough ago, becomes [w, t]. Anything else: HUH.
- **`query`** (23, 643 gas) reports: ω₇ = the number of slots plus 2^32 times the first,
  ω₈ = the second plus 2^32 times the third. No such request: NONE, and ω₈ = 0.

D is the expunge period, `expunge_period` in the config: 32 slots on tiny. t is the slot of
the block, so accumulation's host needs to know it now.

## The tests

The tests' accounts get requests, and the helpers pass the slot:

**Replace in** `test/host.test.ts`

```ts
/** The accounts the tests' accumulation sees: service 0, with tinyInfo's record. */
function tinyAccounts(): Map<number, Account> {
  const account = { info: tinyInfo(), storage: new Map(), preimages: new Map() };
  return new Map([[0, { ...account, requests: new Map() }]]);
}

/** Accumulation's host, for service 0 with a tiny program, an entropy of sevens, no inputs. */
const accumulating = accumulateHost(TINY, {
  id: 0,
  accounts: tinyAccounts(),
  checkpoint: tinyAccounts(),
  code: tinyCode(),
  entropy: new Uint8Array(32).fill(7),
  inputs: [],
}, 0);

/** Service 1729's accumulation, set up as always_accumulate-1 has it: machine and host. */
function vectorService() {
  const { a, slot, expected } = vectorAccumulation();
  const [t, s] = [BigInt(slot), BigInt(a.id)]; // the slot, the service, no inputs
  const args = Uint8Array.from([...encodeNatural(t), ...encodeNatural(s), ...encodeNatural(0n)]);
  const { memory, registers } = standardProgram(a.code, args);
  const machine = newMachine(deblob(a.code.program), registers, memory, 100_000n);
  machine.pc = 5; // accumulation
  return { machine, host: accumulateHost(TINY, a, slot), expected };
}
```

**Add to** `test/host.test.ts`

```ts
import { forget, HUH, OK, query, solicit } from "../src/host.ts";

const HASH = new Uint8Array(32).fill(5);

/** A machine about to make a request: ω₇ points at a hash of fives, ω₈ = the length. */
function requesting(length: bigint) {
  const memory = new Map();
  addPages(memory, 0x20000, 4096, "W");
  writeMemory(memory, 0x20000n, HASH);
  const registers = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0x20000n, length];
  return newMachine(assemble([[0]]), registers, memory, 10_000n);
}

test("solicit: a request with no slots yet, and 2 items and 81 + 100 bytes more to pay for", () => {
  const a = bundle();
  const machine = requesting(100n);
  assert.equal(solicit(machine, a, 7), "continue");
  assert.equal(machine.registers[7], OK);
  const account = a.accounts.get(0)!;
  assert.deepEqual(account.requests.get(`${toHex(HASH)}:100`), []);
  assert.deepEqual([account.info.items, account.info.bytes], [4, 50n + 81n + 100n]);
  const asking = requesting(100n);
  query(asking, a);
  assert.deepEqual(asking.registers.slice(7, 9), [0n, 0n]); // asked for, no slots yet
});

test("asking twice is HUH, and so is a length no preimage can have", () => {
  const a = bundle();
  solicit(requesting(100n), a, 7);
  const again = requesting(100n);
  solicit(again, a, 8);
  assert.equal(again.registers[7], HUH);
  const huge = requesting(2n ** 32n);
  solicit(huge, a, 8);
  assert.equal(huge.registers[7], HUH);
});

test("forget: a request never provided just goes; one provided at x becomes [x, t]", () => {
  const a = bundle();
  solicit(requesting(100n), a, 7);
  forget(requesting(100n), a, 9, TINY.expunge_period);
  assert.equal(a.accounts.get(0)!.requests.size, 0);
  a.accounts.get(0)!.requests.set(`${toHex(HASH)}:100`, [3]); // provided at slot 3
  forget(requesting(100n), a, 9, TINY.expunge_period);
  const asking = requesting(100n);
  query(asking, a);
  assert.deepEqual(asking.registers.slice(7, 9), [2n + 3n * 2n ** 32n, 9n]); // 2 slots: 3, 9
});
```

The vector checks look at requests and footprints too now, and three more vectors join:
in `preimage_len_bound`, service 0 solicits and queries around the length bound.

**Replace in** `test/accumulate.test.ts`

```ts
/** Checks service s's accumulation in test vector `name` against the vector's post-state. */
function checkVector(name: string, s: number) {
  const { result, gas, after } = runVector(name, s);
  assert.equal(result.gasUsed, gas);
  const mine = result.accounts.get(s)!;
  assert.deepEqual(mine.storage, after.storage);
  assert.deepEqual(mine.requests, after.requests);
  assert.deepEqual([mine.info.items, mine.info.bytes], [after.info.items, after.info.bytes]);
}

/** The vectors whose services need no host calls beyond this part's so far. */
const CASES: [string, number][] = [
  ["always_accumulate-1", 1729],
  ["always_accumulate-2", 1729],
  ["lookup_foreign_preimage-1", 0],
  ["lookup_foreign_preimage-2", 0],
  ["preimage_len_bound-1", 0],
  ["preimage_len_bound-2", 0],
  ["preimage_len_bound-3", 0],
  ["process_one_immediate_report-1", 1729],
  ["queues_are_shifted-1", 1729],
  ["same_code_different_services-1", 1729],
  ["same_round_storage_isolation-1", 1729],
  ["same_round_storage_isolation-1", 1730],
  ["same_round_storage_isolation-2", 1730],
];
```

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

An account gains its requests. The key is the hash and length as one string,
"hash:length", since a `Map` can't compare pairs:

**Replace in** `src/services.ts`

```ts
/**
 * A service account (GP §9) as accumulation sees it: its record, its storage, the
 * preimages it keeps, each under its hash, and its requests for preimages: for each hash
 * and length ("hash:length"), the slots it was asked for, provided, and so on. Keys in hex.
 */
export type Account = {
  info: ServiceInfo;
  storage: Map<string, Bytes>;
  preimages: Map<string, Bytes>;
  requests: Map<string, number[]>;
};

/** An account as the accumulate test vectors write it. */
export type AccountJson = {
  service: unknown;
  storage: { key: string; value: string }[];
  preimage_blobs: { hash: string; blob: string }[];
  preimage_requests: { key: { hash: string; length: number }; value: number[] }[];
};

/** An account from the accumulate test vectors' JSON. */
export function accountFromJson(json: AccountJson): Account {
  const storage = new Map(json.storage.map((e) => [e.key, fromHex(e.value)]));
  const preimages = new Map(json.preimage_blobs.map((p) => [p.hash, fromHex(p.blob)]));
  const requests = new Map(
    json.preimage_requests.map((r) => [`${r.key.hash}:${r.key.length}`, r.value]),
  );
  return { info: ServiceInfo.fromJson(json.service), storage, preimages, requests };
}

/** A copy of the accounts that changes to the originals can't reach. */
export function copyAccounts(accounts: Map<number, Account>): Map<number, Account> {
  const copy = (a: Account) => ({
    info: { ...a.info },
    storage: new Map(a.storage),
    preimages: new Map(a.preimages),
    requests: new Map([...a.requests].map(([k, slots]) => [k, [...slots]])),
  });
  return new Map([...accounts].map(([id, a]) => [id, copy(a)]));
}
```

**Add to** `src/host.ts`

```ts
export const HUH = 2n ** 64n - 9n; // that can't be done now

/** The hash a request names, in memory at ω₇, in hex; none if it isn't readable. */
function requestedHash(m: Machine): string | undefined {
  const hash = readMemory(m.memory, m.registers[7], 32);
  return hash instanceof Uint8Array ? toHex(hash) : undefined;
}

/**
 * query (GP App. B.7, Ω_Q): what has become of the service's request for the preimage of
 * ω₇'s hash, ω₈ bytes long. The slots in its history come back packed into ω₇ and ω₈:
 * their count in ω₇'s low 32 bits, the first above it, the second and third in ω₈.
 */
export function query(m: Machine, a: Accumulation): HostExit {
  if (!charge(m, 643)) return "oog";
  const [length, hash] = [m.registers[8], requestedHash(m)];
  if (length >= 2n ** 32n) return setTo(m, HUH); // no preimage is that long
  if (!hash) return "panic"; // the hash isn't readable
  const slots = a.accounts.get(a.id)!.requests.get(`${hash}:${length}`);
  if (!slots) {
    [m.registers[7], m.registers[8]] = [NONE, 0n];
    return "continue";
  }
  const [x, y, z] = slots.map(BigInt);
  m.registers[7] = BigInt(slots.length) + (x ?? 0n) * 2n ** 32n;
  m.registers[8] = (y ?? 0n) + (z ?? 0n) * 2n ** 32n;
  return "continue";
}

/**
 * solicit (GP App. B.7, Ω_S): asks for the preimage of ω₇'s hash, ω₈ bytes long. A new
 * request starts with no slots; one already provided and since forgotten ([x, y]) is asked
 * for again at slot t. Anything else: HUH. A request costs deposit (lesson 14.2): FULL if
 * the balance can't cover it.
 */
export function solicit(m: Machine, a: Accumulation, t: number): HostExit {
  if (!charge(m, 2193)) return "oog";
  const [length, hash] = [m.registers[8], requestedHash(m)];
  if (length >= 2n ** 32n) return setTo(m, HUH);
  if (!hash) return "panic";
  const account = a.accounts.get(a.id)!;
  const key = `${hash}:${length}`;
  const slots = account.requests.get(key);
  if (slots && slots.length !== 2) return setTo(m, HUH);
  const { items, bytes } = account.info;
  const added = { ...account.info, items: items + 2, bytes: bytes + 81n + length }; // 14.2
  const info = slots ? account.info : added;
  if (info.balance < minimumBalance(info)) return setTo(m, FULL);
  account.requests.set(key, slots ? [...slots, t] : []);
  account.info = info;
  return setTo(m, OK);
}

/**
 * forget (GP App. B.7, Ω_F): gives up on the preimage of ω₇'s hash, ω₈ bytes long. A
 * request never provided, or provided and forgotten more than D slots ago, goes, preimage
 * and all. One provided at x is marked forgotten now, [x, t]; one asked for again after
 * that ([x, y, w], y long enough ago) becomes [w, t]. Anything else: HUH.
 */
export function forget(m: Machine, a: Accumulation, t: number, D: number): HostExit {
  if (!charge(m, 3250)) return "oog";
  const [length, hash] = [m.registers[8], requestedHash(m)];
  if (length >= 2n ** 32n) return setTo(m, HUH);
  if (!hash) return "panic";
  const account = a.accounts.get(a.id)!;
  const key = `${hash}:${length}`;
  const slots = account.requests.get(key);
  const expired = (y: number) => y < t - D;
  if (slots?.length === 0 || (slots?.length === 2 && expired(slots[1]))) {
    account.requests.delete(key);
    account.preimages.delete(hash);
    const { items, bytes } = account.info;
    account.info = { ...account.info, items: items - 2, bytes: bytes - 81n - length };
  } else if (slots?.length === 1) {
    account.requests.set(key, [slots[0], t]);
  } else if (slots?.length === 3 && expired(slots[1])) {
    account.requests.set(key, [slots[2], t]);
  } else {
    return setTo(m, HUH);
  }
  return setTo(m, OK);
}

/** ω₇ = an answer, and carry on. */
function setTo(m: Machine, answer: bigint): HostExit {
  m.registers[7] = answer;
  return "continue";
}
```

All three check the length *before* reading the hash, in the Gray Paper's order: an absurd
length is HUH even when the hash is unreadable too. `solicit` works out the account with
the request's deposit added, exactly as `write` did with storage, and keeps it only if the
balance covers it.

Accumulation's host takes the slot, and Ψ_A hands it over:

**Replace in** `src/host.ts`

```ts
/**
 * F (GP App. B.4): the host for a service's accumulation. So far it answers gas, grow_heap,
 * fetch (whose items are the constants, 0; the entropy, 1; and the inputs, all of them, 14,
 * or one, 15), info, lookup, read, write, checkpoint, query, solicit and forget, the last
 * two at `slot`, the time of the block. Anything else: WHAT.
 */
export function accumulateHost(config: Config, a: Accumulation, slot: number): Host {
  const items: Items = (kind, index) => {
    if (kind === 0) return protocolConstants(config);
    if (kind === 1) return a.entropy;
    if (kind === 14) return concatBytes(encodeNatural(BigInt(a.inputs.length)), ...a.inputs);
    if (kind === 15 && index < BigInt(a.inputs.length)) return a.inputs[Number(index)];
    return undefined;
  };
  return (call, m) => {
    switch (HOST_CALLS[call]) {
      case "gas":
        return gas(m);
      case "grow_heap":
        return growHeap(m, a.code);
      case "fetch":
        return fetch(m, items);
      case "info":
        return info(m, a.accounts, a.id);
      case "lookup":
        return lookup(m, a.accounts, a.id);
      case "read":
        return read(m, a.accounts, a.id);
      case "write":
        return write(m, a.accounts, a.id);
      case "checkpoint":
        return checkpoint(m, a);
      case "query":
        return query(m, a);
      case "solicit":
        return solicit(m, a, slot);
      case "forget":
        return forget(m, a, slot, config.expunge_period);
      default:
        return unknown(m);
    }
  };
}

/**
 * Ψ_A (GP App. B.4), so far: runs service a.id's accumulation at `slot` on `gas`, through
 * accumulation's host, and collapses what it did. `watch`, if given, sees each host call.
 */
export function accumulate(
  config: Config,
  a: Accumulation,
  slot: number,
  gas: bigint,
  watch?: (call: number, m: Machine) => void,
): Accumulated {
  const [t, s, n] = [slot, a.id, a.inputs.length].map((x) => encodeNatural(BigInt(x)));
  const { memory, registers } = standardProgram(a.code, concatBytes(t, s, n)); // Ψ_M's Y
  const machine = newMachine(deblob(a.code.program), registers, memory, gas);
  machine.pc = 5; // accumulation's way in
  const host = accumulateHost(config, a, slot);
  const exit = runWithHost(machine, (call, m) => {
    const answer = host(call, m);
    watch?.(call, m);
    return answer;
  });
  const gasUsed = gas - (machine.gas > 0n ? machine.gas : 0n); // u = g − max(ϱ′, 0)
  return { exit, accounts: collapse(a, exit), gasUsed };
}
```

**Run**

```sh
npm test
# prints: solicit: a request with no slots yet, and 2 items and 81 + 100 bytes more to pay for
# prints: preimage_len_bound-3: service 0 ends as the vector says
# prints: fail 0
# prints: reported
npm run typecheck
```

Thirteen official vectors now pass end to end, and the checks are stricter: storage,
requests, items and bytes, all as the vectors leave them.

## Watch it

**Run**

```sh
node bin/accumulate.ts ../vectors/stf/accumulate/tiny/preimage_len_bound-1.json
# prints: service 0: 1 input(s)
# prints: reported to Grafana
```

<details>
<summary>lasair: the length bound, in <code>lib/pvm_host.ml</code></summary>

```ocaml
  (* GP 0.8.0 solicit: HUH when z is not a valid blob length (z >= 2^32),
     checked BEFORE the hash read (so no panic on an unreadable o). *)
  if Int64.unsigned_compare z_u64 0x1_0000_0000L >= 0 then
    Some { new_gas; new_regs = set_reg regs 7 result_huh; new_mem = mem;
           new_service = None; new_context = None }
```

The same order as yours, spelled out in the comment because it's the kind of detail that
slips: read the hash first and an unreadable one panics the machine, where the Gray Paper
says HUH and carry on. lasair's registers are signed 64-bit integers, so it compares them
with `unsigned_compare`; your `bigint`s just compare.

</details>

## What you have

Services that ask for data, check on it, and let it go, paying deposit for each request
while it lasts. Thirteen official accumulate vectors passing.
