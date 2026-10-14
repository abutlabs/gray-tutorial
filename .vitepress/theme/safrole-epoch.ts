// Lesson 8.5's widget: a tiny Safrole chain to drive one block at a time. The rules mirror
// the reference client's safrole.ts and epoch.ts (Gray Paper §6); the values are small
// stand-ins where a real one needs Blake2b or Bandersnatch, and say so. It starts from the
// state every tiny safrole vector starts from. tools/widget-safrole.test.ts checks it
// against Part 8's own values.

import { toHex } from "./bytes.ts";

/** The sizes Safrole needs: E slots an epoch, the lottery closing at phase Y, K tickets a block. */
export type Config = { E: number; Y: number; K: number };
export const TINY: Config = { E: 12, Y: 10, K: 3 };
export const FULL: Config = { E: 600, Y: 500, K: 16 };

/** e: the epoch a slot falls in, ⌊slot / E⌋. */
export const epochOf = (config: Config, slot: number): number => Math.floor(slot / config.E);

/** m: where a slot falls within its epoch, slot mod E. */
export const phaseOf = (config: Config, slot: number): number => slot % config.E;

/** Z: outside in. The first, the last, the second, the second to last, and so on inwards. */
export function outsideIn<T>(items: T[]): T[] {
  const out: T[] = [];
  let front = 0;
  let back = items.length - 1;
  while (front <= back) {
    out.push(items[front]);
    if (front < back) out.push(items[back]);
    front++;
    back--;
  }
  return out;
}

/** A ticket in the lottery. The chain knows only its id and attempt; `by` is the widget's
 *  secret, so it can say who held a winning ticket when that slot's block is made. */
export type Ticket = { id: number; attempt: number; by: string };

/** Whether the lottery closes in this block: the same epoch, and phase Y is reached now. */
export function lotteryCloses(config: Config, before: number, after: number): boolean {
  const sameEpoch = epochOf(config, after) === epochOf(config, before);
  return sameEpoch && phaseOf(config, before) < config.Y && config.Y <= phaseOf(config, after);
}

/** H_W, the tickets mark: in the block that closes a full lottery, the winners, outside in. */
export function ticketsMark(config: Config, before: number, after: number, accumulator: Ticket[]): Ticket[] | null {
  const full = accumulator.length === config.E;
  return lotteryCloses(config, before, after) && full ? outsideIn(accumulator) : null;
}

/** Whether a new epoch is sealed by the winners: the last epoch's lottery closed full, and
 *  this block follows on from that epoch directly. Otherwise a new epoch falls back. */
export function sealedByTickets(config: Config, before: number, after: number, accumulator: Ticket[]): boolean {
  const next = epochOf(config, after) === epochOf(config, before) + 1;
  const closed = phaseOf(config, before) >= config.Y;
  return next && closed && accumulator.length === config.E;
}

/** n: the tickets each validator may enter, ⌈2E / |γ′_P|⌉. */
export const attemptsAllowed = (config: Config, validators: number): number => Math.ceil((2 * config.E) / validators);

/** γ′_A: the lottery keeps the E lowest ids of its tickets and the new ones, lowest first. */
export const keepLowest = (config: Config, kept: Ticket[], entered: Ticket[]): Ticket[] =>
  [...kept, ...entered].sort((x, y) => x.id - y.id).slice(0, config.E);

/** A validator, by the first four hex digits of its Ed25519 key, as lesson 8.2 prints them. */
export type Sets = { staging: string[]; pending: string[]; active: string[]; previous: string[] };

/** An offender's keys, all zeros. Nobody holds the secret of a zero key, so it can't sign. */
export const NULL_KEY = "0000";

/** At a new epoch the sets move along one: ι, minus offenders, → γ_P → κ → λ. ι stays. */
export const rotate = (sets: Sets, offenders: string[]): Sets => ({
  staging: sets.staging,
  pending: sets.staging.map((v) => (offenders.includes(v) ? NULL_KEY : v)),
  active: sets.pending,
  previous: sets.active,
});

/** One of η's four values. A real one is 32 bytes; the widget can't run Blake2b, so it
 *  keeps a real starting value's first 8 hex digits and counts the blocks stirred into it:
 *  { base: "03170a2e", stirs: 2 } is H(H(η ⌢ y₁) ⌢ y₂), η being 0x03170a2e…. */
export type Eta = { base: string; stirs: number };

export const etaLabel = (eta: Eta): string => `${eta.base}…${eta.stirs ? ` +${eta.stirs}` : ""}`;

