// Lesson 19.6's widget: running out of gas while growing the heap, under two rules. Fuzzy
// block 31's service had g = 2,000,000 and, by the old rule's count, used 1,545,786, so it
// held 454,214 when it asked to grow. Growing costs 275 + 121 a page. GP 0.8.0's text checked
// first and took nothing; the vectors (GP pull request 533) spend it all, as charge does for
// any host call. The gas used is u = g − max(ϱ′, 0). tools/widget-oog-heap.test.ts checks it.

export const BUDGET = 2_000_000;
export const LEFT = BUDGET - 1_545_786; // ϱ, as grow_heap is called
export const cost = (pages: number): number => 275 + 121 * pages;
export type Outcome = { exit: "continue" | "oog"; left: number; used: number };
/** grow_heap by `pages` with `left` gas, under the old rule or the vectors'. */
export function grow(pages: number, left: number, rule: "old" | "vectors"): Outcome {
  const g = cost(pages);
  if (g <= left) return { exit: "continue", left: left - g, used: BUDGET - (left - g) };
  if (rule === "old") return { exit: "oog", left, used: BUDGET - left };
  const after = left - g; // charge: take it, then ask
  return { exit: "oog", left: after, used: BUDGET - Math.max(after, 0) };
}
export const PAGES = [10, 3752, 5000];
