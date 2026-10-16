// The cryptography appendix's widget: the algorithms your client borrows instead of writing,
// and which bytes of a real block each one made. The block is Part 4's, the tiny test
// vector's, encoded as 4.7 does (block-parcel.ts); each field's size and count come from
// that encoding. tools/widget-crypto-map.test.ts checks them, and the appendix's table.

import { BLOCK, BLOCK_JSON } from "./block-parcel.ts";
import { encodeMapped, flatten, type Json } from "./codec-map.ts";

export type AlgorithmId = "blake2b" | "keccak" | "sha512" | "ed25519" | "vrf" | "ring" | "bls";

export interface Algorithm {
  id: AlgorithmId;
  name: string;
  makes: string; // what it gives, with its size
  does: string; // in one sentence, plainly
  library: string; // what your client calls, or that it calls nothing
  lesson: string | null; // the lesson that brings it in
}

export const ALGORITHMS: Algorithm[] = [
  { id: "blake2b", name: "Blake2b-256", makes: "32-byte hash", does: "JAM's fingerprint for almost everything: headers, reports, the state trie, the extrinsic.", library: "@noble/hashes", lesson: "5.1" },
  { id: "keccak", name: "Keccak-256", makes: "32-byte hash", does: "Ethereum's hash, for the one root bridges read: the belt of accumulation outputs, here as a report's beefy_root.", library: "@noble/hashes", lesson: "9.1" },
  { id: "sha512", name: "SHA-512", makes: "64-byte hash", does: "Inside the others: a VRF's output is hashed with it, and Ed25519 uses it to sign. No field of a block is one.", library: "@noble/hashes", lesson: "8.6" },
  { id: "ed25519", name: "Ed25519", makes: "64-byte signature, 32-byte key", does: "JAM's everyday signature: guarantors vouching for a report, validators assuring data, judges voting.", library: "@noble/curves", lesson: "5.3" },
  { id: "vrf", name: "Bandersnatch VRF", makes: "96-byte signature with a random output", does: "Signs the block as its author, and makes randomness nobody could choose: the seal and the entropy source.", library: "@typeberry/native (ark-vrf)", lesson: "8.9" },
  { id: "ring", name: "Bandersnatch ring VRF", makes: "784-byte proof; 144-byte ring root", does: "Proves one of the validators made a ticket without saying which: the lottery stays secret until each slot.", library: "@typeberry/native (ark-vrf)", lesson: "8.8" },
  { id: "bls", name: "BLS (BLS12-381)", makes: "144-byte key; signatures that combine", does: "Validators sign each finalized block's accumulation root for bridges (BEEFY). No field of a block is one, and block import never checks one.", library: "none: your client never needs it", lesson: null },
];

/** Which algorithm made a field, by its path with the item numbers taken out. */
const MADE_BY: [RegExp, AlgorithmId][] = [
  [/beefy_root$/, "keccak"],
  [/(^|\.)(bandersnatch|entropy_source|seal)$/, "vrf"],
  [/^extrinsic\.tickets\[\]\.signature$/, "ring"],
  [/(\.ed25519|offenders_mark\[\]|\.key|\.signature)$/, "ed25519"],
  [/(parent|parent_state_root|extrinsic_hash|\.hash|_root|anchor|state_root|authorizer_hash|payload_hash|code_hash|target|entropy)$/, "blake2b"],
];
export const madeBy = (path: string): AlgorithmId | null => MADE_BY.find(([re]) => re.test(path))?.[1] ?? null;

/** One field of the block, all its items together (an algorithm's keys count as its own): "extrinsic.tickets[].signature", 3 × 784 bytes. */
export interface Field { path: string; size: number; count: number; algorithm: AlgorithmId }

const { bytes, root } = encodeMapped(BLOCK, BLOCK_JSON as Json);
export const BLOCK_BYTES = bytes.length;

export const FIELDS: Field[] = (() => {
  const out = new Map<string, Field>();
  for (const n of flatten(root)) {
    if (n.children.length) continue;
    const path = n.path.replace(/\[\d+\]/g, "[]");
    const algorithm = madeBy(path);
    if (!algorithm) continue;
    const size = n.end - n.start - n.tag - n.prefix;
    const seen = out.get(path);
    if (seen) seen.count++;
    else out.set(path, { path, size, count: 1, algorithm });
  }
  return [...out.values()];
})();

/** What one algorithm made in the block: its fields, and their bytes all told. */
export function inBlock(id: AlgorithmId): { fields: Field[]; bytes: number } {
  const fields = FIELDS.filter((f) => f.algorithm === id);
  return { fields, bytes: fields.reduce((sum, f) => sum + f.size * f.count, 0) };
}

/** A field as the map writes it: "tickets[].signature", without "extrinsic." or "header.". */
export const short = (path: string): string => path.replace(/^(header|extrinsic)\./, "");
