// Lesson 8.4's widget: when a lottery closes, and who seals the next epoch. The tickets
// mark goes in the block that crosses phase Y in the same epoch (m < Y ≤ m′) with a full
// accumulator; the next epoch is sealed by the winners only if it follows on directly
// (e′ = e + 1), the block before was at or past Y, and the lottery was full. Tiny: E = 12,
// Y = 10. tools/widget-lottery-close.test.ts checks every case against the lesson's tests.

export const E = 12;
export const Y = 10;
export const epochOf = (slot: number): number => Math.floor(slot / E);
export const phaseOf = (slot: number): number => slot % E;

/** Whether the lottery closes in this block: the same epoch, and phase Y reached now. */
export const lotteryCloses = (before: number, after: number): boolean =>
  epochOf(after) === epochOf(before) && phaseOf(before) < Y && Y <= phaseOf(after);
/** Whether the block carries the tickets mark: it closes a lottery that filled up. */
export const hasMark = (before: number, after: number, tickets: number): boolean => lotteryCloses(before, after) && tickets === E;
/** Whether a new epoch is sealed by the winners: it follows on directly, the block before was past the close, the lottery was full. */
export const sealedByTickets = (before: number, after: number, tickets: number): boolean =>
  epochOf(after) === epochOf(before) + 1 && phaseOf(before) >= Y && tickets === E;

/** What the block does, and which condition stops it when it doesn't. */
export function verdict(before: number, after: number, tickets: number): { mark: string; sealer: string } {
  const [e, e2, m, m2] = [epochOf(before), epochOf(after), phaseOf(before), phaseOf(after)];
  let mark: string;
  if (hasMark(before, after, tickets)) mark = "yes: this block closes a full lottery";
  else if (e2 !== e) mark = "no: a mark goes in a block of the same epoch";
  else if (m >= Y) mark = `no: the block before was already at or past Y, m = ${m}`;
  else if (m2 < Y) mark = `no: phase Y not reached yet, m′ = ${m2}`;
  else mark = `no: the lottery isn't full, ${tickets} of ${E}`;
  let sealer: string;
  if (e2 === e) sealer = "the same epoch: its sealers stay";
  else if (sealedByTickets(before, after, tickets)) sealer = "the winners, outside in";
  else if (e2 !== e + 1) sealer = `the fallback: the chain skipped an epoch (e′ = ${e2}, not ${e + 1})`;
  else if (m < Y) sealer = `the fallback: the block before was at m = ${m}, before the close`;
  else sealer = `the fallback: the lottery wasn't full, ${tickets} of ${E}`;
  return { mark, sealer };
}

/** The cases the lesson's tests and check questions turn on. */
export const PRESETS: { before: number; after: number; tickets: number; says: string }[] = [
  { before: 9, after: 10, tickets: 12, says: "9 → 10: closes" },
  { before: 10, after: 11, tickets: 12, says: "10 → 11: closed already" },
  { before: 3, after: 11, tickets: 12, says: "3 → 11: crosses Y from afar" },
  { before: 9, after: 10, tickets: 11, says: "9 → 10, 11 tickets: not full" },
  { before: 11, after: 12, tickets: 12, says: "11 → 12: the next epoch, sealed by winners" },
  { before: 11, after: 25, tickets: 12, says: "11 → 25: an epoch skipped" },
];
