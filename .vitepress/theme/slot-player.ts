// The start page's slot player: cores colour-coded, slots going by. Full plays who works
// where: every validator takes its core's colour, and every 10 slots all of them move on one
// core (network-map.ts's real assignment). Tiny plays real work: the storage trace's 100
// blocks, each core's report arriving with its guarantors, waiting for assurances, and
// becoming available (5 of 6) or timing out (5 slots), in the Gray Paper's order: a block's
// assurances first, then its guarantees (§11). tools/widget-slot-player.test.ts checks it.

import { coresAt, NETWORKS } from "./network-map.ts";
import { BLOCKS, ETAS } from "./network-trace.ts";

/** A core's colour: hues a golden angle apart, so neighbours never look alike. */
export const hue = (core: number): number => Math.round((core * 137.508) % 360);
export const colour = (core: number, light = 55): string => `hsl(${hue(core)} 65% ${light}%)`;

/** Full: the slots the player loops over, one epoch from the vector's (600 to 1199). */
export const FULL_FIRST = 600;
export const FULL_SLOTS = NETWORKS.full.E;
export const fullCoresAt = (slot: number): number[] => coresAt("full", slot);

/** What happened on one core in one block. */
export type Event = "idle" | "in" | "waiting" | "available" | "timed out";
export interface Moment {
  slot: number;
  cores: number[]; // each validator's core this slot (the real assignment)
  events: Event[]; // per core: what this block did to it (a report in after one leaves shows "in")
  left: (Event | null)[]; // per core: a report that left this block, available or timed out, else null
  signers: number[][]; // per core: who signed a report that came in this block
  assured: number[][]; // per core: who assured it this block
}

export const TINY = NETWORKS.tiny;
export const NEEDED = Math.floor((2 * TINY.validators) / 3) + 1; // 5 of 6
export const TIMEOUT = 5; // U, slots (lesson 11.2)

/** The trace played block by block. */
export const MOMENTS: Moment[] = (() => {
  const pending: (number | null)[] = Array(TINY.cores).fill(null); // the slot each core's report came in
  return BLOCKS.map(([slot, eta, guarantees, assurances]) => {
    const events: Event[] = pending.map((p) => (p === null ? "idle" : "waiting"));
    const left: (Event | null)[] = Array(TINY.cores).fill(null);
    const assured = pending.map((_, c) => assurances.filter(([, bits]) => (bits >> c) & 1).map(([v]) => v));
    // assurances first: a report with enough becomes available; one waiting too long times out
    pending.forEach((since, c) => {
      if (since === null) return;
      if (assured[c].length >= NEEDED) left[c] = "available";
      else if (slot >= since + TIMEOUT) left[c] = "timed out";
      if (left[c]) { pending[c] = null; events[c] = left[c]!; }
    });
    // then the guarantees: a new report onto a core that's free
    const signers: number[][] = pending.map(() => []);
    for (const [core, who] of guarantees) {
      if (pending[core] !== null) throw new Error(`slot ${slot}: core ${core} still has a report waiting`);
      pending[core] = slot;
      events[core] = "in";
      signers[core] = who;
    }
    return { slot, cores: coresAt("tiny", slot, ETAS[eta]), events, left, signers, assured };
  });
})();

/** Each core's story over the trace, slot by slot, for the lanes under the picture. */
export const LANES: Event[][] = Array.from({ length: TINY.cores }, (_, c) => MOMENTS.map((m) => m.events[c]));

/** The trace's totals: reports in, available, timed out. */
export const TOTALS = {
  in: MOMENTS.reduce((n, m) => n + m.events.filter((e) => e === "in").length, 0),
  available: MOMENTS.reduce((n, m) => n + m.left.filter((e) => e === "available").length, 0),
  timedOut: MOMENTS.reduce((n, m) => n + m.left.filter((e) => e === "timed out").length, 0),
};
