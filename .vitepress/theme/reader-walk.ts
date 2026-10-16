// Lesson 2.3's widget: a Reader walking the eight bytes the lesson's Writer made, c7 12 80
// 80 de ad be ef. Each read starts at #at, takes the bytes its rule says, and moves #at
// along; read in the writer's order the values come back, read in another they don't, and
// nothing complains. tools/widget-reader-walk.test.ts checks every value here against the
// lesson's test and check questions.

/** What the lesson's Writer wrote, piece by piece: the call, and the bytes it made. */
export const PIECES: { call: string; bytes: number[] }[] = [
  { call: "w.fixed(4807n, 2)", bytes: [0xc7, 0x12] },
  { call: "w.natural(128n)", bytes: [0x80, 0x80] },
  { call: "w.bytes(fromHex(\"0xdeadbeef\"))", bytes: [0xde, 0xad, 0xbe, 0xef] },
];
/** The whole encoding, the pieces end to end: what finish() returns. */
export const BYTES: number[] = PIECES.flatMap((p) => p.bytes);
/** Which piece each byte belongs to. */
export const PIECE_OF: number[] = PIECES.flatMap((p, k) => p.bytes.map(() => k));

/** The inverse of ℰ_l: l bytes, least significant first. */
export function decodeFixed(bytes: number[]): bigint {
  return bytes.reduce((acc, b, i) => acc + (BigInt(b) << BigInt(8 * i)), 0n);
}
/** The inverse of ℰ at an offset: the first byte's leading ones say how many bytes follow. */
export function decodeNatural(bytes: number[], at: number): { value: bigint; length: number } {
  const first = bytes[at];
  let l = 0;
  while (l < 8 && (first & (0x80 >> l)) !== 0) l++;
  const rest = decodeFixed(bytes.slice(at + 1, at + 1 + l));
  if (l === 8) return { value: rest, length: 9 };
  const marker = 256 - (256 >> l);
  return { value: (BigInt(first - marker) << BigInt(8 * l)) + rest, length: l + 1 };
}

/** The reads a reader can ask for, as the lesson's test does. */
export type Op = "fixed(2)" | "natural()" | "bytes(4)";
export const OPS: Op[] = ["fixed(2)", "natural()", "bytes(4)"];
/** One read: where it started, how many bytes it took, and what it made of them. */
export type Read = { op: Op; from: number; length: number; value: string };

/** What a read at `at` gives: the value and the bytes used, or nothing if the bytes run out. */
export function readAt(op: Op, at: number): Read | null {
  const left = BYTES.length - at;
  if (left <= 0) return null;
  if (op === "fixed(2)") return left < 2 ? null : { op, from: at, length: 2, value: `${decodeFixed(BYTES.slice(at, at + 2))}n` };
  if (op === "bytes(4)") return left < 4 ? null : { op, from: at, length: 4, value: `0x${BYTES.slice(at, at + 4).map((b) => b.toString(16).padStart(2, "0")).join("")}` };
  const { value, length } = decodeNatural(BYTES, at);
  return length > left ? null : { op, from: at, length, value: `${value}n` };
}

/** The reads in the writer's order: what the lesson's test gets back. */
export const IN_ORDER: Read[] = (() => {
  const out: Read[] = [];
  let at = 0;
  for (const op of OPS) { const r = readAt(op, at)!; out.push(r); at += r.length; }
  return out;
})();

/** Whether a read starts where a piece starts and ends where it ends: in step with the writer. */
export const inStep = (r: Read): boolean => PIECES.some((p, k) => r.from === PIECES.slice(0, k).reduce((n, q) => n + q.bytes.length, 0) && r.length === p.bytes.length && OPS[k] === r.op);
