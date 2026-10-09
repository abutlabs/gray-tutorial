# The service account

Every service has an **account**: a record of who it is and what it owns. Its code (by
hash), its balance, the least gas it'll accept to do work, and a running tally of how
much state it takes up, because storage on JAM isn't free. A service must keep enough
balance to cover what it stores, like a deposit. This lesson reads the account out of
the state, and checks the tally adds up. Then Part 14 is done.

## What the Gray Paper says

§9 (*Service Accounts*) and Appendix D. Under C(255, s) (lesson 6.2), the state keeps
the account's record, 89 bytes:

| Field | Bytes | Meaning |
| --- | --- | --- |
| version | 1 | 0 |
| c, code hash | 32 | the service's code, which it keeps as a preimage (lesson 14.1) |
| b, balance | 8 | its tokens |
| g, m | 8 + 8 | the least gas per work-item, and per transfer memo |
| o, octets | 8 | bytes of state it takes up |
| f, gratis | 8 | storage it gets for free |
| i, items | 4 | things it keeps |
| r, a, p | 4 + 4 + 4 | created at, last accumulated at, created by (its parent) |

**The footprint**: items is 2 for each request plus 1 for each storage entry; octets is
81 plus the data's length for each request, plus 34 plus the key's and value's lengths
for each storage entry. (The 81 and the 34 are flat amounts for the bookkeeping around
each one, on top of the data itself.)

**The minimum balance**, a_t, is max(0, 100 + 10·i + 1·o − f): a base deposit of 100,
10 per item and 1 per octet, less the free allowance.

## The tests

**Add to** `test/services.test.ts`

```ts
import { footprint, minimumBalance, readService, ServiceInfo } from "../src/services.ts";

test("service 0 in real state: its code beside it, and its footprint adding up", () => {
  const { entries } = traceState("fallback", 1);
  const service = readService(entries, 0);
  const code = entries.find((e) => toHex(blake2b256(e.value)) === toHex(service.code_hash));
  assert.equal(code?.value.length, 159322); // its code: a preimage it keeps, lesson 6.1's giant
  const preimages = entries.filter((e) => toHex(e.key) === toHex(preimageKey(0, e.value)));
  const requests = preimages.map((p) => ({ length: p.value.length })); // all provided
  assert.deepEqual(footprint([], requests), { items: service.items, bytes: service.bytes });
});

/** An account in the accumulate vectors: its record, its storage, its requests. */
type VectorAccount = {
  data: {
    service: unknown;
    storage: { key: string; value: string }[];
    preimage_requests: { key: { length: number } }[];
  };
};

test("footprints and minimum balances: 510 accounts in the accumulate vectors", () => {
  let accounts = 0;
  for (const size of ["tiny", "full"]) {
    for (const name of vectorFiles(`stf/accumulate/${size}`)) {
      const { pre_state, post_state } = vectorJson(name) as {
        pre_state: { accounts: VectorAccount[] };
        post_state: { accounts: VectorAccount[] };
      };
      for (const { data } of [...pre_state.accounts, ...post_state.accounts]) {
        const info = ServiceInfo.fromJson(data.service);
        const storage = data.storage.map((e) => ({ key: fromHex(e.key), value: fromHex(e.value) }));
        const requests = data.preimage_requests.map((r) => r.key);
        assert.deepEqual(footprint(storage, requests), { items: info.items, bytes: info.bytes });
        assert.ok(info.balance >= minimumBalance(info), name);
        accounts++;
      }
    }
  }
  assert.equal(accounts, 510);
});
```

Two sources again. In the real state, service 0's code is right there beside its
account: some value whose hash is the code hash, lesson 6.1's 159,322-byte giant. Its
footprint is two preimages, each with its request, and nothing in storage: 4 items, and
81 + 159,322 + 81 + 50 = 159,534 octets. The accumulate vectors (Part 17's) list
accounts with storage too, 510 snapshots of them, and every footprint and every balance
checks out.

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

**Add to** `src/services.ts`

```ts
import { hash, record, u64, u8 } from "./codec/codec.ts";
import type { Value } from "./codec/codec.ts";
import type { Bytes } from "./bytes.ts";
import { accountKey } from "./state.ts";

/** A service's account record, C(255, s) (GP §9, App. D), under the test vectors' names. */
export const ServiceInfo = record({
  version: u8, // 0
  code_hash: hash, // c: the hash of the service's code, itself a preimage it keeps
  balance: u64, // b
  min_item_gas: u64, // g: the least gas to accumulate each work-item
  min_memo_gas: u64, // m: the least gas for each transfer's memo
  bytes: u64, // o: the octets its storage, preimages and requests take
  deposit_offset: u64, // f: gratis storage, a discount on the deposit below
  items: u32, // i: how many things it keeps
  creation_slot: u32, // r
  last_accumulation_slot: u32, // a
  parent_service: u32, // p: the service that created it
});
export type ServiceInfo = Value<typeof ServiceInfo>;

/** A service's account record, read from the state (lesson 6.2's C(255, s)). */
export function readService(entries: KeyValue[], s: number): ServiceInfo {
  const key = toHex(accountKey(s));
  const entry = entries.find((e) => toHex(e.key) === key);
  if (!entry) throw new Error(`the state has no service ${s}`);
  return decode(ServiceInfo, entry.value);
}

/**
 * The footprint (GP §9): items is 2 per request and 1 per storage entry; bytes is 81 plus
 * the length per request, and 34 plus key and value lengths per storage entry.
 */
export function footprint(
  storage: { key: Bytes; value: Bytes }[],
  requests: { length: number }[],
): { items: number; bytes: bigint } {
  const items = 2 * requests.length + storage.length;
  let bytes = 0n;
  for (const { length } of requests) bytes += BigInt(81 + length);
  for (const { key, value } of storage) bytes += BigInt(34 + key.length + value.length);
  return { items, bytes };
}

/** a_t (GP §9): the least balance a service must keep for what it stores. */
export function minimumBalance(info: ServiceInfo): bigint {
  const deposit = 100n + 10n * BigInt(info.items) + info.bytes; // B_S + B_I·i + B_L·o
  const owed = deposit - info.deposit_offset;
  return owed > 0n ? owed : 0n;
}
```

The record uses the vectors' field names, so `fromJson` reads them for free, and the
Gray Paper's letters are in the comments. The 8-byte fields are `u64`, so they're
`bigint`s, and so the footprint's `bytes` is a `bigint` too (lesson 1.2: a `number` would
lose precision past 2^53).

