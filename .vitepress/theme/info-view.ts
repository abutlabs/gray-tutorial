// Lesson 16.4's widget: the 96 bytes info hands out, beside the 89-byte record the state
// keeps (lesson 14.2). The same account, made up as the tests make it; info drops the
// version, works out a_t on the spot, and puts f after i. tools/widget-info-view.test.ts
// checks both against the lessons' code and tests.

import type { Json, Node, Type } from "./codec-map.ts";
import { encodeMapped, flatten } from "./codec-map.ts";
import { SERVICE_INFO } from "./service-record.ts";

/** tinyInfo: a balance of 1,000, 2 items in 50 bytes, created at slot 5. */
export const TINY_INFO = {
  version: 0, code_hash: "0x" + "09".repeat(32), balance: 1000, min_item_gas: 10, min_memo_gas: 20,
  bytes: 50, deposit_offset: 0, items: 2, creation_slot: 5, last_accumulation_slot: 0, parent_service: 0,
};
/** a_t: B_S + B_I·i + B_L·o − f, at least 0 (lesson 14.2's minimumBalance). */
export const minimumBalance = (i: { items: number; bytes: number; deposit_offset: number }): number =>
  Math.max(0, 100 + 10 * i.items + i.bytes - i.deposit_offset);
/** What info writes, in its order. */
export const INFO_VIEW: Type = {
  record: [
    ["code_hash", "hash"], ["balance", "u64"], ["min_balance", "u64"], ["min_item_gas", "u64"], ["min_memo_gas", "u64"],
    ["bytes", "u64"], ["items", "u32"], ["deposit_offset", "u64"], ["creation_slot", "u32"], ["last_accumulation_slot", "u32"], ["parent_service", "u32"],
  ],
};
export const STATE = encodeMapped(SERVICE_INFO, TINY_INFO as Json);
export const INFO = encodeMapped(INFO_VIEW, { ...TINY_INFO, min_balance: minimumBalance(TINY_INFO) } as Json);
const byPath = (root: Node) => new Map(flatten(root).filter((n) => n.path).map((n) => [n.path, n]));
export const STATE_PARTS = byPath(STATE.root);
export const INFO_PARTS = byPath(INFO.root);
export const FIELDS = [...new Set([...STATE.root.children, ...INFO.root.children].map((n) => n.path))];
export const LETTER: Record<string, string> = {
  version: "–", code_hash: "c", balance: "b", min_balance: "a_t", min_item_gas: "g", min_memo_gas: "m", bytes: "o",
  deposit_offset: "f", items: "i", creation_slot: "r", last_accumulation_slot: "a", parent_service: "p",
};
/** Which account φ₇ picks, for service 0 running: itself, service 0, or nobody. */
export const WHO = [
  { r7: "2^64 − 1", says: "itself", found: true },
  { r7: "0", says: "service 0", found: true },
  { r7: "42", says: "service 42", found: false },
];
