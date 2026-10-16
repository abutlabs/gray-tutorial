// Lesson 17.1's widget: one round, Δ*. Every service runs from the same accounts, keeps only
// its own account as its run leaves it, and gets S(s) = (N, T, G) and a = τ′. Three real
// vectors, as they come out: two services writing their own keys; a service with a digest
// and no code; an always-accumulate service with no digest at all.
// tools/widget-one-round.test.ts checks every number against the lesson's run and checks,
// and against the vectors where vectors/ is downloaded.

export const SLOT = 43;
export type Service = { id: number; digests: number; free: number; hasCode: boolean; gas: number; writes: [string, string][] };
export const SCENARIOS: { name: string; says: string; services: Service[] }[] = [
  {
    name: "same_round_storage_isolation-1",
    says: "two reports, one digest each for 1729 and 1730",
    services: [
      { id: 1729, digests: 1, free: 0, hasCode: true, gas: 29_643, writes: [["0x6c617374", "0x033fde3d"]] },
      { id: 1730, digests: 1, free: 0, hasCode: true, gas: 34_413, writes: [["0x6672656164", "0x00"]] },
    ],
  },
  {
    name: "same_code_different_services-1",
    says: "1730 has a digest, but its code's preimage isn't there",
    services: [
      { id: 1729, digests: 1, free: 0, hasCode: true, gas: 29_643, writes: [["0x6c617374", "0x033fde3d"]] },
      { id: 1730, digests: 1, free: 0, hasCode: false, gas: 0, writes: [] },
    ],
  },
  {
    name: "always_accumulate-1",
    says: "no reports at all; 1729 runs every block on 100,000 free gas",
    services: [{ id: 1729, digests: 0, free: 100_000, hasCode: true, gas: 16_417, writes: [] }],
  },
];
/** S(s) = (N, T, G): digests accumulated, transfers received (none in this lesson), gas used. */
export const statistics = (s: Service): [number, number, number] => [s.digests, 0, s.gas];
/** "the" for a storage key: its bytes as text, where they're letters. */
export const asText = (hex: string): string => {
  const bytes = (hex.slice(2).match(/../g) ?? []).map((b) => parseInt(b, 16));
  return bytes.every((b) => b >= 32 && b < 127) ? `"${String.fromCharCode(...bytes)}"` : hex;
};
