// Lesson 12.3's widget: the guarantees go onto the cores, and the reported packages are
// listed by hash. Each guarantee's report takes the core it names, registered at τ′; the
// reported packages, a dictionary, are sorted by package hash, not by the guarantees'
// order. The values are the run's vector, reports/tiny/high_work_report_gas-1.
// tools/widget-onto-cores.test.ts checks them against the lesson's code, run and vector.

/** τ′: the block's slot. */
export const SLOT = 14;
export const CORE_COUNT = 2;
/** The vector's guarantees, in the extrinsic's order: each report's core, package and exports root. */
export const GUARANTEES = [
  { core: 0, pkg: "0x63c03371b9dad9f1c60473ec0326c970984e9c90c0b5ed90eba6ada471ba4d86", exportsRoot: "0x5c9dca800c145685f052ce1ba343e2b66b4c333ee4c4ca3b29cb347b1009cb83" },
  { core: 1, pkg: "0x316504b8883be5404f8d50c253fa1875f3a5e051b691a0ddecc79466df543ea4", exportsRoot: "0x5c9dca800c145685f052ce1ba343e2b66b4c333ee4c4ca3b29cb347b1009cb83" },
];
export type Guarantee = (typeof GUARANTEES)[number];

/** ρ′ after the first `placed` guarantees: each core's package and since when, or null. */
export function placeReports(placed: number): ({ pkg: string; since: number } | null)[] {
  const after: ({ pkg: string; since: number } | null)[] = Array(CORE_COUNT).fill(null);
  for (const g of GUARANTEES.slice(0, placed)) after[g.core] = { pkg: g.pkg, since: SLOT };
  return after;
}

/** The reported packages of the first `placed` guarantees: their hash and exports root, sorted by hash. */
export const reportedPackages = (placed: number): Guarantee[] =>
  GUARANTEES.slice(0, placed).sort((a, b) => a.pkg.localeCompare(b.pkg));
