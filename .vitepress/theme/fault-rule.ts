// Lesson 10.5's widget: the ⇔ of a fault, and who must be named. A fault stands only if
// r ∈ ψ′_B, r ∉ ψ′_G and its vote v are all true or all false; a culprit needs a bad
// report; a good verdict needs at least one fault; a bad verdict needs no culprit. The
// answers are the names offenseError gives, in its order. tools/widget-fault-rule.test.ts
// checks each case against the lesson's code, run and check questions.

export type Verdict = "good" | "bad" | "wonky";
export type Vote = "valid" | "invalid";
export type Trial = { verdict: Verdict; fault: Vote | null; culprit: boolean };

/** Rule 6's three terms for a fault on report r with vote v. */
export function terms(verdict: Verdict, vote: Vote): { inBad: boolean; notGood: boolean; v: boolean; agree: boolean } {
  const inBad = verdict === "bad";
  const notGood = verdict !== "good";
  const v = vote === "valid";
  return { inBad, notGood, v, agree: inBad === notGood && notGood === v };
}

/** The first rule broken, under the vectors' name, in offenseError's order, or null: accepted. */
export function offenseError(t: Trial): { error: string; vector: string } | null {
  if (t.culprit && t.verdict !== "bad") return { error: "culprits_verdict_not_bad", vector: "progress_with_culprits-5" };
  if (t.fault && !terms(t.verdict, t.fault).agree) return { error: "fault_verdict_wrong", vector: "progress_with_faults-7" };
  if (t.verdict === "good" && !t.fault) return { error: "not_enough_faults", vector: "progress_with_faults-1" };
  return null;
}
/** The accepted case the lesson points at: a bad verdict with no culprit named. */
export const BAD_WITHOUT_CULPRITS = "progress_with_bad_verdict_without_culprits-1";
export const VERDICTS: Verdict[] = ["good", "bad", "wonky"];
export const VOTES: Vote[] = ["valid", "invalid"];
