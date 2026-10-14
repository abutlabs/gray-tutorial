// Lesson 12.1's guarantor deal, on tiny (GP §11): seats 0 0 0 1 1 1, shuffled by entropy
// with Appendix F's Fisher-Yates, then moved on one core every R slots. The site has no
// Blake2b, so each entropy's numbers Q₆(e) are written down here, worked out by the
// reference client's numbersFromHash; the shuffle itself runs for real.

export const V = 6; // validators on tiny
export const E = 12; // slots in an epoch
export const R = 4; // slots in a rotation
export const ACTIVE_CORES = V / 3;

/** An entropy the widget can deal with: its start, and the six numbers Q₆ draws from it. */
export type Entropy = { name: string; hex: string; numbers: number[] };

/** η′₂ and η′₃ of the reports vector report_prev_rotation-1, the lesson's run. */
export const ETA2: Entropy = {
  name: "η′₂",
  hex: "0x7b0aa173…",
  numbers: [550833461, 2758779345, 998174160, 3999748149, 705129166, 3658689363],
};
export const ETA3: Entropy = {
  name: "η′₃",
  hex: "0x8c039ff7…",
  numbers: [1417581549, 189175982, 1251077453, 1647313064, 225680517, 1744843846],
};
/** The entropy of the lesson's first test: 32 bytes of 7. */
export const SEVENS: Entropy = {
  name: "32 sevens",
  hex: "0x07070707…",
  numbers: [1203761230, 1018836837, 3395284341, 1206782270, 3450557694, 3824072483],
};
/** 32 zero bytes: one more hand, to see that the entropy decides it. */
export const ZEROS: Entropy = {
  name: "32 zeros",
  hex: "0x00000000…",
  numbers: [1279528607, 1232795497, 2649230269, 4265094329, 1661550193, 315251734],
};

/** The start of each validator's Ed25519 key, in κ′ (this epoch's set) and λ′ (the last). */
export const KAPPA = ["4418", "ad93", "cab2", "f30a", "8b8c", "ab00"];
export const LAMBDA = ["cab2", "ab00", "4418", "8b8c", "ad93", "f30a"];
/** An offender's key, as Φ leaves it: zeros. */
export const BLANK = "0000";

/** One step of the shuffle: the items left, the number drawn, where it lands, and the pick. */
export type Pick = { pool: number[]; number: number; index: number; picked: number };

/** F (GP App. F): pick item r mod (items left), move the last item into its place, repeat. */
export function shuffleSteps(items: number[], numbers: number[]): Pick[] {
  const left = [...items];
  return numbers.slice(0, items.length).map((number) => {
    const index = number % left.length;
    const pick = { pool: [...left], number, index, picked: left[index] };
    left[index] = left[left.length - 1];
    left.pop();
    return pick;
  });
}

/** The seats before the shuffle: validator i gets core ⌊i/3⌋. */
export const seats = (v: number) => Array.from({ length: v }, (_, i) => Math.floor(i / 3));

/** How many times everyone has moved on since the epoch began: ⌊(t mod E)/R⌋. */
export const turns = (slot: number) => Math.floor((slot % E) / R);

/** P(v, e, t): each validator's core at slot t. */
export function assignCores(e: Entropy, slot: number): number[] {
  const shuffled = shuffleSteps(seats(V), e.numbers).map((s) => s.picked);
  return shuffled.map((core) => (core + turns(slot)) % ACTIVE_CORES);
}

/** An assignment: each validator's core and key, the slot and entropy it was dealt at. */
export type Assignment = { cores: number[]; keys: string[]; slot: number; entropy: Entropy; set: "κ′" | "λ′" };

/**
 * M and M*: this rotation's deal at τ′ (κ′, η₂), and the last rotation's at τ′ − R: κ′ and
 * η₂ again in the same epoch, λ′ and η′₃ if τ′ − R is in the epoch before. Offenders' keys
 * (by their key) are blanked in both.
 */
export function assignments(slot: number, eta2: Entropy, offenders: string[]): { current: Assignment; last: Assignment } {
  const blank = (keys: string[]) => keys.map((k) => (offenders.includes(k) ? BLANK : k));
  const deal = (keys: string[], entropy: Entropy, at: number, set: "κ′" | "λ′"): Assignment => ({
    cores: assignCores(entropy, at),
    keys: blank(keys),
    slot: at,
    entropy,
    set,
  });
  const then = slot - R;
  const sameEpoch = Math.floor(then / E) === Math.floor(slot / E);
  return {
    current: deal(KAPPA, eta2, slot, "κ′"),
    last: sameEpoch ? deal(KAPPA, eta2, then, "κ′") : deal(LAMBDA, ETA3, then, "λ′"),
  };
}

/** Each active core's guarantors, as validator numbers: [[core 0's], [core 1's]]. */
export function byCore(cores: number[]): number[][] {
  return Array.from({ length: ACTIVE_CORES }, (_, c) => cores.flatMap((core, v) => (core === c ? [v] : [])));
}
