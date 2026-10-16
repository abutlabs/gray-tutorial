// Lesson 17.12's widget: provide (Ω_♈) and the end of the round (P). Service 1729 asked for
// the 8 bytes "preimage" and waits ([]); service 0 never asked. provide only records the
// provision in its run's 𝐩: WHO for no such service, HUH unless the request is [], HUH if
// this run gave it already. At the end of the round each provision whose service still waits
// is stored, the request becoming [44]; any other is dropped. tools/widget-provide-round.test.ts
// checks it against the lesson's tests and run.

import { H } from "./hash.ts";

export const SLOT = 44;
export const PREIMAGE = "preimage";
export const HASH = `0x${H([...new TextEncoder().encode(PREIMAGE)]).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
export const GAS = 3980 + Math.ceil((2264 * 8) / 1024);
export type Requests = Record<number, number[] | null>; // service → its request for the 8 bytes, or none
export const START_REQUESTS: Requests = { 0: null, 1729: [] };
export type Run = { giver: number; provided: number[] };
export type Answer = "OK" | "HUH" | "WHO";

/** One provide by `giver`'s run, to `to` (2^64 − 1 meaning itself). */
export function provide(requests: Requests, run: Run, to: number | "self"): { run: Run; answer: Answer } {
  const s = to === "self" ? run.giver : to;
  if (!(s in requests)) return { run, answer: "WHO" };
  if (requests[s]?.length !== 0) return { run, answer: "HUH" };
  if (run.provided.includes(s)) return { run, answer: "HUH" };
  return { run: { ...run, provided: [...run.provided, s] }, answer: "OK" };
}
/** P: at the end of the round, each provision whose service still waits is stored. */
export function endOfRound(requests: Requests, runs: Run[]): { requests: Requests; stored: number[]; dropped: number } {
  const after = { ...requests };
  const stored: number[] = [];
  let dropped = 0;
  for (const run of runs) for (const s of run.provided) {
    if (after[s]?.length !== 0) { dropped++; continue; }
    after[s] = [SLOT];
    stored.push(s);
  }
  return { requests: after, stored, dropped };
}
