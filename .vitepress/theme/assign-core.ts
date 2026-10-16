// Lesson 17.5's widget: assign (Ω_A) with service 0 holding every privilege (the tests'
// ZERO_HOLDS_ALL), on tiny's two cores. Only a core's assigner may set its queue and name the
// next one; CORE, HUH and WHO refuse in that order. tools/widget-assign-core.test.ts checks
// it against the lesson's tests.

export const CORES = 2;
export const NOBODY = 2 ** 32;
export const START = { assign: [0, 0], queues: [false, false] };
export type State = typeof START;
export type Result = { state: State; answer: "OK" | "CORE" | "HUH" | "WHO"; why: string };

export function assign(s: State, caller: number, core: number, next: number): Result {
  if (core >= CORES) return { state: s, answer: "CORE", why: `tiny has cores 0 and 1; there's no core ${core}` };
  if (s.assign[core] !== caller) return { state: s, answer: "HUH", why: `core ${core}'s assigner is service ${s.assign[core]}, not service ${caller}` };
  if (next >= NOBODY) return { state: s, answer: "WHO", why: "2^32 is too big to be a service id" };
  const assigned = [...s.assign]; assigned[core] = next;
  const queues = [...s.queues]; queues[core] = true;
  return { state: { assign: assigned, queues }, answer: "OK", why: `core ${core} gets its 80-hash queue, and service ${next} is its assigner now` };
}
