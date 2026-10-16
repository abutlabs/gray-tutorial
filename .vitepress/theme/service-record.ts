// Lesson 14.2's first widget: a service account's 89-byte record, field by field, in the
// order the lesson's ServiceInfo codec writes it. The values are service 0's in the state
// before block 1 of the fallback trace, as the lesson's run prints them, encoded here by
// codec-map.ts. tools/widget-service-record.test.ts checks the fields against the lesson's
// codec and the bytes against what the lessons' own client encodes.

import { encodeMapped, flatten, short } from "./codec-map.ts";
import type { Json, Node, Type } from "./codec-map.ts";

/** ServiceInfo, as lesson 14.2's record writes it, with the Gray Paper's letter for each field. */
export const SERVICE_INFO: Type = {
  record: [
    ["version", "u8"], ["code_hash", "hash"], ["balance", "u64"], ["min_item_gas", "u64"], ["min_memo_gas", "u64"],
    ["bytes", "u64"], ["deposit_offset", "u64"], ["items", "u32"], ["creation_slot", "u32"], ["last_accumulation_slot", "u32"], ["parent_service", "u32"],
  ],
};
export const LETTER: Record<string, string> = {
  version: "–", code_hash: "c", balance: "b", min_item_gas: "g", min_memo_gas: "m", bytes: "o", deposit_offset: "f", items: "i",
  creation_slot: "r", last_accumulation_slot: "a", parent_service: "p",
};
export const SAYS: Record<string, string> = {
  version: "0, the record's version",
  code_hash: "the service's code, which it keeps as a preimage",
  balance: "its tokens",
  min_item_gas: "the least gas per work-item",
  min_memo_gas: "the least gas per transfer memo",
  bytes: "the octets of state it takes up",
  deposit_offset: "storage it gets for free, gratis",
  items: "how many things it keeps",
  creation_slot: "created at",
  last_accumulation_slot: "last accumulated at",
  parent_service: "created by: its parent",
};

/** Service 0 before fallback block 1 (the two 2^64 − 1 values as decimal strings, which encode exactly). */
export const SERVICE_0: Json = {
  version: 0,
  code_hash: "0x128fc8f0578f393bd12da1e73e030afe53fde62069fc8f6f87a5c914b1843135",
  balance: "18446744073709551615",
  min_item_gas: 10,
  min_memo_gas: 10,
  bytes: 159534,
  deposit_offset: "18446744073709551615",
  items: 4,
  creation_slot: 0,
  last_accumulation_slot: 0,
  parent_service: 0,
};
export const RECORD = encodeMapped(SERVICE_INFO, SERVICE_0);
export const FIELDS: Node[] = flatten(RECORD.root).filter((n) => n.path !== "");
export const RECORD_BYTES = RECORD.bytes.length;

/** A field's value, as a reader would say it. */
export function valueOf(n: Node): string {
  if (n.path === "code_hash") return `${short(RECORD.bytes.slice(n.start, n.end))}`;
  const v = String(n.json);
  return v === "18446744073709551615" ? "2^64 − 1 = 18,446,744,073,709,551,615" : Number(v).toLocaleString("en-US");
}
/** The goals: things to find in the record. */
export const GOALS = [
  { id: "code", say: "find the code hash: the only 32-byte field", reached: (p: string) => p === "code_hash" },
  { id: "max", say: "find 2^64 − 1, twice", reached: (p: string) => p === "balance" || p === "deposit_offset" },
  { id: "four", say: "find a 4-byte field", reached: (p: string) => ["items", "creation_slot", "last_accumulation_slot", "parent_service"].includes(p) },
];
