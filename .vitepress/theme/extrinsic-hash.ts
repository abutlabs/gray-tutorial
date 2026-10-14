// Lesson 5.2's widget: the extrinsic hash (GP §5) on a small made-up block. Each of the five
// parts is encoded in Appendix C's order (a preimage as its requester and its data's hash, a
// guarantee as its report's hash, slot and signatures), each encoding is hashed, and the five
// hashes, 160 bytes, are hashed again. Also: what proving one report was in the block takes.
// tools/widget-hashes.test.ts checks it, and that an empty block gives the lesson's hash.

import { encodeFixed } from "./bytes.ts";
import { compact } from "./compact.ts";
import { H, textBytes } from "./hash.ts";

/** A ticket (lesson 4.1): which attempt, and a 784-byte ring proof. */
export interface Ticket { attempt: number; signature: number[] }
/** A preimage: the service that asked, and the data. */
export interface Preimage { requester: number; blob: number[] }
/** A guarantor's signature: which validator, and 64 bytes. */
export interface Signature { validator: number; signature: number[] }
/** A guarantee: a work-report (here, its encoding), the slot, and two or three signatures. */
export interface Guarantee { report: number[]; slot: number; signatures: Signature[] }
/** An assurance (tiny: 2 cores, so a one-byte bitfield): anchor, bitfield, validator, signature. */
export interface Assurance { anchor: number[]; bitfield: number; validator: number; signature: number[] }
/** A block's extrinsic. Its disputes are left empty, as in every trace the lesson walks. */
export interface Extrinsic { tickets: Ticket[]; preimages: Preimage[]; guarantees: Guarantee[]; assurances: Assurance[] }

export const PARTS = ["tickets", "preimages", "guarantees", "assurances", "disputes"] as const;
export type Part = (typeof PARTS)[number];

/** Tiny's 2 cores: an assurance's bitfield has 2 bits, in one byte, lowest bit core 0. */
export const CORES = 2;
/** Tiny lets each validator try 3 tickets: attempts 0, 1 and 2. */
export const ATTEMPTS = 3;

const u16 = (x: number) => encodeFixed(BigInt(x), 2);
const u32 = (x: number) => encodeFixed(BigInt(x), 4);
/** A sequence's count in front: a compact natural. */
const count = (n: number) => compact(BigInt(n)).bytes;
const seq = <T>(items: T[], each: (item: T) => number[]) => [...count(items.length), ...items.flatMap(each)];
const signature = (s: Signature) => [...u16(s.validator), ...s.signature];
/** A guarantee's bytes with `report` in the report's place: its hash for the extrinsic hash,
 *  its whole encoding in the block itself, nothing where a proof leaves room for it. */
const guarantee = (report: number[], g: { slot: number; signatures: Signature[] }) => [...report, ...u32(g.slot), ...seq(g.signatures, signature)];

/** The disputes part, empty: three empty lists (verdicts, culprits, faults), a 0 count each. */
export const EMPTY_DISPUTES = [0, 0, 0];

/** The five encodings the extrinsic hash hashes, in Appendix C's order, with the two twists. */
export function encodeParts(x: Extrinsic): number[][] {
  return [
    seq(x.tickets, (t) => [t.attempt, ...t.signature]),
    seq(x.preimages, (p) => [...u32(p.requester), ...H(p.blob)]), // twist: the data's hash
    seq(x.guarantees, (g) => guarantee(H(g.report), g)), // twist: the report's hash
    seq(x.assurances, (a) => [...a.anchor, a.bitfield, ...u16(a.validator), ...a.signature]),
    EMPTY_DISPUTES,
  ];
}

/** Step 2: the five parts' hashes. */
export const partHashes = (x: Extrinsic): number[][] => encodeParts(x).map(H);

/** Step 3: the extrinsic hash, H of the five hashes glued together (160 bytes). */
export const rootOf = (hashes: number[][]): number[] => H(hashes.flat());

/** The extrinsic hash of an extrinsic, as a header carries it. */
export const extrinsicHash = (x: Extrinsic): number[] => rootOf(partHashes(x));

