// JAM at a glance's network widget (and lesson 4.2's): every validator, every core, and who works where. A core
// isn't a machine: at any slot three validators, its guarantors, run its work, dealt out by
// lesson 12.1's P (seats 0 0 0 1 1 1 …, shuffled with η by lesson 7.2's F and Q, then moved
// on one core every R slots), while every validator keeps a shard of every core's report
// (lesson 3.3). The entropy, slots and validator counts are the reports vector
// report_prev_rotation-1's, on tiny and full; its own guarantee's signers are where this
// shuffle seats them (tools/widget-network-map.test.ts).

import { H } from "./hash.ts";

export type Size = "tiny" | "full";
export interface Network { validators: number; cores: number; E: number; R: number; slot: number }

/** The two configurations (lesson 4.2), at the vector's block: slot 14 on tiny, 605 on full. */
export const NETWORKS: Record<Size, Network> = {
  tiny: { validators: 6, cores: 2, E: 12, R: 4, slot: 14 },
  full: { validators: 1023, cores: 341, E: 600, R: 10, slot: 605 },
};

/** η′₂ deals this epoch's seats, η′₃ the last epoch's (the vector's, on both sizes). */
export const ETA2 = "0x7b0aa1735e5ba58d3236316c671fe4f00ed366ee72417c9ed02a53a8019e85b8";
export const ETA3 = "0x8c039ff7caa17ccebfcadc44bd9fce6a4b6699c4d03de2e3349aa1dc11193cd7";

/** The vector's own guarantee: core 0's report, its signers, and the slot it was made at,
 *  in the rotation before the block's and the epoch before it, so dealt by η′₃. */
export const SIGNED: Record<Size, { core: number; signers: number[]; slot: number }> = {
  tiny: { core: 0, signers: [1, 2, 5], slot: 10 },
  full: { core: 0, signers: [24, 578, 603], slot: 595 },
};

const fromHex = (hex: string): number[] => (hex.slice(2).match(/../g) ?? []).map((b) => parseInt(b, 16));

/** Q (GP App. F, lesson 7.2): l numbers from a hash, each 4 bytes of H(h ⌢ ℰ₄(⌊i/8⌋)). */
export function numbersFromHash(h: number[], l: number): number[] {
  const out: number[] = [];
  let block: number[] = [];
  for (let i = 0; i < l; i++) {
    if (i % 8 === 0) block = H([...h, ...[0, 8, 16, 24].map((s) => (Math.floor(i / 8) >>> s) & 0xff)]);
    const at = (4 * i) % 32;
    out.push((block[at] | (block[at + 1] << 8) | (block[at + 2] << 16) | (block[at + 3] << 24)) >>> 0);
  }
  return out;
}

/** F (GP App. F, lesson 7.2): pick number mod what's left, the last item fills the gap. */
export function shuffle<T>(items: T[], numbers: number[]): T[] {
  const left = [...items];
  return numbers.slice(0, items.length).map((n) => {
    const index = n % left.length;
    const picked = left[index];
    left[index] = left[left.length - 1];
    left.pop();
    return picked;
  });
}

/** The seats dealt by an entropy, before any rotation: validator i's core. */
const dealt = new Map<string, number[]>();
function seatsDealt(size: Size, eta: string): number[] {
  const key = `${size} ${eta}`;
  if (!dealt.has(key)) {
    const v = NETWORKS[size].validators;
    const seats = Array.from({ length: v }, (_, i) => Math.floor(i / 3));
    dealt.set(key, shuffle(seats, numbersFromHash(fromHex(eta), v)));
  }
  return dealt.get(key)!;
}

/** P (GP §11, lesson 12.1): each validator's core at a slot, dealt with an entropy. */
export function coresAt(size: Size, slot: number, eta = ETA2): number[] {
  const { E, R, validators } = NETWORKS[size];
  const turns = Math.floor((slot % E) / R);
  return seatsDealt(size, eta).map((core) => (core + turns) % (validators / 3));
}

/** A core's guarantors at a slot, by validator index. */
export const guarantorsOf = (cores: number[], core: number): number[] =>
  cores.flatMap((c, v) => (c === core ? [v] : []));

/** The epoch the vector's block is in: its first slot and its last. */
export function epochOf(size: Size): { first: number; last: number } {
  const { E, slot } = NETWORKS[size];
  const first = slot - (slot % E);
  return { first, last: first + E - 1 };
}

/** Which rotation of its epoch a slot is in, from 0. */
export const rotationOf = (size: Size, slot: number): number => Math.floor((slot % NETWORKS[size].E) / NETWORKS[size].R);

/** More than two-thirds of the validators: what a report's assurances must reach. */
export const enough = (v: number): number => Math.floor((2 * v) / 3) + 1;

/** A work-package's trip, step by step: who takes part at each. */
export type Step = { id: string; title: string; who: "guarantors" | "all" | "none"; says: (n: Network, core: number, g: number[]) => string };
export const TRIP: Step[] = [
  { id: "arrive", title: "1 · a package arrives", who: "guarantors", says: (_n, core, g) => `A service sends a work-package to core ${core}. Its three guarantors this rotation, validators ${g.join(", ")}, are the only ones who take it.` },
  { id: "refine", title: "2 · refined", who: "guarantors", says: (_n, _c, g) => `The three run it, compare results, and sign the report: a guarantee, with two or three of their signatures (validators ${g.join(", ")}).` },
  { id: "spread", title: "3 · shards to everyone", who: "all", says: (n) => `The bundle is cut into ${n.validators.toLocaleString("en-US")} shards, one for every validator, each checked against the erasure root.` },
  { id: "assure", title: "4 · assured", who: "all", says: (n) => `Each validator says, in its assurance, that it holds its shard. Once ${enough(n.validators).toLocaleString("en-US")} of ${n.validators.toLocaleString("en-US")} have, the report is available.` },
  { id: "apply", title: "5 · on the chain", who: "all", says: (n) => `Every validator imports the block and accumulates the report: all ${n.validators.toLocaleString("en-US")} reach the same state.` },
];
