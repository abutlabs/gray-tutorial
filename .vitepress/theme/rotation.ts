// Lesson 8.2's widget: the four validator sets sliding one step along at a new epoch, κ′ =
// γ_P, λ′ = κ, γ′_P = Φ(ι), with ι itself unchanged and each offender in it arriving in
// pending as a key of zeros, in place. The sets are the lesson's rotation run, each
// validator by the first four hex digits of its Ed25519 key. tools/widget-rotation.test.ts
// checks every row against the lesson's Output and its code.

export type SetName = "staging" | "pending" | "active" | "previous";
export const SET_NAMES: SetName[] = ["staging", "pending", "active", "previous"];
export const LETTER: Record<SetName, string> = { staging: "ι", pending: "γ_P", active: "κ", previous: "λ" };
export const WHO: Record<SetName, string> = {
  staging: "next in line, chosen by a privileged service",
  pending: "active from the next epoch",
  active: "validating right now",
  previous: "last epoch's, still needed to check what they signed",
};
export type Sets = Record<SetName, string[]>;

/** The sets before the block of enact-epoch-change-with-padding-1 (slot 45 → 48), as the run prints them. */
export const BEFORE: Sets = {
  staging: ["cab2", "ab00", "4418", "8b8c", "ad93", "f30a"],
  pending: ["4418", "ad93", "cab2", "f30a", "8b8c", "ab00"],
  active: ["ab00", "f30a", "8b8c", "4418", "ad93", "cab2"],
  previous: ["4418", "cab2", "8b8c", "f30a", "ab00", "ad93"],
};
/** ψ′_O in that vector: one offender. */
export const OFFENDERS: string[] = ["ab00"];
export const ZERO = "0000";

/** Φ: the keys, with each offender's replaced by zeros, in place. */
export const withoutOffenders = (keys: string[], offenders: string[]): string[] => keys.map((k) => (offenders.includes(k) ? ZERO : k));
/** At a new epoch, the sets move along one: ι, minus offenders, → γ_P → κ → λ; ι stays. */
export const rotate = (sets: Sets, offenders: string[]): Sets => ({
  staging: sets.staging,
  pending: withoutOffenders(sets.staging, offenders),
  active: sets.pending,
  previous: sets.active,
});
/** Where a set's keys after the block came from. */
export const FROM: Record<SetName, string> = { staging: "ι, unchanged", pending: "Φ(ι): ι minus offenders", active: "the old γ_P", previous: "the old κ" };
