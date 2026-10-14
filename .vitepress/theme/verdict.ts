// Lesson 10.1's widget: a verdict's votes and what they decide (Gray Paper §10). A verdict
// carries exactly ⌊2V/3⌋ + 1 of its V judges' votes, and only three counts of "valid" mean
// anything: all of them (good), none (bad), or ⌊V/3⌋ (wonky). Any other count, or any other
// number of votes, and the chain refuses the block (lesson 10.4's rules 4 and 7).
// tools/widget-belt-verdicts.test.ts checks it against the lessons' own values.

/** One judge's part in a verdict: a "valid" vote, an "invalid" one, or no vote in it. */
export type Vote = "valid" | "invalid" | null;

/** What a verdict decides, or the error a block carrying it is refused with. */
export type Judged = "good" | "bad" | "wonky" | "bad_votes_count" | "bad_vote_split";

/** ⌊2V/3⌋ + 1: how many votes a verdict carries, and how many "valid" make it good. */
export const votesNeeded = (judges: number): number => Math.floor((2 * judges) / 3) + 1;

/** ⌊V/3⌋: how many "valid" make it wonky. */
export const wonkyCount = (judges: number): number => Math.floor(judges / 3);

/** V (GP §10), with lesson 10.4's two checks on the count before it, in the same order. */
export function judge(valid: number, votes: number, judges: number): Judged {
  if (votes !== votesNeeded(judges)) return "bad_votes_count";
  if (valid === votesNeeded(judges)) return "good";
  if (valid === 0) return "bad";
  if (valid === wonkyCount(judges)) return "wonky";
  return "bad_vote_split";
}

/** How many votes a verdict carries, and how many of them say "valid". */
export function count(votes: Vote[]): { votes: number; valid: number } {
  return { votes: votes.filter((v) => v !== null).length, valid: votes.filter((v) => v === "valid").length };
}

/** V judges, the first `valid` voting "valid", the next `invalid` "invalid", the rest not voting. */
export const votesOf = (judges: number, valid: number, invalid: number): Vote[] =>
  Array.from({ length: judges }, (_, i) => (i < valid ? "valid" : i < valid + invalid ? "invalid" : null));
