// Lesson 16.2's second widget: fetch's item 0, the 29 protocol constants in 122 bytes, as a
// parcel. Each in its fixed width, little-endian, in the Gray Paper's order; nine of them
// differ between tiny and full. The widths and values are the lesson's protocolConstants
// and configs; tools/widget-protocol-constants.test.ts checks them.

import type { Json, Type } from "./codec-map.ts";
import { encodeMapped } from "./codec-map.ts";
import { makeParcel } from "./parcel.ts";
import type { Parcel } from "./parcel.ts";

type Width = "u16" | "u32" | "u64";
/** The constants in order: letter, width, tiny and full values, and what each is. */
export const FIELDS: { key: string; width: Width; tiny: number; full: number; says: string }[] = [
  { key: "B_I", width: "u64", tiny: 10, full: 10, says: "the deposit a service holds per item it stores" },
  { key: "B_L", width: "u64", tiny: 1, full: 1, says: "the deposit per byte it stores" },
  { key: "B_S", width: "u64", tiny: 100, full: 100, says: "the base deposit of any service" },
  { key: "C", width: "u16", tiny: 2, full: 341, says: "the number of cores" },
  { key: "D", width: "u32", tiny: 32, full: 19_200, says: "slots before a forgotten preimage may be expunged" },
  { key: "E", width: "u32", tiny: 12, full: 600, says: "slots in an epoch" },
  { key: "G_A", width: "u64", tiny: 10_000_000, full: 10_000_000, says: "the gas to accumulate one work item" },
  { key: "G_I", width: "u64", tiny: 50_000_000, full: 50_000_000, says: "the gas for checking authorization" },
  { key: "G_R", width: "u64", tiny: 1_000_000_000, full: 5_000_000_000, says: "the gas for refining a work-package" },
  { key: "G_T", width: "u64", tiny: 20_000_000, full: 3_500_000_000, says: "the gas for all of a block's accumulation" },
  { key: "H", width: "u16", tiny: 8, full: 8, says: "recent blocks kept in history" },
  { key: "I", width: "u16", tiny: 16, full: 16, says: "the most work items in a package" },
  { key: "J", width: "u16", tiny: 8, full: 8, says: "the most dependencies a report may name" },
  { key: "K", width: "u16", tiny: 3, full: 16, says: "the most tickets a block may carry" },
  { key: "L", width: "u32", tiny: 24, full: 14_400, says: "how old a lookup anchor may be, in slots" },
  { key: "O", width: "u16", tiny: 8, full: 8, says: "authorizers in a core's pool" },
  { key: "P", width: "u16", tiny: 6, full: 6, says: "seconds in a slot" },
  { key: "Q", width: "u16", tiny: 80, full: 80, says: "authorizers in a core's queue" },
  { key: "R", width: "u16", tiny: 4, full: 10, says: "slots between reshuffles of the guarantors" },
  { key: "T", width: "u16", tiny: 128, full: 128, says: "the most extrinsics in a package" },
  { key: "U", width: "u16", tiny: 5, full: 5, says: "slots a report may wait to become available" },
  { key: "W_A", width: "u32", tiny: 64_000, full: 64_000, says: "the largest authorizer code" },
  { key: "W_B", width: "u32", tiny: 13_791_360, full: 13_791_360, says: "the largest work-package bundle" },
  { key: "W_C", width: "u32", tiny: 4_000_000, full: 4_000_000, says: "the largest service code" },
  { key: "W_M", width: "u32", tiny: 3072, full: 3072, says: "the most segments a package may import" },
  { key: "W_R", width: "u32", tiny: 49_152, full: 49_152, says: "the most output a report may carry" },
  { key: "W_T", width: "u32", tiny: 128, full: 128, says: "a transfer's memo, in bytes" },
  { key: "W_X", width: "u32", tiny: 3072, full: 3072, says: "the most segments a package may export" },
  { key: "Y", width: "u32", tiny: 10, full: 500, says: "the slot of an epoch at which the ticket lottery closes" },
];
export const DIFFER = FIELDS.filter((f) => f.tiny !== f.full).map((f) => f.key);
export const CONSTANTS: Type = { record: FIELDS.map((f) => [f.key, f.width] as [string, Type]) };
export const SIZES = ["tiny", "full"] as const;
const json = (size: (typeof SIZES)[number]): Json => Object.fromEntries(FIELDS.map((f) => [f.key, f[size]]));
export const CONSTANTS_TINY = encodeMapped(CONSTANTS, json("tiny")).bytes;

const SAYS = Object.fromEntries(FIELDS.map((f) => [f.key, `${f.key}: ${f.says}.${DIFFER.includes(f.key) ? ` One of the nine that differ: ${f.tiny.toLocaleString("en-US")} on tiny, ${f.full.toLocaleString("en-US")} on full.` : " The same on tiny and full."}`]));
const group = (keys: string[]) => FIELDS.map((f) => f.key).filter((k) => keys.includes(k));

export const PARCELS: Parcel[] = SIZES.map((size) =>
  makeParcel({
    name: "constants",
    whole: `Fetch's item 0 on ${size}: 29 constants in 122 bytes, each in a fixed width, least significant byte first. Tap any one.`,
    type: CONSTANTS,
    json: json(size),
    compartments: [
      { id: "network", name: "The network's size and clock", says: "the nine that differ between tiny and full are all here or in gas", fields: group(["C", "D", "E", "K", "L", "P", "R", "U", "Y"]), tone: "amber" },
      { id: "gas", name: "Gas", says: "budgets for each kind of work", fields: group(["G_A", "G_I", "G_R", "G_T"]), tone: "green" },
      { id: "deposits", name: "Deposits", says: "what a service must hold for what it stores", fields: group(["B_I", "B_L", "B_S"]), tone: "purple" },
      { id: "limits", name: "Limits", says: "how much of each thing is allowed", fields: group(["H", "I", "J", "O", "Q", "T", "W_A", "W_B", "W_C", "W_M", "W_R", "W_T", "W_X"]), tone: "brand" },
    ],
    says: SAYS,
    items: {},
    goals: [
      { id: "cores", say: "find the number of cores", reached: (p) => p === "C" },
      { id: "biggest", say: "find a constant that takes 8 bytes and differs", reached: (p) => p === "G_R" || p === "G_T" },
      { id: "close", say: "find when the lottery closes", reached: (p) => p === "Y" },
    ],
  }),
);
