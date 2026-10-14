// Lesson 11.2's widget: the life of a work-report on a core, block by block, on tiny. A
// block's disputes clear judged reports (ρ†, lesson 10.3), its assurances make reports
// available or let them time out (ρ‡, lessons 11.1 and 11.2), and its guarantees put new
// reports on the cores left free (ρ′, lesson 12.3), in that order (lesson 19.1).
// tools/widget-report-life.test.ts checks it against the lessons' own values.

import { bitAt, bitfieldOf, isAvailable, needed } from "./bitfield.ts";

export const VALIDATORS = 6; // tiny
export const CORES = 2; // tiny
/** U: the slots a report may wait on its core for its data to become available. */
export const AVAILABILITY_TIMEOUT = 5;

/** A report waiting on a core, and the slot it was put there. */
export type Pending = { name: string; registered: number };
export type Cores = (Pending | null)[];
/** What the widget remembers between blocks: τ, ρ, and how many reports it has named. */
export type Chain = { slot: number; cores: Cores; named: number };

/** One block's say over the cores. */
export type Block = {
  slot: number; // this block's slot, H_t
  judged: number[]; // cores whose report a verdict in E_D finds bad (or wonky)
  assurances: number[][]; // E_A: one bitfield per validator, a bit per core
  guaranteed: number[]; // cores that E_G puts a new report on
};

/** What a block did to each core, and the log line saying it in plain words. */
export type Outcome = {
  chain: Chain; // after the block; the same chain if it was refused
  refused: "core_not_engaged" | "core_engaged" | null;
  judged: number[];
  available: number[];
  timedOut: number[];
  placed: number[];
  log: string;
};

/** The chain the widget starts from: slot 7's block put report A on core 0. */
export const START: Chain = { slot: 7, cores: [{ name: "A", registered: 7 }, null], named: 1 };

/** An empty block at a slot: no verdicts, no assurances, no guarantees. */
export const emptyBlock = (slot: number): Block => ({
  slot,
  judged: [],
  assurances: Array.from({ length: VALIDATORS }, () => bitfieldOf(CORES, () => false)),
  guaranteed: [],
});

/** Reports are named A, B, ..., Z, then A2, B2, .... */
export const nameOf = (n: number): string => String.fromCharCode(65 + (n % 26)) + (n < 26 ? "" : String(Math.floor(n / 26) + 1));

/** The slot at which a report times out, unless that block's assurances make it available. */
export const timeoutSlot = (p: Pending): number => p.registered + AVAILABILITY_TIMEOUT;

/** Has it waited U slots by this block? */
export const timedOut = (p: Pending, slot: number): boolean => slot >= timeoutSlot(p);

/** How many validators say they hold core c's data. */
export const assuredCount = (assurances: number[][], c: number): number => assurances.filter((a) => bitAt(a, c)).length;

/** ρ†: the cores, without the reports judged bad. */
export const clearJudged = (cores: Cores, judged: number[]): Cores => cores.map((p, c) => (judged.includes(c) ? null : p));

/** The cores whose report becomes available: more than two thirds of the validators assure it. */
export const availableCores = (cores: Cores, assurances: number[][]): number[] =>
  cores.flatMap((p, c) => (p !== null && isAvailable(assuredCount(assurances, c), VALIDATORS) ? [c] : []));

/** ρ‡: the cores, without the reports that became available or timed out. */
export const clearCores = (cores: Cores, available: number[], slot: number): Cores =>
  cores.map((p, c) => (p === null || available.includes(c) || timedOut(p, slot) ? null : p));

/** Imports one block: the order is disputes, then assurances, then guarantees. */
export function importBlock(chain: Chain, block: Block): Outcome {
  const { slot, assurances } = block;
  const judged = block.judged.filter((c) => chain.cores[c] !== null);
  const dagger = clearJudged(chain.cores, judged); // ρ†
  const refuse = (refused: "core_not_engaged" | "core_engaged", why: string): Outcome =>
    ({ chain, refused, judged: [], available: [], timedOut: [], placed: [], log: `slot ${slot}: refused, nothing changes. ${why}` });

  // an assurance may only vouch for a core that holds a report after the disputes
  const idle = dagger.findIndex((p, c) => p === null && assuredCount(assurances, c) > 0);
  if (idle >= 0) {
    const why = judged.includes(idle) ? "the dispute already cleared it in this block" : "it holds no report";
    return refuse("core_not_engaged", `Validators assured core ${idle}, but ${why} (core_not_engaged).`);
  }
  const available = availableCores(dagger, assurances);
  const doubleDagger = clearCores(dagger, available, slot); // ρ‡
  const gone = dagger.flatMap((p, c) => (p !== null && !available.includes(c) && timedOut(p, slot) ? [c] : []));

  // a guarantee may only take a core that is free after the assurances
  const busy = block.guaranteed.find((c) => doubleDagger[c] !== null);
  if (busy !== undefined) {
    const p = doubleDagger[busy]!;
    return refuse("core_engaged", `Core ${busy} still holds report ${p.name} after the assurances, so it can't take another (core_engaged).`);
  }
  const cores = [...doubleDagger]; // ρ′
  let named = chain.named;
  const placed = [...new Set(block.guaranteed)].sort((a, b) => a - b);
  const said: string[] = [];
  chain.cores.forEach((p, c) => {
    if (p === null) return;
    const n = assuredCount(assurances, c);
    if (judged.includes(c)) said.push(`core ${c}'s report ${p.name} was judged bad: cleared off its core, never to be accumulated.`);
    else if (available.includes(c)) said.push(`core ${c}'s report ${p.name} became available: ${n} of ${VALIDATORS} assured; it goes on to be accumulated.`);
    else if (gone.includes(c)) said.push(`core ${c}'s report ${p.name} timed out: ${slot} ≥ ${p.registered} + ${AVAILABILITY_TIMEOUT}, with ${n} of ${VALIDATORS} assured; it is dropped.`);
    else said.push(`core ${c}'s report ${p.name} waits: ${n} of ${VALIDATORS} assured, ${needed(VALIDATORS)} needed.`);
  });
  for (const c of placed) {
    const name = nameOf(named++);
    cores[c] = { name, registered: slot };
    said.push(`report ${name} is guaranteed onto core ${c}, registered at slot ${slot}.`);
  }
  const log = `slot ${slot}: ${said.length ? said.join(" ") : "an empty block; both cores stay free."}`;
  return { chain: { slot, cores, named }, refused: null, judged, available, timedOut: gone, placed, log };
}
