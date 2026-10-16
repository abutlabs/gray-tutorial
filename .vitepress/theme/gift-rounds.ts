// Lesson 17.4's widget: transfer_for_live_service-1, round by round (Δ+). Round 1 runs service
// 0 on its one operand; it sends service 1 a gift of 100 with 80,000 gas. Round 2 runs
// service 1 for that transfer: the money first, then its code, with the transfer as its
// input. Nothing is sent, so there's no round 3. With no code, the money still arrives.
// tools/widget-gift-rounds.test.ts checks every number against the lesson's tests and run.

export const RECEIVER_BEFORE = 227_714;
export const GIFT = { source: 0, dest: 1, amount: 100, gas: 80_000, memo: "gift" };
export type Stats = { count: number; transfers: number; gas: number };
export type Phase = { round: number; says: string; balance1: number; stats: Record<number, Stats>; sent: string };

/** Every state the block passes through, with or without service 1's code. */
export function phases(hasCode: boolean): Phase[] {
  const s0: Stats = { count: 1, transfers: 0, gas: 255_437 };
  const s1: Stats = { count: 0, transfers: 1, gas: hasCode ? 61_711 : 0 };
  return [
    { round: 0, says: "One report is available at slot 43, with one digest for service 0.", balance1: RECEIVER_BEFORE, stats: {}, sent: "" },
    { round: 1, says: "Round 1: service 0 runs on its one operand, uses 255,437 gas, and sends service 1 a transfer: 100, with 80,000 gas, the memo \"gift\".", balance1: RECEIVER_BEFORE, stats: { 0: s0 }, sent: "0 → 1: 100, 80,000 gas, \"gift\"" },
    { round: 2, says: "Round 2, for that transfer only. The money comes first: service 1's balance goes up by 100 before any code runs.", balance1: RECEIVER_BEFORE + GIFT.amount, stats: { 0: s0 }, sent: "" },
    hasCode
      ? { round: 2, says: "Then service 1 runs, its input a 1 then the transfer, memo and all, on the transfer's 80,000 gas. It uses 61,711, and sends nothing.", balance1: RECEIVER_BEFORE + GIFT.amount, stats: { 0: s0, 1: s1 }, sent: "nothing" }
      : { round: 2, says: "Service 1 has no code: nothing runs, no gas is used. The money stays, and the transfer still counts.", balance1: RECEIVER_BEFORE + GIFT.amount, stats: { 0: s0, 1: s1 }, sent: "nothing" },
    { round: 3, says: "Round 2 sent nothing, so there's no round 3: Δ+ stops.", balance1: RECEIVER_BEFORE + GIFT.amount, stats: { 0: s0, 1: s1 }, sent: "" },
  ];
}
