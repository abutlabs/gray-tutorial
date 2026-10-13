// The compact natural ℰ(x) (Gray Paper, Appendix C), bit by bit: which bits of each byte
// are the marker and which carry x. Lesson 2.2's widgets and diagram draw from it;
// tools/widgets.test.ts checks it against the lesson's own values.

/** A bit of ℰ(x): part of the marker, one of x's top bits (first byte), or a low bit. */
export type Role = "mark" | "top" | "low";

export interface Compact {
  l: number; // bytes after the first, 0 to 8
  bytes: number[]; // ℰ(x)
  roles: Role[][]; // each byte's bits, most significant first
}

export const MAX = (1n << 64n) - 1n;

/** x in binary, most significant bit first, padded with zeros to width bits. */
export const bitsOf = (x: bigint | number, width: number): string => x.toString(2).padStart(width, "0");

/** The first byte's marker as a number: l ones then a zero (2^8 − 2^(8−l)); nine bytes is
 *  eight ones and no zero, 255. */
export const markerOf = (l: number): number => (l === 8 ? 255 : 256 - (256 >> l));

/** ℰ(x) for x below 2^64, by the Gray Paper's rule. */
export function compact(x: bigint): Compact {
  if (x < 0n || x > MAX) throw new RangeError(`${x} is not a natural below 2^64`);
  let l = 0;
  while (l < 8 && x >= 1n << BigInt(7 * (l + 1))) l++;
  const first = markerOf(l) + (l === 8 ? 0 : Number(x >> BigInt(8 * l))); // the marker, then ⌊x / 2^(8l)⌋
  const bytes = [first];
  for (let i = 0; i < l; i++) bytes.push(Number((x >> BigInt(8 * i)) & 0xffn)); // ℰ_l, lowest first
  const marked = Math.min(l + 1, 8);
  const roles = bytes.map((_, b) => Array.from({ length: 8 }, (_, i): Role => (b > 0 ? "low" : i < marked ? "mark" : "top")));
  return { l, bytes, roles };
}

/** x as the strip of bits ℰ(x) carries, cut where they go: the first byte's top bits, then
 *  each low byte, highest first (so the strip reads as x itself), with the byte each lands in. */
export function strip(c: Compact): { bits: string; roles: Role[]; note: string }[] {
  const group = (byte: number, bits: string, role: Role) => ({ bits, roles: Array<Role>(bits.length).fill(role), note: `→ byte ${byte + 1}` });
  const groups = [];
  const top = bitsOf(c.bytes[0], 8).slice(Math.min(c.l + 1, 8));
  if (top) groups.push(group(0, top, "top"));
  for (let b = c.l; b >= 1; b--) groups.push(group(b, bitsOf(c.bytes[b], 8), "low"));
  return groups;
}

export const toHex = (bytes: number[]): string => `0x${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;

/** ℰ(x)'s bytes as ByteCells groups, each bit with its role. */
export const byteGroups = (c: Compact) =>
  c.bytes.map((byte, b) => ({ bits: bitsOf(byte, 8), roles: c.roles[b], note: `byte ${b + 1}: ${toHex([byte])}` }));
