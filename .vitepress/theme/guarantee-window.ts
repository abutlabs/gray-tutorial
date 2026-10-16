// Lesson 12.4's widget: the slot window a guarantee must sit in, R(⌊τ′/R⌋ − 1) ≤ slot ≤ τ′,
// this rotation or the last and never the future, and the cores that are active now, below
// both C and |κ′|/3, whatever slot the guarantee cites. tools/widget-guarantee-window.test.ts
// checks every answer against the lesson's code and check questions.

export const SIZES = {
  tiny: { R: 4, C: 2, validators: 6 },
  full: { R: 10, C: 341, validators: 1023 },
} as const;
export type Size = keyof typeof SIZES;

/** The window's first slot: the start of the rotation before this block's. */
export const windowStart = (size: Size, tau: number): number => SIZES[size].R * (Math.floor(tau / SIZES[size].R) - 1);
/** Which assignment a guarantee answers to: M, this rotation's, or M*, the last one's. */
export const assignmentOf = (size: Size, tau: number, slot: number): "M" | "M*" =>
  Math.floor(slot / SIZES[size].R) === Math.floor(tau / SIZES[size].R) ? "M" : "M*";
/** The slot rule's verdict for a guarantee's slot in a block at τ′. */
export function slotError(size: Size, tau: number, slot: number): string | null {
  if (slot > tau) return "future_report_slot";
  if (slot < windowStart(size, tau)) return "report_epoch_before_last";
  return null;
}
/** How many cores are active with |κ′| validators: three to a core, and never more than C. */
export const activeCores = (size: Size, validators: number): number => Math.min(SIZES[size].C, Math.floor(validators / 3));
/** The core rule's verdict. */
export const coreError = (size: Size, validators: number, core: number): string | null =>
  core < activeCores(size, validators) ? null : "bad_core_index";
