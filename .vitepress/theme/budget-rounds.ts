// Lesson 17.9's widget: the block's gas budget, round by round. g = max(G_T, G_A · C + free
// gas); each round takes the longest run of reports, in order, whose gas fits after the free
// gas; the rest wait; the next round's budget is g* = g + new transfers' gas − gas used. The
// gas a round uses comes from running services, so the widget takes it as a knob (the
// check's 350,000). tools/widget-budget-rounds.test.ts checks it against the lesson.

export const G_T = 20_000_000; // tiny's max_block_gas
export const G_A = 10_000_000; // REPORT_GAS
export const CORES = 2;
export const budgetOf = (free: number): number => Math.max(G_T, G_A * CORES + free);

export type Round = { budget: number; took: number[]; waiting: number[]; used: number };
/** Rounds until every report is taken, or one round takes nothing. Each round uses `used` gas. */
export function rounds(reports: number[], free: number, used: number): Round[] {
  const out: Round[] = [];
  let budget = budgetOf(free);
  let todo = [...reports];
  for (let n = 0; n < 10 && todo.length; n++) {
    let spent = n === 0 ? free : 0; // the free gas is round 1's, before any report
    let fit = 0;
    while (fit < todo.length && spent + todo[fit] <= budget) spent += todo[fit++];
    out.push({ budget, took: todo.slice(0, fit), waiting: todo.slice(fit), used });
    if (fit === 0) break;
    todo = todo.slice(fit);
    budget = budget - used; // g* = g + 0 new transfers' gas − gas used
  }
  return out;
}
export const PRESETS = [
  { says: "the check's four reports", reports: [6_000_000, 9_000_000, 7_000_000, 2_000_000], free: 0 },
  { says: "the vector's two", reports: [20_000_000, 2_000_000], free: 0 },
];
export const M = (n: number): string => (n % 1_000_000 === 0 ? `${n / 1_000_000}M` : n.toLocaleString("en-US"));
