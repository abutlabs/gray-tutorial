// Lesson 17.2's widget: reports that wait for other work-packages (Gray Paper §12, History
// and Queuing), on tiny. Packages are letters instead of hashes; the rule is the lesson's
// accumulateBlock, its E (`edit`) and Q (`unlock`), without the services' run.
// tools/widget-ready-queue.test.ts checks it against the lesson's own example and its code.

/** Tiny's epoch length: ω has a list for each of E slots, and ξ remembers the last E blocks. */
export const E = 12;

/** A report the block brings: its work-package and the packages it depends on. */
export type Report = { pkg: string; deps: string[] };

/** A report in ω. `deps` is what it still waits for; `wanted` (all it named) and `since`
 *  (the slot it came in) are only for the widget to say what happened. */
export type Waiter = { pkg: string; deps: string[]; wanted: string[]; since: number };

/** One of ξ's sets: what a block accumulated, and its slot (null for the empty start). */
export type Remembered = { slot: number | null; pkgs: string[] };

/** What a block's accumulation reads and gives back: τ, ω and ξ (oldest set first). */
export type QueueState = { slot: number; ready: Waiter[][]; history: Remembered[] };

/** The list of ω that a report arriving at `slot` waits in. */
export const listOf = (slot: number): number => slot % E;

/** Nothing waiting, nothing remembered: the state after the block at `slot`. */
export const emptyState = (slot: number): QueueState => ({
  slot,
  ready: Array.from({ length: E }, () => []),
  history: Array.from({ length: E }, () => ({ slot: null, pkgs: [] })),
});

/** E (GP §12): the queue without the reports whose packages are done, and without the done
 *  packages in what the rest wait for. */
export function edit(queue: Waiter[], done: Set<string>): Waiter[] {
  return queue
    .filter((w) => !done.has(w.pkg))
    .map((w) => ({ ...w, deps: w.deps.filter((d) => !done.has(d)) }));
}

/** Q (GP §12), wave by wave: the waiters waiting for nothing, then the ones they free, and so
 *  on until nothing more is free. Also the waiters dropped on the way: a package that went in
 *  an earlier wave needs no second report. */
export function unlock(queue: Waiter[]): { waves: Waiter[][]; dropped: Waiter[] } {
  const waves: Waiter[][] = [];
  const dropped: Waiter[] = [];
  for (;;) {
    const free = queue.filter((w) => w.deps.length === 0);
    if (free.length === 0) return { waves, dropped };
    waves.push(free);
    const done = new Set(free.map((w) => w.pkg));
    dropped.push(...queue.filter((w) => !free.includes(w) && done.has(w.pkg)));
    queue = edit(queue, done);
  }
}

/** Everything one block did, for the widget to show, and the state it leaves. */
export type Step = {
  slot: number; // τ′
  now: string[]; // R!: the packages that wait for nothing
  cleared: { pkg: string; deps: string[] }[]; // new reports' dependencies ξ already holds
  dropped: { w: Waiter; why: "remembered" | "went" }[]; // waiters whose package is done
  waves: Waiter[][]; // Q's waves: the waiters unlocked, in order
  waiting: Waiter[]; // R^Q still waiting: the new waiters in this slot's list
  givenUp: Waiter[]; // waiters that waited an epoch, or whose slot the chain skipped
  accumulated: string[]; // R*'s packages: ξ's newest set
  state: QueueState;
};

