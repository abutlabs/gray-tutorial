// Lesson 17.6's widget: R, the merge rule, on two cores. After a round each core's assigner is
// R(o, a, b): o the holder at the round's start, a the manager's run's choice, b the holder's
// own run's; R = b if a = o, else a. A core's new queue comes only from its holder at the
// start. tools/widget-merge-rule.test.ts checks it against the lesson's R, test and checks.

export const R = (o: number, a: number, b: number): number => (a === o ? b : a);
export const BEFORE = [1, 1]; // the test's χ_A: service 1 holds both cores; service 0 manages
export const MANAGER = 0;
export type Choices = { manager: number[]; holder: number[]; holderQueue: boolean[] };
/** The test's runs: the manager gives core 0 to 5; service 1 gives both to 7, and sets core 1's queue. */
export const TEST: Choices = { manager: [5, 1], holder: [7, 7], holderQueue: [false, true] };

export function merge(c: Choices) {
  return BEFORE.map((o, core) => ({
    core,
    o,
    a: c.manager[core],
    b: c.holder[core],
    after: R(o, c.manager[core], c.holder[core]),
    queue: c.holderQueue[core], // only the holder at the start, service o, sets it
  }));
}
