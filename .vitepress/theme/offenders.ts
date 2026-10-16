// Lesson 10.2's widget: one trial's offenders and their evidence, from the lesson's
// offenders run on progress_with_verdicts-4. A culprit guaranteed a report judged bad and
// is convicted by its own jam_guarantee signature; a fault voted against the verdict and is
// convicted by its vote. The offenders mark keeps the block's order, culprits then faults;
// ψ_O keeps a sorted set. tools/widget-offenders.test.ts checks every line against the
// lesson's Output, code, test and check questions.

export type Offender = { kind: "culprit" | "fault"; key: string; report: string; vote?: "valid" | "invalid" };
/** The block's two reports, with the verdict each got. */
export const REPORTS: { hash: string; verdict: "bad" | "good" }[] = [
  { hash: "0x7b0aa173…", verdict: "bad" },
  { hash: "0x11da6d1f…", verdict: "good" },
];
/** The block's offenders, in the block's order: culprits, then faults. */
export const OFFENDERS: Offender[] = [
  { kind: "culprit", key: "0xad93247b…", report: "0x7b0aa173…" },
  { kind: "culprit", key: "0xcab2b9ff…", report: "0x7b0aa173…" },
  { kind: "fault", key: "0x4418fb8c…", report: "0x11da6d1f…", vote: "invalid" },
];
/** What an offender's evidence signs: the message its key must have signed. */
export const message = (o: Offender): string => (o.kind === "culprit" ? `jam_guarantee ⌢ ${o.report}` : `jam_${o.vote} ⌢ ${o.report}`);
/** Why that message convicts. */
export const because = (o: Offender): string =>
  o.kind === "culprit"
    ? "the very message a guarantor signs when vouching for a report: the guarantee convicts its signer"
    : `a vote, ${o.vote} on a report judged ${REPORTS.find((r) => r.hash === o.report)!.verdict}: against the verdict`;
/** H_O, the offenders mark: the keys in the block's order. */
export const offendersMark = (list: Offender[]): string[] => [...list.filter((o) => o.kind === "culprit"), ...list.filter((o) => o.kind === "fault")].map((o) => o.key);
/** ψ′_O: the offenders so far and this block's, as a sorted set. */
export const recordOffenders = (before: string[], list: Offender[]): string[] => [...new Set([...before, ...offendersMark(list)])].sort();
/** In progress_with_bad_signatures-2, the second culprit's evidence is a forgery: the lesson's test, [true, false]. */
export const FORGED_SECOND_CULPRIT = [true, false];
