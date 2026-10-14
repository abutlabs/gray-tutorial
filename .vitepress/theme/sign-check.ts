// Lesson 5.3's widget: what an assurance's validator signs (GP §11), X_A then
// H(ℰ(parent, bitfield)), signed and checked with Ed25519 (GP §3, RFC 8032), and what breaks
// the check. Two signers: a demo validator whose secret key is made up and shown, so the
// reader can sign; and validator 5 of the tiny some_assurances-1 vector, whose real public
// key and signature can only be checked. tools/widget-sign-check.test.ts checks it against
// the lesson's own prefix, code and RFC 8032 example.

import { ed25519 } from "@noble/curves/ed25519.js";
import { bitsChanged, H } from "./hash.ts";
import { fromHex } from "./vector-map.ts";

/** The prefixes the reader can put in front: the right one, the right one with the Gray
 *  Paper's `$` taken for a byte, and a guarantee's. */
export const PREFIXES = { available: "jam_available", dollar: "$jam_available", guarantee: "jam_guarantee" } as const;
export type PrefixId = keyof typeof PREFIXES;

/** A string's ASCII bytes, one per letter. */
export const ascii = (text: string): number[] => [...new TextEncoder().encode(text)];

/** What an assurance's message is made of. */
export interface Parts { prefix: PrefixId; parent: number[]; bitfield: number[] }

/** The signed message, piece by piece: the prefix's bytes, then H(parent ⌢ bitfield). */
export function messageOf(parts: Parts): { prefix: number[]; hash: number[]; bytes: number[] } {
  const prefix = ascii(PREFIXES[parts.prefix]);
  const hash = H([...parts.parent, ...parts.bitfield]); // ℰ(parent, bitfield): the two side by side
  return { prefix, hash, bytes: [...prefix, ...hash] };
}

/** A secret key's public key: 32 bytes anyone may know. */
export const publicKey = (secret: number[]): number[] => [...ed25519.getPublicKey(Uint8Array.from(secret))];

/** The secret key's 64-byte Ed25519 signature of the message. */
export const sign = (secret: number[], message: number[]): number[] =>
  [...ed25519.sign(Uint8Array.from(message), Uint8Array.from(secret))];

/** Is `signature` a valid Ed25519 signature of `message`, by the holder of `key`? The
 *  lesson's verifyEd25519, arguments in the same order. */
export const verify = (key: number[], message: number[], signature: number[]): boolean =>
  ed25519.verify(Uint8Array.from(signature), Uint8Array.from(message), Uint8Array.from(key));

/** The block's parent hash in stf/assurances/tiny/some_assurances-1, every assurance's anchor. */
export const PARENT = fromHex("0xd61a38a0f73beda90e8c1dfba731f65003742539f4260694f44e22cabef24a8e");

/** The parent with the lowest bit of its last byte flipped: one bit, a different block. */
export function flipParent(parent: number[]): number[] {
  const next = [...parent];
  next[next.length - 1] ^= 1;
  return next;
}

/** A validator the widget can check with; `secret` only when the reader may sign as it. */
export interface Signer { name: string; key: number[]; secret?: number[] }

/** Made-up validators for the demo. Their secret keys are 32 bytes of 0x01 and of 0x02, the
 *  same on every load, and shown on purpose: a real one never leaves its validator. */
export const DEMO_SECRET_A = Array<number>(32).fill(0x01);
export const DEMO_SECRET_B = Array<number>(32).fill(0x02);
export const DEMO_A: Signer = { name: "demo validator A", key: publicKey(DEMO_SECRET_A), secret: DEMO_SECRET_A };
export const DEMO_B: Signer = { name: "demo validator B", key: publicKey(DEMO_SECRET_B), secret: DEMO_SECRET_B };

