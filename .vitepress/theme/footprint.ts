// Lesson 14.2's second widget: a service's footprint and minimum balance. items is 2 per
// request plus 1 per storage entry; octets is 81 plus the length per request and 34 plus
// key and value lengths per entry; a_t = max(0, 100 + 10·i + o − f), which the balance must
// cover. tools/widget-footprint.test.ts checks the sums against the lesson's code, run and
// check questions.

export type Request = { length: number };
export type Entry = { key: number; value: number }; // lengths
export const BASE = 100n;
export const PER_ITEM = 10n;
export const PER_OCTET = 1n;
export const PER_REQUEST = 81;
export const PER_ENTRY = 34;
export const U64_MAX = (1n << 64n) - 1n;

/** The footprint: items and octets, as the lesson's footprint counts them. */
export function footprint(storage: Entry[], requests: Request[]): { items: number; bytes: bigint } {
  const items = 2 * requests.length + storage.length;
  let bytes = 0n;
  for (const { length } of requests) bytes += BigInt(PER_REQUEST + length);
  for (const { key, value } of storage) bytes += BigInt(PER_ENTRY + key + value);
  return { items, bytes };
}
/** a_t: the least balance a service must keep, and the sum written out. */
export function minimumBalance(items: number, bytes: bigint, gratis: bigint): { owed: bigint; terms: string } {
  const deposit = BASE + PER_ITEM * BigInt(items) + PER_OCTET * bytes;
  const owed = deposit - gratis;
  const fmt = (n: bigint) => n.toLocaleString("en-US");
  return { owed: owed > 0n ? owed : 0n, terms: `100 + 10 × ${items} + ${fmt(bytes)} − ${fmt(gratis)} = ${fmt(owed)}${owed < 0n ? ", so 0" : ""}` };
}

/** The accounts the lesson turns on. */
export type Preset = { name: string; storage: Entry[]; requests: Request[]; balance: bigint; gratis: bigint };
export const PRESETS: Preset[] = [
  { name: "service 0 (the bootstrap)", storage: [], requests: [{ length: 159_322 }, { length: 50 }], balance: U64_MAX, gratis: U64_MAX },
  { name: "service 0 with no free allowance", storage: [], requests: [{ length: 159_322 }, { length: 50 }], balance: 200_000n, gratis: 0n },
  { name: "lesson 16.4's made-up record", storage: [], requests: [], balance: 1_000n, gratis: 0n, },
];
/** Lesson 16.4's record keeps 2 items in 50 bytes, as the account's counters say, with nothing listed. */
export const TINY_INFO = { items: 2, bytes: 50n };
