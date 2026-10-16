// Lesson 10.4's widget: the seven rules a block's verdicts must keep, checked in the order
// verdictError checks them, each under the vectors' name, and the vector that shows each
// break. Start from the two passing verdicts of progress_with_verdicts-4 on tiny (6
// judges, 5 votes each) and break one thing at a time. tools/widget-verdict-rules.test.ts
// checks the order, the names and the answers against the lesson's code and questions.

export type Vote = { index: number; valid: boolean; signed: boolean };
export type Verdict = { target: string; age: number; votes: Vote[]; judgedBefore?: boolean };
/** The block's two verdicts, in report-hash order: 0x11da… judged good (5 valid), 0x7b0a… bad (0 valid). */
export const EPOCH = 0; // tiny's progress_with_verdicts-4 sits in epoch 0
const votes = (valid: number): Vote[] => Array.from({ length: 5 }, (_, i) => ({ index: i, valid: i < valid, signed: true }));
export const PASSING: Verdict[] = [
  { target: "0x11da6d1f…", age: EPOCH, votes: votes(5) },
  { target: "0x7b0aa173…", age: EPOCH, votes: votes(0) },
];
/** The judges: κ for a verdict aged this epoch, λ for the last; tiny has 6 of each unless resized. */
export type Judges = { kappa: number; lambda: number };
export const TINY: Judges = { kappa: 6, lambda: 6 };
/** The full vector tiny can't have: λ of 6, κ of 1,023 (progress_with_verdicts_from_resized_previous_set-2). */
export const RESIZED: Judges = { kappa: 1023, lambda: 6 };

/** The rules, in the code's order, with the vectors' names and the vector that breaks each. */
export const RULES: { n: number; says: string; error: string; vector: string }[] = [
  { n: 1, says: "verdicts sorted by report hash, none twice", error: "verdicts_not_sorted_unique", vector: "progress_with_verdicts-3" },
  { n: 2, says: "no report judged before", error: "already_judged", vector: "progress_with_culprits-3" },
  { n: 3, says: "age is this epoch or the last", error: "bad_judgement_age", vector: "progress_with_verdict_signatures_from_previous_set-2" },
  { n: 4, says: "exactly ⌊⅔|K|⌋ + 1 votes", error: "bad_votes_count", vector: "progress_with_bad_votes_count-1" },
  { n: 5, says: "votes sorted by judge index, no judge twice", error: "judgements_not_sorted_unique", vector: "progress_with_verdicts-1" },
  { n: 6, says: "every vote signed by the judge it names", error: "bad_signature", vector: "progress_with_bad_signatures-1" },
  { n: 7, says: "all, none, or a third of the judges said valid", error: "bad_vote_split", vector: "progress_with_verdicts-5" },
];

/** K(a): how many judges a verdict's age picks. */
export const judgesOf = (v: Verdict, judges: Judges, epoch: number): number => (v.age === epoch ? judges.kappa : judges.lambda);
export const twoThirdsPlusOne = (k: number): number => Math.floor((2 * k) / 3) + 1;

/** The first rule broken, as verdictError finds it, or null. */
export function verdictError(verdicts: Verdict[], judges: Judges, epoch = EPOCH): (typeof RULES)[number] | null {
  const rule = (n: number) => RULES[n - 1];
  if (!verdicts.every((v, i) => i === 0 || verdicts[i - 1].target < v.target)) return rule(1);
  if (verdicts.some((v) => v.judgedBefore)) return rule(2);
  if (!verdicts.every((v) => v.age === epoch || v.age === epoch - 1)) return rule(3);
  if (!verdicts.every((v) => v.votes.length === twoThirdsPlusOne(judgesOf(v, judges, epoch)))) {
    // the resized full vector breaks this rule another way: 5 votes against κ's 1,023 judges
    return judges.kappa !== judges.lambda ? { ...rule(4), vector: "progress_with_verdicts_from_resized_previous_set-2" } : rule(4);
  }
  if (!verdicts.every((v) => v.votes.every((j, i) => i === 0 || v.votes[i - 1].index < j.index))) return rule(5);
  if (!verdicts.every((v) => v.votes.every((j) => j.signed && j.index < judgesOf(v, judges, epoch)))) return rule(6);
  if (!verdicts.every((v) => { const k = judgesOf(v, judges, epoch); const valid = v.votes.filter((j) => j.valid).length; return [twoThirdsPlusOne(k), 0, Math.floor(k / 3)].includes(valid); })) return rule(7);
  return null;
}

/** The breaks a reader can make to the passing verdicts, each a function of them. */
export type Break = { id: string; says: string; apply: (v: Verdict[]) => Verdict[]; judges?: Judges };
const copy = (v: Verdict[]) => v.map((x) => ({ ...x, votes: x.votes.map((j) => ({ ...j })) }));
export const BREAKS: Break[] = [
  { id: "swap", says: "swap the two verdicts", apply: (v) => [v[1], v[0]].map((x) => ({ ...x })) },
  { id: "judged", says: "the first report was judged before", apply: (v) => { const c = copy(v); c[0].judgedBefore = true; return c; } },
  { id: "old", says: "age it two epochs back", apply: (v) => { const c = copy(v); c[0].age = EPOCH - 2; return c; } },
  { id: "drop", says: "drop a vote", apply: (v) => { const c = copy(v); c[0].votes.pop(); return c; } },
  { id: "repeat", says: "repeat a judge index", apply: (v) => { const c = copy(v); c[0].votes[1].index = c[0].votes[0].index; return c; } },
  { id: "unsign", says: "unsign a vote", apply: (v) => { const c = copy(v); c[0].votes[2].signed = false; return c; } },
  { id: "split", says: "make 1 of 5 valid", apply: (v) => { const c = copy(v); c[0].votes.forEach((j, i) => { j.valid = i === 0; }); return c; } },
  { id: "resized", says: "λ has 6, κ has 1,023", apply: (v) => copy(v), judges: RESIZED },
];
