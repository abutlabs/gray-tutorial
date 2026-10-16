// Lesson 16.5's widget: write (Ω_W) on the tests' made-up account, step by step. The gas is
// charged first; then the account as it would be after (items ± 1, bytes ± 34 + |key| +
// |value|); if its a_t would pass the balance, FULL and nothing changes; else the value is
// stored (or deleted, if empty) and φ₇ is the old value's length, or NONE.
// tools/widget-write-store.test.ts checks every case against the lesson's tests.

export const NONE = "NONE";
export const FULL = "FULL";
const memoryGas = (rate: number, length: number) => Math.ceil((rate * length) / 1024);
/** The tests' account: 2 items in 50 bytes, a balance of 1,000. */
export const START = { items: 2, bytes: 50, balance: 1000, storage: {} as Record<string, number> };
export type Account = typeof START;
export const minimumBalance = (a: { items: number; bytes: number }): number => 100 + 10 * a.items + a.bytes;

export type Write = { gas: number; old: number | null; after: Account; aT: number; full: boolean; r7: string };
/** write(key, a value of `length` bytes; 0 deletes) on `account`. */
export function write(account: Account, key: string, length: number): Write {
  const gas = 2442 + memoryGas(3358, key.length) + memoryGas(216, length);
  const old = key in account.storage ? account.storage[key] : null;
  const size = (v: number | null) => (v === null ? 0 : 34 + key.length + v);
  const value = length === 0 ? null : length;
  const after: Account = {
    ...account,
    items: account.items + (value !== null ? 1 : 0) - (old !== null ? 1 : 0),
    bytes: account.bytes + size(value) - size(old),
    storage: { ...account.storage },
  };
  const aT = minimumBalance(after);
  if (aT > after.balance) return { gas, old, after: account, aT, full: true, r7: FULL };
  if (value === null) delete after.storage[key];
  else after.storage[key] = value;
  return { gas, old, after, aT, full: false, r7: old === null ? NONE : String(old) };
}
