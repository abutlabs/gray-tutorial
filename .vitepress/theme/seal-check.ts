// Lesson 8.9's widget: which checks a block's seal passes, and which fails first. A seal is
// checked against the slot's entry in γ′_S: a fallback key (it must be the author's; X_F ⌢
// η′₃) or a winning ticket (X_T ⌢ η′₃ ⌢ attempt, and 𝒴(H_S) must be the ticket's id); then
// the entropy source against X_E ⌢ 𝒴(H_S). The verdicts of the forgeries are the lesson's
// test's, since the page can't check a Bandersnatch signature. tools/widget-seal-check.test.ts
// checks the blocks against the lesson's Output and the byte layout against the header codec.

import { encodeHeader } from "./hash-chain.ts";
import { FALLBACK_HEADERS } from "./fallback-headers.ts";
import { flatten } from "./codec-map.ts";

/** Blocks 46 to 50 of the safrole trace, as the seals run prints them. */
export type SealedBlock = { n: number; slot: number; author: number; key: string; by: "fallback" | "ticket" };
export const BLOCKS: SealedBlock[] = [
  { n: 46, slot: 46, author: 5, key: "0x21056509…", by: "fallback" },
  { n: 47, slot: 47, author: 0, key: "0xff71c6c0…", by: "fallback" },
  { n: 48, slot: 48, author: 2, key: "0x9326edb2…", by: "ticket" },
  { n: 49, slot: 49, author: 1, key: "0xdee6d555…", by: "ticket" },
  { n: 50, slot: 50, author: 2, key: "0x9326edb2…", by: "ticket" },
];

/** The forgeries the lesson's test tries. */
export type Forgery = "seal" | "stranger" | "source";
export const FORGERIES: { id: Forgery; says: string }[] = [
  { id: "seal", says: "flip one bit of the seal" },
  { id: "stranger", says: "another validator's key as the author's" },
  { id: "source", says: "flip one bit of the entropy source" },
];

/** The checks, in the order sealError makes them, with whether each passes under the forgeries. */
export type Check = { step: string; context?: string; ok: boolean };
export function checks(block: SealedBlock, forged: Set<Forgery>): Check[] {
  const out: Check[] = [];
  if (block.by === "fallback") {
    out.push({ step: "γ′_S[slot] is the author's key, H_A", ok: !forged.has("stranger") });
  }
  const context = block.by === "fallback" ? "X_F ⌢ η′₃" : "X_T ⌢ η′₃ ⌢ the ticket's attempt";
  // a forged seal, a stranger's key, or a changed entropy source (which the seal signs) all fail the signature
  const signed = !forged.has("seal") && !forged.has("stranger") && !forged.has("source");
  out.push({ step: "H_S is H_A's signature on ℰ_U(H), the header without its seal", context, ok: signed });
  if (block.by === "ticket") out.push({ step: "𝒴(H_S) is the slot's ticket id", ok: signed });
  out.push({ step: "H_V is H_A's signature on nothing, for X_E ⌢ 𝒴(H_S)", context: "X_E ⌢ 𝒴(H_S)", ok: signed });
  return out;
}
/** The verdict: the first check that fails names the error, as the lesson's code does. */
export function verdict(block: SealedBlock, forged: Set<Forgery>): string | null {
  const c = checks(block, forged);
  const first = c.findIndex((x) => !x.ok);
  if (first < 0) return null;
  return c[first].step.startsWith("H_V") ? "bad_entropy_source" : "bad_seal";
}

/** The header's byte layout for the bar: a 297-byte header with no marks, as these are. */
const layout = flatten(encodeHeader(FALLBACK_HEADERS[0]).root).filter((n) => n.path && !n.path.includes("."));
export const HEADER_BYTES = encodeHeader(FALLBACK_HEADERS[0]).bytes.length;
export const SEAL_BYTES = 96;
export const UNSIGNED_BYTES = HEADER_BYTES - SEAL_BYTES;
export const FIELDS: { name: string; from: number; to: number }[] = layout.map((n) => ({ name: n.path, from: n.start, to: n.end }));
