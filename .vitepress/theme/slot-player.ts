// JAM at a glance's slot player: a real JAM chain in slow motion, the storage trace's 100
// tiny blocks. Each validator works the core the real assignment gives it (network-map.ts),
// switching every 4 slots; each core's report arrives with its guarantors, waits for
// assurances, and is accepted (5 of 6 in one block) or times out (5 slots), in the
// Gray Paper's order: a block's assurances first, then its guarantees (§11). Each slot is
// told in plain words. tools/widget-slot-player.test.ts checks it.

import { coresAt, NETWORKS } from "./network-map.ts";
import { BLOCKS, ETAS } from "./network-trace.ts";

/** A core's colour: hues a golden angle apart, so neighbours never look alike. */
export const hue = (core: number): number => Math.round((core * 137.508) % 360);
export const colour = (core: number, light = 55): string => `hsl(${hue(core)} 65% ${light}%)`;

/** What happened on one core in one block. */
export type Event = "idle" | "in" | "waiting" | "available" | "timed out";
export interface Moment {
  slot: number;
  cores: number[]; // each validator's core this slot (the real assignment)
  events: Event[]; // per core: what this block did to it (a report in after one leaves shows "in")
  left: (Event | null)[]; // per core: a report that left this block, available or timed out, else null
  signers: number[][]; // per core: who signed a report that came in this block
  assured: number[][]; // per core: who assured it this block
  pending: (number | null)[]; // per core, after the block: the slot its waiting report came in
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
    return { slot, cores: coresAt("tiny", slot, ETAS[eta]), events, left, signers, assured, pending: [...pending] };
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

/** The report on core c's bench after block i: the slot it came in, or null if the bench is free. */
export const waitingSince = (i: number, c: number): number | null => MOMENTS[i].pending[c];

/** Block i in plain words: what happened on each core. */
export function story(i: number): string {
  const m = MOMENTS[i];
  const list = (xs: number[]) => (xs.length < 2 ? `${xs[0]}` : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
  const parts = m.events.map((e, c) => {
    const held = `${m.assured[c].length} of 6`;
    const gone = m.left[c] === "available" ? `report accepted (${held} hold its pieces); ` : m.left[c] === "timed out" ? "report timed out; " : "";
    if (e === "in") {
      const earlier = m.signers[c].some((v) => m.cores[v] !== c) ? " (made before they switched)" : "";
      return `Core ${c}: ${gone}a new report arrives from validators ${list(m.signers[c])}${earlier}.`;
    }
    if (e === "available") return `Core ${c}: its report is accepted, and its results go into the chain: ${held} validators hold its pieces.`;
    if (e === "timed out") return `Core ${c}: its report times out: 5 slots went by without ${NEEDED} of 6 holding its pieces.`;
    if (e === "waiting") return `Core ${c}: its report waits: ${held} hold its pieces, ${NEEDED} needed.`;
    return `Core ${c} is free.`;
  });
  const switched = m.slot % TINY.R === 0 ? "The validators switch benches. " : "";
  return `Slot ${m.slot}. ${switched}${parts.join(" ")}`;
}