/** A block at `slot` (τ′) bringing `reports`: what goes, what waits, what's given up. */
export function block(state: QueueState, slot: number, reports: Report[]): Step {
  const remembered = new Set(state.history.flatMap((h) => h.pkgs)); // ξ∪
  const now = reports.filter((r) => r.deps.length === 0).map((r) => r.pkg); // R!
  const fresh = reports
    .filter((r) => r.deps.length > 0)
    .map((r) => ({ pkg: r.pkg, deps: r.deps, wanted: r.deps, since: slot }));
  const queued = edit(fresh, remembered); // R^Q
  const m = listOf(slot);
  const ring = [...state.ready.slice(m), ...state.ready.slice(0, m)].flat();
  const went = new Set(now);
  const { waves, dropped: twice } = unlock(edit([...ring, ...queued], went));
  const accumulated = [...now, ...waves.flat().map((w) => w.pkg)]; // R*
  const done = new Set(accumulated);

  const history = [...state.history.slice(1), { slot, pkgs: [...done] }]; // ξ′: newest last
  const ready: Waiter[][] = []; // ω′, slot by slot back from m
  const givenUp: Waiter[] = [];
  for (let i = 0; i < E; i++) {
    const at = (m - i + E) % E;
    const left = edit(state.ready[at], done);
    if (i === 0) ready[at] = edit(queued, done); // this block's newcomers
    else if (i < slot - state.slot) ready[at] = []; // slots the chain skipped: emptied
    else ready[at] = left;
    if (i < slot - state.slot) givenUp.push(...left);
  }

  return {
    slot,
    now,
    cleared: fresh
      .map((r) => ({ pkg: r.pkg, deps: r.deps.filter((d) => remembered.has(d)) }))
      .filter((r) => r.deps.length > 0 && !remembered.has(r.pkg)),
    dropped: [
      ...fresh.filter((r) => remembered.has(r.pkg)).map((w) => ({ w, why: "remembered" as const })),
      ...[...ring, ...queued].filter((w) => went.has(w.pkg)).map((w) => ({ w, why: "went" as const })),
      ...twice.map((w) => ({ w, why: "went" as const })),
    ],
    waves,
    waiting: ready[m],
    givenUp,
    accumulated,
    state: { slot, ready, history },
  };
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const waitedFor = (w: Waiter, slot: number) =>
  `${w.pkg} (waiting for ${list(w.wanted)}${w.since === slot ? ", new this block" : ` since slot ${w.since}`})`;

/** A block in plain words, a sentence a line. */
export function describe(step: Step, before: QueueState): string[] {
  const { slot } = step;
  const lines = [`Slot ${slot}: ω's list ${slot} mod ${E} = ${listOf(slot)} is this block's.`];
  if (step.now.length) {
    lines.push(`${list(step.now)} wait${step.now.length === 1 ? "s" : ""} for nothing: ${step.now.length === 1 ? "it goes" : "they go"} now.`);
  }
  for (const c of step.cleared) lines.push(`ξ remembers ${list(c.deps)} going earlier, so ${c.pkg} doesn't wait for ${c.deps.length === 1 ? "it" : "them"}.`);
  for (const { w, why } of step.dropped) {
    lines.push(why === "remembered"
      ? `${w.pkg} is already in ξ: this new report of it is dropped.`
      : `${w.pkg} just went, so the report of ${w.pkg} waiting for ${list(w.wanted)} is dropped.`);
  }
  step.waves.forEach((wave, i) => {
    lines.push(`${i === 0 && !step.now.length ? "Free at once" : "That unlocks"}: ${wave.map((w) => waitedFor(w, slot)).join(", ")}.`);
  });
  for (const w of step.waiting) lines.push(`${w.pkg} waits in list ${listOf(slot)} for ${list(w.deps)}.`);
  for (const w of step.givenUp) lines.push(`${w.pkg} is given up: it has waited since slot ${w.since}, an epoch or more.`);
  if (slot - before.slot > 1) {
    const skipped = slot - before.slot - 1;
    lines.push(`${skipped} slot${skipped === 1 ? "" : "s"} skipped since slot ${before.slot}: ${skipped === 1 ? "its list is" : "their lists are"} emptied.`);
  }
  lines.push(`ξ moves on one block: {${step.accumulated.join(", ")}} goes on the end, the oldest set drops off.`);
  return lines;
}

/** The lesson's example: the block at slot 42 left nothing waiting; D, waiting for A, is next. */
export const lessonStart = (): { state: QueueState; incoming: Report[] } =>
  ({ state: emptyState(42), incoming: [{ pkg: "D", deps: ["A"] }] });

/** The chain vectors (enqueue_and_unlock_chain-1 to -4) as letters, just before -4's block:
 *  B and E came in at slot 43, D at 44, C at 46 with F and G going; A, at slot 47, frees them all. */
export function chainStart(): { state: QueueState; incoming: Report[] } {
  const state = emptyState(46);
  const w = (pkg: string, deps: string[], since: number): Waiter => ({ pkg, deps, wanted: deps, since });
  state.ready[7] = [w("B", ["A"], 43), w("E", ["C", "D"], 43)];
  state.ready[8] = [w("D", ["B"], 44)];
  state.ready[10] = [w("C", ["A"], 46)];
  state.history = [
    ...state.history.slice(3),
    { slot: 43, pkgs: [] },
    { slot: 44, pkgs: [] },
    { slot: 46, pkgs: ["F", "G"] },
  ];
  return { state, incoming: [{ pkg: "A", deps: [] }] };
}

/** The widget's tasks; a block's step ticks them, never a click on the task itself. */
export const GOALS = [
  { id: "wait", say: "make a report wait in ω" },
  { id: "same", say: "bring a waiter's last dependency: both go in one block, like the lesson's A and D" },
  { id: "chain", say: "unlock a chain of three in one block: each one unlocked frees the next" },
  { id: "history", say: "bring a report whose dependency went in an earlier block: ξ remembers, so it goes at once" },
];

/** The goals a block brought about. */
export function goalsMet(step: Step): string[] {
  const unlocked = step.waves.flat();
  const met: string[] = [];
  if (step.waiting.length > 0) met.push("wait");
  if (unlocked.some((w) => w.since < step.slot)) met.push("same");
  if (step.waves.length >= 3) met.push("chain");
  if (step.cleared.some((c) => step.accumulated.includes(c.pkg))) met.push("history");
  return met;
}