**Run**

```sh
npm test
# prints: service 0 in real state: its code beside it, and its footprint adding up
# prints: footprints and minimum balances: 510 accounts in the accumulate vectors
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**New file** `bin/service.ts`

```ts
// Reads a service's account from the state before a trace's block: its record, its code,
// and what it must keep in its balance for what it stores.
// Usage: node bin/service.ts <trace.json> [service id, 0 unless you say], e.g.
//        node bin/service.ts ../vectors/traces/storage/00000100.json

import { readFileSync } from "node:fs";
import { fromHex, toHex } from "../src/bytes.ts";
import { blake2b256 } from "../src/hash.ts";
import { Run } from "../src/obs.ts";
import { minimumBalance, readService } from "../src/services.ts";
import type { KeyValue } from "../src/trie.ts";

const [file, id] = process.argv.slice(2);
const s = Number(id ?? 0);
const trace = JSON.parse(readFileSync(file, "utf8"));
const entries: KeyValue[] = trace.pre_state.keyvals.map((e: { key: string; value: string }) => ({
  key: fromHex(e.key),
  value: fromHex(e.value),
}));
const service = readService(entries, s);
const code = entries.find((e) => toHex(blake2b256(e.value)) === toHex(service.code_hash));
const run = new Run("service");
const lines = [
  `service ${s}, created at slot ${service.creation_slot} by service ${service.parent_service}`,
  `code hash ${toHex(service.code_hash).slice(0, 18)}…: ${code?.value.length} bytes of code`,
  `keeps ${service.items} items in ${service.bytes} bytes`,
  `balance ${service.balance}, of which it must keep ${minimumBalance(service)}`,
  `last accumulated at slot ${service.last_accumulation_slot}`,
];
for (const line of lines) {
  console.log(line);
  run.event("fact", { line });
}
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/service.ts ../vectors/traces/fallback/00000001.json
# prints: 159322 bytes of code
# prints: keeps 4 items in 159534 bytes
# prints: balance 18446744073709551615, of which it must keep 0
# prints: reported to Grafana
```

That balance is 2^64 − 1, the largest 8-byte number there is, and its free allowance is
the same. It's the trace's bootstrap service, set up to never run short. Now the same
service a hundred blocks into the `storage` trace,
`../vectors/traces/storage/00000100.json`: 147 items in 170,189 bytes, and last
accumulated at slot 98. It has been busy. The *Service* panel shows the account.

<details>
<summary>lasair: <code>load_service_account</code>, in <code>conformance/stf_guarantees.ml</code></summary>

```ocaml
        let code_hash = Bytes.sub data 1 32 in
        let balance = if Bytes.length data >= 41 then read_i64_le data 33 else 0L in
        let min_acc_gas = if Bytes.length data >= 49 then read_i64_le data 41 else 0L in
        let min_memo_gas = if Bytes.length data >= 57 then read_i64_le data 49 else 0L in
        let octets = if Bytes.length data >= 65 then Int64.to_int (read_i64_le data 57) else 0 in
```

Every offset worked out by hand, 33, 41, 49, 57 and on to 85. Your `record` does that
arithmetic for you. One more thing worth noticing: OCaml's `Int64` is *signed*, so the
bootstrap service's balance, 2^64 − 1, has the same bits as −1 there, and any code
comparing balances has to remember to compare them as unsigned. Your `bigint` simply
holds 18,446,744,073,709,551,615.

</details>

## What you have

Part 14, done: services get the data they asked for, and your client can read any
service's account and check that its footprint and its balance add up.

Next: [Part 15 · The PVM](../15-the-pvm/index.md)
