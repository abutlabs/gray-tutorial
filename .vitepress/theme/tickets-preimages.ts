// Lesson 4.1's widget: the two simplest bags of a block, as parcels. Each is a sequence with
// its count in front: tickets of an attempt byte and a 784-byte ring VRF proof, preimages of
// the requesting service (ℰ₄) and a blob. The values are the tiny vectors' (extrinsic-
// vectors.ts); tools/widget-tickets-preimages.test.ts checks them against 4.1's codecs,
// its decode trace and the vectors' bytes.

import type { Node, Type } from "./codec-map.ts";
import { PREIMAGES_JSON, TICKETS_JSON } from "./extrinsic-vectors.ts";
import { makeParcel } from "./parcel.ts";
import type { Parcel } from "./parcel.ts";

/** TicketEnvelope and Preimage, as lesson 4.1's codecs write them. */
export const TICKET_ENVELOPE: Type = { record: [["attempt", "u8"], ["signature", { bytes: 784 }]] };
export const PREIMAGE: Type = { record: [["requester", "u32"], ["blob", "blob"]] };

const bag = (name: string, item: Type): Type => ({ record: [[name, { seq: item }]] });

export const TICKETS: Parcel = makeParcel({
  name: "tickets_extrinsic",
  whole: "The block's tickets, from the tiny vector: a count, then each envelope. Tap any part.",
  type: bag("tickets", TICKET_ENVELOPE),
  json: { tickets: TICKETS_JSON },
  compartments: [{ id: "tickets", name: "The tickets", says: "anonymous entries in the lottery for who authors which slot", fields: ["tickets"], tone: "brand" }],
  says: {
    tickets: "The tickets: how many, a compact natural, then each one.",
    attempt: "Which of its owner's tries this ticket is: one byte.",
    signature: "A ring VRF proof: some validator made this ticket, without saying which. 784 bytes, no length in front: everyone knows the size.",
  },
  items: { tickets: "ticket" },
  saysItem: (n: Node) => `A ticket: its attempt, then its proof. ${n.end - n.start} bytes.`,
  goals: [
    { id: "count", say: "find how many tickets there are", reached: (p) => p === "tickets" },
    { id: "proof", say: "find a proof that names no one", reached: (p) => /^tickets\[\d+\]\.signature$/.test(p) },
  ],
});

export const PREIMAGES: Parcel = makeParcel({
  name: "preimages_extrinsic",
  whole: "The block's preimages, from the tiny vector: a count, then each one. Tap any part.",
  type: bag("preimages", PREIMAGE),
  json: { preimages: PREIMAGES_JSON },
  compartments: [{ id: "preimages", name: "The preimages", says: "data services asked for by its hash, delivered", fields: ["preimages"], tone: "green" }],
  says: {
    preimages: "The preimages: how many, a compact natural, then each one.",
    requester: "The service that asked for the data: a u32, four bytes, least significant first.",
    blob: "The data itself: a blob, its length first.",
  },
  items: { preimages: "preimage" },
  saysItem: (n: Node, partAt) => `A preimage for service ${partAt(`${n.path}.requester`).json}: ${n.end - n.start} bytes.`,
  goals: [
    { id: "who", say: "find which service asked", reached: (p) => /^preimages\[\d+\]\.requester$/.test(p) },
    { id: "length", say: "find data with its length in front", reached: (p) => /^preimages\[\d+\]\.blob$/.test(p) },
  ],
});

export const BAGS: { name: string; parcel: Parcel }[] = [
  { name: "tickets", parcel: TICKETS },
  { name: "preimages", parcel: PREIMAGES },
];
