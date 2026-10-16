// Lesson 8.4's second widget: Z, outside in. The sorted winners take their slots from both
// ends: slot 0 the best ticket, slot 1 the worst, slot 2 the second best, and so on
// inwards; an even slot s takes ticket ⌊s/2⌋ from the front, an odd one E − 1 − ⌊s/2⌋
// from the back. The twelve winners are the lesson's lottery run. tools/widget-outside-in.
// test.ts checks every seat against the lesson's Output, test and check questions.

export const E = 12;

/** Z: the first, the last, the second, the second to last, and so on inwards. */
export function outsideIn<T>(items: T[]): T[] {
  const out: T[] = [];
  let front = 0;
  let back = items.length - 1;
  while (front <= back) {
    out.push(items[front]);
    if (front < back) out.push(items[back]);
    front++;
    back--;
  }
  return out;
}
/** lasair's formula for the same order: which rank a slot takes, among n winners. */
export const rankOf = (slot: number, n = E): number => (slot % 2 === 0 ? slot / 2 : n - 1 - (slot - 1) / 2);
/** The slot a rank takes. */
export const slotOf = (rank: number, n = E): number => outsideIn(Array.from({ length: n }, (_, i) => i)).indexOf(rank);

/** The twelve winning tickets of publish-tickets-with-mark-4, by rank, as the lottery run prints their ids. */
export const WINNERS: string[] = [
  "0x00e51b1c…", "0x015d2d6f…", "0x20164381…", "0x420cb7b0…", "0x4c82dbb7…", "0x5af49b10…",
  "0xd6feae23…", "0xd96bb363…", "0xe12c22d4…", "0xf4aac2fb…", "0xff039ff7…", "0xff0aa173…",
];
/** The lesson's five-item example. */
export const FIVE = [1, 2, 3, 4, 5];
