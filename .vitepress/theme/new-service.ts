// Lesson 17.8's widget: new (Ω_N) from the tests' service 0 (1,000, of which 170 must stay).
// The new service keeps one request for its own code (2 items, 81 + length bytes), and its
// balance is that minimum, paid by service 0. Its id is the registrar's choice below 2^16,
// or the run's next free id, which then moves 42 on, skipping ids taken.
// tools/widget-new-service.test.ts checks it against the lesson's tests and check.

export const MIN_PUBLIC_ID = 2 ** 16;
export const PUBLIC_IDS = 2 ** 32 - MIN_PUBLIC_ID - 2 ** 8;
export const SELF_MINIMUM = 170;
export const newBalance = (length: number, gratis = 0): number => Math.max(0, 100 + 2 * 10 + 81 + length - gratis);
/** The lesson's check: step past ids already taken, round the public range. */
export function check(i: number, taken: Set<number>): number {
  while (taken.has(i)) i = ((i - MIN_PUBLIC_ID + 1) % PUBLIC_IDS) + MIN_PUBLIC_ID;
  return i;
}
export type State = { balance: number; next: number; taken: Set<number> };
export const start = (): State => ({ balance: 1000, next: 70_000, taken: new Set([0]) });
export type Ask = { length: number; gratis: boolean; registrar: boolean; wanted: number };
export type Result = { state: State; answer: string; why: string };

export function create(s: State, ask: Ask): Result {
  const cost = newBalance(ask.length);
  const left = s.balance - cost;
  if (ask.gratis) return { state: s, answer: "HUH", why: "gratis storage is the manager's to give, and service 0 isn't the manager" };
  if (left < SELF_MINIMUM) return { state: s, answer: "CASH", why: `the new service needs ${cost.toLocaleString("en-US")}, which would leave service 0 ${left.toLocaleString("en-US")}, below its ${SELF_MINIMUM}` };
  const chosen = ask.registrar && ask.wanted < MIN_PUBLIC_ID;
  if (chosen && s.taken.has(ask.wanted)) return { state: s, answer: "FULL", why: `id ${ask.wanted} is taken` };
  const id = chosen ? ask.wanted : s.next;
  const taken = new Set([...s.taken, id]);
  const next = chosen ? s.next : check(((id - MIN_PUBLIC_ID + 42) % PUBLIC_IDS) + MIN_PUBLIC_ID, taken);
  return {
    state: { balance: left, next, taken },
    answer: String(id),
    why: `service ${id.toLocaleString("en-US")} starts with ${cost.toLocaleString("en-US")}, its own minimum: 100 + 2 × 10 + (81 + ${ask.length}). ${chosen ? "The registrar's choice doesn't move the counter." : `The next free id moves 42 on: ${next.toLocaleString("en-US")}.`}`,
  };
}