/** Validators 5 and 4 of some_assurances-1 (pre_state.curr_validators): public keys only. */
export const REAL_5: Signer = { name: "validator 5", key: fromHex("0xab0084d01534b31c1dd87c81645fd762482a90027754041ca1b56133d0466c06") };
export const REAL_4: Signer = { name: "validator 4", key: fromHex("0x8b8c5d436f92ecf605421e873a99ec528761eb52a88a2f9a057b3b3003e6f32a") };

/** Validator 5's assurance in some_assurances-1 (input.assurances[5]): it holds its piece of
 *  core 0, and signed so. */
export const REAL_ASSURANCE = {
  parts: { prefix: "available", parent: PARENT, bitfield: [0x01] } as Parts,
  signature: fromHex(
    "0x4942a6759a26ac9b91afe69013c389f25a1e087ffb03bea0741ac002710e6bf3" +
      "232d90c1d8299f37d2fe32883f7e95711b82800ad923d0279e5b1b526793b104",
  ),
};

/** What differs between the message that was signed and the one being checked, and whether
 *  the key checking it is someone else's than the signer's. */
export type Change = "prefix" | "parent" | "bitfield" | "key";

export function changes(signed: Parts, now: Parts, otherKey: boolean): Change[] {
  const out: Change[] = [];
  if (now.prefix !== signed.prefix) out.push("prefix");
  if (now.parent.some((b, i) => b !== signed.parent[i])) out.push("parent");
  if (now.bitfield.some((b, i) => b !== signed.bitfield[i])) out.push("bitfield");
  if (otherKey) out.push("key");
  return out;
}

/** How many of two equal-length byte strings' bytes differ. */
export const bytesApart = (a: number[], b: number[]): number => a.filter((x, i) => x !== b[i]).length;

/** The plain sentence that says why a check passed or failed: the first thing that changed
 *  since the signing, and how many more. */
export function why(valid: boolean, signed: Parts, now: Parts, changed: Change[], signer: Signer, checker: Signer): string {
  const n = messageOf(now).bytes.length;
  if (valid) {
    const but =
      now.prefix === "available" ? ""
        : now.prefix === "dollar" ? " But no JAM client puts the $ in, so as an assurance it fails everywhere."
          : " But it's a guarantee's message now: a client checking an assurance puts jam_available in front itself, so it fails there.";
    return `✓ The signature fits these exact ${n} bytes and ${signer.name}'s key: only its secret key could have made it.${but}`;
  }
  const bits = bitsChanged(now.bitfield, signed.bitfield);
  const more = changed.length > 1 ? ` (And ${changed.length - 1} more change${changed.length > 2 ? "s" : ""}.)` : "";
  const prefix =
    now.prefix === "guarantee"
      ? "✗ The message starts jam_guarantee now. A signature on \"I hold my piece\" can't be passed off as \"this report is good\"."
      : now.prefix === "dollar"
        ? `✗ With the $, the message is ${n} bytes and starts with a byte (0x24) that was never signed. The $ is notation, not a byte.`
        : `✗ The prefix is jam_available again, but this signature was made over ${PREFIXES[signed.prefix]}.`;
  const say: Record<Change, string> = {
    prefix,
    parent: "✗ One bit of the parent is different: a different block, so a different hash, so not the message that was signed.",
    bitfield: `✗ ${bits === 1 ? "One bit" : `${bits} bits`} of the bitfield ${bits === 1 ? "is" : "are"} different, so the hash is different in nearly every byte: not the message that was signed.`,
    key: `✗ This is ${checker.name}'s public key. The signature was made with ${signer.name}'s secret key, and only ${signer.name}'s public key checks it.`,
  };
  return changed.length ? say[changed[0]] + more : "✗ The signature doesn't fit.";
}

/** Bytes as a hex dump writes them, shortened in the middle when long: "49 42 a6 75 … 93 b1 04". */
export function shortHex(bytes: number[], head = 4, tail = 3): string {
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0"));
  return hex.length <= head + tail ? hex.join(" ") : `${hex.slice(0, head).join(" ")} … ${hex.slice(hex.length - tail).join(" ")}`.trimEnd();
}
