// Lesson 15.1's widget: a PVM blob's three parts, on the lesson's eight hand-made bytes:
// E(|j|) ⌢ E₁(z) ⌢ E(|c|) ⌢ j ⌢ c ⌢ k, where k has one bit per code byte saying which
// bytes start an instruction; and the real bootstrap service's layers to scale.
// tools/widget-blob-layers.test.ts checks the bytes against the lesson's test and the
// layers against its run.

/** The hand-made blob: |j| = 1, z = 1, |c| = 3, j = [2], c = 00 01 02, k = 05. */
export const BLOB: number[] = [0x01, 0x01, 0x03, 0x02, 0x00, 0x01, 0x02, 0x05];
export type Part = { name: string; from: number; to: number; says: string };
/** deblob on the eight bytes: where each part sits, and what it says. */
export function parts(blob: number[]): Part[] {
  const jumps = blob[0], z = blob[1], codeLength = blob[2];
  const jFrom = 3, cFrom = jFrom + jumps * z, kFrom = cFrom + codeLength;
  return [
    { name: "|j|", from: 0, to: 1, says: `${jumps} entry in the jump table (a compact natural)` },
    { name: "z", from: 1, to: 2, says: `each entry is ${z} byte` },
    { name: "|c|", from: 2, to: 3, says: `${codeLength} bytes of code` },
    { name: "j", from: jFrom, to: cFrom, says: `the jump table: a target at byte ${blob[jFrom]}` },
    { name: "c", from: cFrom, to: kFrom, says: "the code: the instructions, byte after byte" },
    { name: "k", from: kFrom, to: kFrom + Math.ceil(codeLength / 8), says: "the opcode bitmask: one bit per code byte, least significant first" },
  ];
}
/** Which code bytes start an instruction under bitmask byte k. */
export const starts = (k: number, codeLength: number): boolean[] => Array.from({ length: codeLength }, (_, i) => ((k >> i) & 1) === 1);
/** The bitmask's byte with bit i flipped. */
export const flip = (k: number, i: number): number => k ^ (1 << i);
/** Whether the jump table's target lands on an instruction start. */
export const landsOnOne = (k: number, target: number, codeLength: number): boolean => target < codeLength && starts(k, codeLength)[target];

/** The bootstrap service's layers, as the lesson's run prints them, in bytes. */
export const CODE_PREIMAGE = 159_322;
export const LAYERS = {
  metadata: 80,
  readOnly: 9_904,
  readWrite: 48,
  blob: 149_274,
  jumpEntries: 1_601,
  code: 128_413,
  bitmask: 16_052,
  heapPages: 2,
  stack: 8_192,
};
/** Inside the blob: its three sizes in front, then the jump table's bytes, the code, the bitmask. */
export const BLOB_PARTS = (() => {
  const header = LAYERS.blob - LAYERS.code - LAYERS.bitmask; // the sizes, then the jump table
  const z = Math.round((header - 6) / LAYERS.jumpEntries);
  return { sizes: header - LAYERS.jumpEntries * z, z, jumpTable: LAYERS.jumpEntries * z, code: LAYERS.code, bitmask: LAYERS.bitmask };
})();