/** Every byte Blake2b reads on the way to the root: the preimages' data and the reports
 *  (for the twists), the five encodings, and the 160 bytes of hashes. */
export function bytesHashed(x: Extrinsic): number {
  const twists = x.preimages.reduce((n, p) => n + p.blob.length, 0) + x.guarantees.reduce((n, g) => n + g.report.length, 0);
  return twists + encodeParts(x).reduce((n, e) => n + e.length, 0) + 32 * PARTS.length;
}

/** The extrinsic's own encoding's size, as the block carries it: preimages and reports whole. */
export function extrinsicSize(x: Extrinsic): number {
  const [tickets, , , assurances, disputes] = encodeParts(x);
  const preimages = seq(x.preimages, (p) => [...u32(p.requester), ...count(p.blob.length), ...p.blob]);
  const guarantees = seq(x.guarantees, (g) => guarantee(g.report, g));
  return tickets.length + preimages.length + guarantees.length + assurances.length + disputes.length;
}

/** Which of the five hashes, and the root, differ between two extrinsics. */
export function changes(a: Extrinsic, b: Extrinsic): { parts: boolean[]; root: boolean } {
  const [ha, hb] = [partHashes(a), partHashes(b)];
  const same = (p: number[], q: number[]) => p.every((v, i) => v === q[i]);
  return { parts: ha.map((h, i) => !same(h, hb[i])), root: !same(rootOf(ha), rootOf(hb)) };
}

/** A change the reader can make to the block. */
export type Edit =
  | { kind: "attempt"; ticket: number }
  | { kind: "blob"; preimage: number; byte: number }
  | { kind: "report"; guarantee: number; byte: number }
  | { kind: "slot"; guarantee: number }
  | { kind: "bit"; assurance: number; core: number };

/** The part an edit lands in. */
export const partOf = (e: Edit): Part =>
  e.kind === "attempt" ? "tickets" : e.kind === "blob" ? "preimages" : e.kind === "bit" ? "assurances" : "guarantees";

/** The extrinsic after an edit: an attempt goes round 0, 1, 2; a byte goes up by 1 (255 → 0);
 *  a slot goes up by 1; an assurance's bit for a core flips. */
export function apply(x: Extrinsic, e: Edit): Extrinsic {
  const bump = (bytes: number[], i: number) => bytes.map((b, k) => (k === i ? (b + 1) % 256 : b));
  const at = <T>(items: T[], i: number, f: (item: T) => T) => items.map((item, k) => (k === i ? f(item) : item));
  switch (e.kind) {
    case "attempt": return { ...x, tickets: at(x.tickets, e.ticket, (t) => ({ ...t, attempt: (t.attempt + 1) % ATTEMPTS })) };
    case "blob": return { ...x, preimages: at(x.preimages, e.preimage, (p) => ({ ...p, blob: bump(p.blob, e.byte) })) };
    case "report": return { ...x, guarantees: at(x.guarantees, e.guarantee, (g) => ({ ...g, report: bump(g.report, e.byte) })) };
    case "slot": return { ...x, guarantees: at(x.guarantees, e.guarantee, (g) => ({ ...g, slot: g.slot + 1 })) };
    case "bit": return { ...x, assurances: at(x.assurances, e.assurance, (a) => ({ ...a, bitfield: a.bitfield ^ (1 << e.core) })) };
  }
}

/** Made-up bytes that look like a hash or signature: H("label 0"), H("label 1"), ... cut to n. */
export function madeUp(label: string, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; out.length < n; i++) out.push(...H(textBytes(`${label} ${i}`)));
  return out.slice(0, n);
}

/** The widget's block: small and made up, but every part encoded as the client encodes it.
 *  The reports stand in for real ones by a few bytes each (a real report is hundreds): a
 *  report goes in by its hash, so its length changes nothing about how it commits. */
