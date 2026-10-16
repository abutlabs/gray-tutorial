// Lesson 20.1's widget: the protocol README's PeerInfo, byte by byte, as a parcel: one byte
// for the message's kind, then the fuzz version, the features bitmask (1 ancestry, 2 forks),
// two versions of three bytes and the name as a blob. Change the features or the name and
// the bytes redraw. tools/widget-peer-info.test.ts checks it against the lesson's examples.

import type { Json, Type } from "./codec-map.ts";
import { makeParcel } from "./parcel.ts";
import type { Parcel } from "./parcel.ts";

const VERSION: Type = { record: [["major", "u8"], ["minor", "u8"], ["patch", "u8"]] };
/** The message: kind 0, then PeerInfo, as lesson 20.1's codec writes it. */
export const PEER_INFO: Type = {
  record: [["kind", "u8"], ["fuzz_version", "u8"], ["fuzz_features", "u32"], ["jam_version", VERSION], ["app_version", VERSION], ["app_name", "blob"]],
};
/** The README's example: 0x0001020000000007000001190666757a7a6572. */
export const EXAMPLE = "0x0001020000000007000001190666757a7a6572";
const hexOf = (text: string) => `0x${[...new TextEncoder().encode(text)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
export const jsonOf = (features: number, name: string): Json => ({
  kind: 0, fuzz_version: 1, fuzz_features: features,
  jam_version: { major: 0, minor: 7, patch: 0 }, app_version: { major: 0, minor: 1, patch: 25 }, app_name: hexOf(name),
});
export const featuresSay = (f: number): string => [f & 1 ? "ancestry" : "", f & 2 ? "forks" : ""].filter(Boolean).join(" and ") || "none";

export function peerParcel(features: number, name: string): Parcel {
  return makeParcel({
    name: "peer_info",
    whole: "The README's PeerInfo message: a fuzzer introducing itself. Tap any part.",
    type: PEER_INFO,
    json: jsonOf(features, name),
    compartments: [
      { id: "kind", name: "Which message", says: "one byte: 0 is PeerInfo", fields: ["kind"], tone: "grey" },
      { id: "protocol", name: "The protocol", says: "its version, and what this side can do", fields: ["fuzz_version", "fuzz_features"], tone: "brand" },
      { id: "versions", name: "Versions", says: "the Gray Paper's, and the app's own", fields: ["jam_version", "app_version"], tone: "amber" },
      { id: "who", name: "Who", says: "the app's name", fields: ["app_name"], tone: "green", stapled: true },
    ],
    says: {
      kind: "0: PeerInfo. Every message starts with its kind: 1 Initialize, 2 StateRoot, 3 ImportBlock, 4 GetState, 5 State, 255 Error.",
      fuzz_version: "The fuzz protocol's version: 1, one byte.",
      fuzz_features: `A u32 of flags: 1 for ancestry, 2 for forks. Here ${features}: ${featuresSay(features)}. The session's are both sides' ANDed.`,
      jam_version: "The Gray Paper version the app follows: three bytes, major, minor, patch.",
      app_version: "The app's own version: 0.1.25, 0x19 being 25.",
      app_name: "The app's name in UTF-8, as a blob: its length first.",
      major: "The major version.", minor: "The minor version.", patch: "The patch version.",
    },
    items: {},
    goals: [
      { id: "kind", say: "find the byte that says which message", reached: (p) => p === "kind" },
      { id: "forks", say: "find where forks is offered", reached: (p) => p === "fuzz_features" },
      { id: "name", say: "find the name's length", reached: (p) => p === "app_name" },
    ],
  });
}
/** The README's StateRoot example, and its frame: a 4-byte little-endian length, then it. */
export const STATE_ROOT = "0x024559342d3a32a8cbc3c46399a80753abff8bf785aa9d6f623e0de045ba6701fe";
export const frameOf = (hex: string): number[] => {
  const n = (hex.length - 2) / 2;
  return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
};