/** η′: every block stirs η₀, and at a new epoch the history moves along one, the oldest dropped. */
export function nextEntropy(entropy: Eta[], newEpoch: boolean): Eta[] {
  const stirred = { ...entropy[0], stirs: entropy[0].stirs + 1 };
  return [stirred, ...(newEpoch ? entropy.slice(0, 3) : entropy.slice(1, 4))];
}

/** A small stand-in hash, the widget's dice, never Blake2b: FNV-1a, then MurmurHash3's
 *  finish, so texts that differ only in their last letter still land far apart. */
function standIn(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** The tickets each pending validator could enter, by row of γ_P and attempt: ids from 0
 *  to 255, all different. A real id is a 32-byte VRF output of the validator's key on η′₂
 *  and the attempt (lesson 8.6), so the same η′₂ gives the same ids; here a stand-in hash
 *  of η′₂ deals them. */
export function ticketIds(eta2: Eta, validators: number, n: number): number[][] {
  const deck = Array.from({ length: 256 }, (_, i) => i);
  let seed = standIn(etaLabel(eta2));
  for (let i = deck.length - 1; i > 0; i--) {
    seed = standIn(`${seed}`);
    const j = seed % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return Array.from({ length: validators }, (_, row) => deck.slice(row * n, row * n + n));
}

/** γ_S, who seals each slot: the lottery's winners, or fallback keys. `real` says whether
 *  the keys are the real F(η′₂, κ′) (the reference client's), not the widget's stand-in. */
export type Sealers = { tickets: Ticket[] } | { keys: string[]; real: boolean };

/** Safrole's state, as the widget keeps it. */
export type State = { time: number; entropy: Eta[]; sets: Sets; accumulator: Ticket[]; sealers: Sealers };

/** The state every tiny safrole vector starts from (lesson 8.2's sets, lesson 8.1's η), at
 *  slot 0. Its sealers are that state's γ_S, each key named by its validator in κ. */
export const START: State = {
  time: 0,
  entropy: ["03170a2e", "ee155ace", "bb30a42c", "e88bd757"].map((base) => ({ base, stirs: 0 })),
  sets: {
    staging: ["cab2", "ab00", "4418", "8b8c", "ad93", "f30a"],
    pending: ["4418", "ad93", "cab2", "f30a", "8b8c", "ab00"],
    active: ["ab00", "f30a", "8b8c", "4418", "ad93", "cab2"],
    previous: ["4418", "cab2", "8b8c", "f30a", "ab00", "ad93"],
  },
  accumulator: [],
  sealers: { keys: ["ab00", "4418", "f30a", "f30a", "ab00", "cab2", "ab00", "8b8c", "f30a", "8b8c", "4418", "f30a"], real: true },
};

/** F at the first new epoch from START: η′₂ is START's η₁ and κ′ its γ_P, whatever the
 *  reader does first, so these are the real picks, by index in κ′: lesson 8.3's output for
 *  enact-epoch-change-with-no-tickets-4, which starts from the same state. */
export const REAL_FALLBACK = { eta2: START.entropy[1], active: START.sets.pending, picks: [2, 1, 5, 0, 0, 3, 1, 5, 1, 1, 4, 1] };

/** F(η′₂, κ′): slot i's sealer is validator (hash of η′₂ and i) mod |κ′|. The real hash is
 *  Blake2b; past the first epoch change the widget's η′₂ is a stand-in, so are its picks. */
export function fallback(config: Config, eta2: Eta, active: string[]): Sealers {
  const real = etaLabel(eta2) === etaLabel(REAL_FALLBACK.eta2) && active.join() === REAL_FALLBACK.active.join();
  const picks = real
    ? REAL_FALLBACK.picks
    : Array.from({ length: config.E }, (_, i) => standIn(`${etaLabel(eta2)}/${i}`) % active.length);
  return { keys: picks.map((p) => active[p]), real };
}

/** What the next block, at this slot, works with: a new epoch or not, γ′_P (who may enter
 *  tickets), η′₂ (what the tickets' ids come from), and whether it may carry tickets. */
export function nextBlock(config: Config, state: State, slot: number, offenders: string[]) {
  const newEpoch = epochOf(config, slot) > epochOf(config, state.time);
  const pending = newEpoch ? rotate(state.sets, offenders).pending : state.sets.pending;
  const eta2 = newEpoch ? state.entropy[1] : state.entropy[2];
  const open = phaseOf(config, slot) < config.Y;
  return { newEpoch, pending, eta2, open, n: attemptsAllowed(config, pending.length) };
}

/** One block of Safrole, as the reference's safroleStep: the state after it, the tickets
 *  mark if it carries one, whether a new epoch was seated by the winners, and the tickets
 *  that didn't make the E best. `tickets` must already be allowed (nextBlock's `open`, at
 *  most K, none in the lottery already). */
export function step(config: Config, before: State, slot: number, tickets: Ticket[], offenders: string[]) {
  const newEpoch = epochOf(config, slot) > epochOf(config, before.time);
  const entropy = nextEntropy(before.entropy, newEpoch);
  const sets = newEpoch ? rotate(before.sets, offenders) : before.sets;
  const byTickets = sealedByTickets(config, before.time, slot, before.accumulator);
  let sealers = before.sealers;
  if (byTickets) sealers = { tickets: outsideIn(before.accumulator) };
  else if (newEpoch) sealers = fallback(config, entropy[2], sets.active);
  const entered = [...tickets].sort((x, y) => x.id - y.id); // a block lists its tickets by id
  const accumulator = keepLowest(config, newEpoch ? [] : before.accumulator, entered);
  const dropped = entered.filter((t) => !accumulator.includes(t));
  const mark = ticketsMark(config, before.time, slot, before.accumulator);
  return { after: { time: slot, entropy, sets, accumulator, sealers }, newEpoch, byTickets, mark, entered, dropped };
}

/** Who seals a slot: a fallback key's validator, or a winning ticket and (secret until the
 *  block is made) its holder. */
export function sealerOf(config: Config, sealers: Sealers, slot: number): { who: string; ticket?: Ticket } {
  const phase = phaseOf(config, slot);
  if ("tickets" in sealers) return { who: sealers.tickets[phase].by, ticket: sealers.tickets[phase] };
  return { who: sealers.keys[phase] };
}

/** The sealers the coming epoch will get if its first block follows on: undecided while the
 *  lottery is open, then the winners if it closed full, the fallback if not. */
export function comingSealers(config: Config, state: State): "undecided" | "tickets" | "fallback" {
  if (phaseOf(config, state.time) < config.Y) return "undecided";
  return state.accumulator.length === config.E ? "tickets" : "fallback";
}

/** A ticket id as the widget writes it: two hex digits (a real one is 64). */
/** A ticket id's two hex digits: bare in its cell, which shows it as a byte; after 0x in a sentence. */
export const hexId = (id: number): string => toHex([id]).slice(2);

/** What one block did, in plain words, a line each. */
export function story(config: Config, before: State, slot: number, result: ReturnType<typeof step>, offenders: string[]): string[] {
  const { after, newEpoch, byTickets, mark, entered, dropped } = result;
  const lines: string[] = [];
  const gap = slot - before.time - 1;
  if (gap === 1) lines.push(`slot ${slot - 1}: no block`);
  if (gap > 1) lines.push(`slots ${before.time + 1} to ${slot - 1}: no blocks`);
  if (newEpoch) {
    lines.push(`slot ${slot} starts epoch ${epochOf(config, slot)}: the validator sets and η move along one, and a new lottery opens`);
    for (const v of before.sets.staging.filter((v) => offenders.includes(v))) {
      lines.push(`${v} is an offender: its keys arrive in γ_P as 0x${NULL_KEY}…`);
    }
    if (byTickets) lines.push(`the last lottery closed full: its ${config.E} winners take this epoch's slots, outside in`);
    else {
      const held = before.accumulator.length;
      const why = epochOf(config, slot) > epochOf(config, before.time) + 1 ? "a whole epoch went by without a block"
        : held < config.E ? `the last lottery ended with ${held} of ${config.E} tickets`
        : `no block came after phase ${config.Y}, so the last lottery never closed`;
      lines.push(`fallback: ${why}, so each slot's sealer is picked by a hash of η′₂ and the slot`);
    }
  }
  const sealer = sealerOf(config, after.sealers, slot);
  lines.push(sealer.ticket
    ? `slot ${slot}'s block is made by whoever holds ticket 0x${hexId(sealer.ticket.id)}: ${sealer.who}, unknown until now`
    : `slot ${slot}'s block is made by ${sealer.who}`);
  if (entered.length) {
    const kept = entered.length - dropped.length;
    let line = `${entered.length} ticket${entered.length === 1 ? "" : "s"} entered (${entered.map((t) => `0x${hexId(t.id)}`).join(", ")})`;
    if (dropped.length) line += `: ${kept ? `${kept} in, ` : ""}${dropped.map((t) => `0x${hexId(t.id)}`).join(", ")} not among the ${config.E} lowest`;
    lines.push(line);
  }
  if (lotteryCloses(config, before.time, slot)) {
    lines.push(mark
      ? `phase ${config.Y} reached: the lottery closes full, and this block carries the tickets mark, the ${config.E} winners outside in`
      : `phase ${config.Y} reached: the lottery closes with ${before.accumulator.length} of ${config.E}: no mark, and the next epoch will fall back`);
  }
  return lines;
}