export const BLOCK: Extrinsic = {
  tickets: [0, 1].map((attempt, i) => ({ attempt, signature: madeUp(`ticket ${i + 1} proof`, 784) })),
  preimages: [{ requester: 16909060, blob: [1, 2, 3, 4, 5] }],
  guarantees: [
    { report: textBytes("report 1: core 0"), slot: 99, signatures: [{ validator: 0, signature: madeUp("g1 v0", 64) }, { validator: 1, signature: madeUp("g1 v1", 64) }] },
    { report: textBytes("report 2: core 1"), slot: 99, signatures: [{ validator: 4, signature: madeUp("g2 v4", 64) }, { validator: 5, signature: madeUp("g2 v5", 64) }] },
  ],
  assurances: [
    { anchor: madeUp("parent", 32), bitfield: 0b01, validator: 2, signature: madeUp("a v2", 64) },
    { anchor: madeUp("parent", 32), bitfield: 0b11, validator: 3, signature: madeUp("a v3", 64) },
  ],
};

/** A block with nothing in it: every fallback block's extrinsic. */
export const EMPTY: Extrinsic = { tickets: [], preimages: [], guarantees: [], assurances: [] };

/** What proving one report was in the block reveals: the report, the guarantees part with
 *  every other report as its hash (the proven one's place left for the report to fill), and
 *  the other four parts' hashes. Everything else stays hidden. */
export interface Proof {
  report: number[];
  index: number; // which guarantee the report is
  guarantees: { report: number[] | null; slot: number; signatures: Signature[] }[];
  others: number[][]; // the hashes of tickets, preimages, assurances, disputes
}

export function proofOf(x: Extrinsic, index: number): Proof {
  const hashes = partHashes(x);
  return {
    report: x.guarantees[index].report,
    index,
    guarantees: x.guarantees.map((g, i) => ({ report: i === index ? null : H(g.report), slot: g.slot, signatures: g.signatures })),
    others: [hashes[0], hashes[1], hashes[3], hashes[4]],
  };
}

/** A checker's sums: hash the report into its place, encode and hash the guarantees part,
 *  put the five hashes in order and hash them. The proof holds if that is the header's root. */
export function checkProof(proof: Proof, root: number[]): { ok: boolean; reportHash: number[]; guaranteesHash: number[]; recomputed: number[] } {
  const reportHash = H(proof.report);
  const guarantees = seq(proof.guarantees, (g) => guarantee(g.report ?? reportHash, g));
  const guaranteesHash = H(guarantees);
  const [tickets, preimages, assurances, disputes] = proof.others;
  const recomputed = rootOf([tickets, preimages, guaranteesHash, assurances, disputes]);
  const ok = proof.guarantees[proof.index]?.report === null && recomputed.every((b, i) => b === root[i]);
  return { ok, reportHash, guaranteesHash, recomputed };
}

/** The proof's bytes: the report, the guarantees part around it, and four 32-byte hashes. */
export function proofSize(p: Proof): number {
  const guarantees = seq(p.guarantees, (g) => guarantee(g.report ?? [], g));
  return p.report.length + guarantees.length + 32 * p.others.length;
}

/** A piece of a proof a cheat could change. */
export type Forgery = "report" | "other report" | "slot" | "tickets hash";
export const FORGERIES: Forgery[] = ["report", "other report", "slot", "tickets hash"];

/** The proof with one piece changed: a byte of the report, a byte of the other report's
 *  hash, the proven guarantee's slot, or a byte of the tickets' hash. */
export function forge(p: Proof, piece: Forgery): Proof {
  const bump = (bytes: number[]) => [(bytes[0] + 1) % 256, ...bytes.slice(1)];
  const other = p.guarantees.findIndex((g) => g.report !== null);
  switch (piece) {
    case "report": return { ...p, report: bump(p.report) };
    case "other report": return { ...p, guarantees: p.guarantees.map((g, i) => (i === other ? { ...g, report: bump(g.report!) } : g)) };
    case "slot": return { ...p, guarantees: p.guarantees.map((g, i) => (i === p.index ? { ...g, slot: g.slot + 1 } : g)) };
    case "tickets hash": return { ...p, others: [bump(p.others[0]), ...p.others.slice(1)] };
  }
}
