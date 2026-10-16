// Lesson 7.1's widget: a slot's epoch and phase, e = ⌊slot / E⌋ and m = slot mod E, and the
// moment an epoch turns over: a block starts a new epoch when its epoch is greater than
// the epoch of the block before it, the one at τ, and only then does the entropy history
// move along one. The η values are the eight η₀s the lesson's epochs run prints, one for
// each epoch the safrole trace begins. tools/widget-epoch-turn.test.ts checks every number
// against the lesson's tests, Output and check questions.

/** E, the epoch length, for the two sizes (4.6, 7.1). */
export const EPOCH_LENGTH = { tiny: 12, full: 600 } as const;
export type Size = keyof typeof EPOCH_LENGTH;

export const epochOf = (size: Size, slot: number): number => Math.floor(slot / EPOCH_LENGTH[size]);
export const phaseOf = (size: Size, slot: number): number => slot % EPOCH_LENGTH[size];
/** Whether a block at `slot`, after one at `tau`, starts a new epoch. */
export const newEpoch = (size: Size, tau: number, slot: number): boolean => epochOf(size, slot) > epochOf(size, tau);

/** η₀ at the start of each epoch of the tiny safrole trace, epochs 1 to 8, as the lesson's
 *  epochs run prints them ("η₁ is now …"): the value that retires to η₁ when that epoch begins. */
export const ETA_AT_EPOCH: Record<number, string> = {
  1: "0xcf7f084efbeefbda…",
  2: "0x9624e3672337076c…",
  3: "0x9e41bb39cea21929…",
  4: "0x27bea4ecb9542b84…",
  5: "0x8b313cbbc547b294…",
  6: "0x4ae60fe5dd387d08…",
  7: "0x76af9e385ba89964…",
  8: "0x5a9144b76436afd1…",
};
/** The entropy history as it stands inside epoch e of the trace: η₁ retired when e began,
 *  η₂ when e − 1 began, η₃ when e − 2 began; "—" for what the trace doesn't show. */
export function historyIn(e: number): [string, string, string] {
  const at = (k: number) => ETA_AT_EPOCH[k] ?? "—";
  return [at(e), at(e - 1), at(e - 2)];
}
/** η′₁, η′₂, η′₃ after a block: moved along one at a new epoch (η₀ retiring to η₁), else as they were. */
export function entropyHistory(eta: [string, string, string, string], isNew: boolean): [string, string, string] {
  return isNew ? [eta[0], eta[1], eta[2]] : [eta[1], eta[2], eta[3]];
}
/** The slots the widget offers for τ and the block on each size. */
export const PRESETS: Record<Size, { tau: number; slot: number; says: string }[]> = {
  tiny: [
    { tau: 11, slot: 12, says: "slot 12: epoch 1 begins, phase 0" },
    { tau: 12, slot: 13, says: "slot 13 after 12: the same epoch" },
    { tau: 11, slot: 13, says: "slot 13 after 11: a new epoch, with no block at phase 0" },
    { tau: 24, slot: 25, says: "slot 25: epoch 2, phase 1" },
  ],
  full: [
    { tau: 599, slot: 600, says: "slot 600: epoch 1 begins, an hour in" },
    { tau: 1233, slot: 1234, says: "slot 1,234: epoch 2, phase 34" },
  ],
};
