// Lesson 9.1's widget: a Merkle mountain belt (Gray Paper, Appendix E), appended to one item
// at a time. Appending carries the item up from place 0, merging with every peak it meets,
// until it rests in an empty place: adding 1 in binary. tools/widget-belt-verdicts.test.ts checks it
// against the lesson's own values.

/** A belt: peak i is the root of a mountain of 2^i items, or null (∅) if there's none. */
export type Belt<T> = (T | null)[];

/** One place the carry visits: a peak there to merge with, or an empty place to rest in. */
export type Step<T> =
  | { place: number; action: "merge"; peak: T; carried: T; merged: T }
  | { place: number; action: "rest"; carried: T; newPlace: boolean };

/**
 * A (GP App. E) one place at a time, as lesson 9.1's appendToBelt runs it: the steps the
 * carry takes, and the belt after. `merge(peak, carried)` is H(peak ⌢ carried).
 */
export function appendSteps<T>(belt: Belt<T>, item: T, merge: (peak: T, carried: T) => T): { steps: Step<T>[]; belt: Belt<T> } {
  const peaks = [...belt];
  const steps: Step<T>[] = [];
  let carried = item;
  for (let place = 0; place < peaks.length; place++) {
    const peak = peaks[place];
    if (peak === null) {
      peaks[place] = carried; // an empty place: the mountain rests here
      steps.push({ place, action: "rest", carried, newPlace: false });
      return { steps, belt: peaks };
    }
    const merged = merge(peak, carried); // two mountains of 2^place make one of 2^(place+1)
    steps.push({ place, action: "merge", peak, carried, merged });
    peaks[place] = null;
    carried = merged;
  }
  steps.push({ place: peaks.length, action: "rest", carried, newPlace: true }); // a new, biggest mountain
  peaks.push(carried);
  return { steps, belt: peaks };
}

/** The belt after the carry's first `taken` steps: merged places empty, nothing rested yet. */
export function beltPartway<T>(belt: Belt<T>, steps: Step<T>[], taken: number): Belt<T> {
  const peaks = [...belt];
  for (const step of steps.slice(0, taken)) {
    if (step.action === "merge") peaks[step.place] = null;
    else if (step.newPlace) peaks.push(step.carried);
    else peaks[step.place] = step.carried;
  }
  return peaks;
}

/** A mountain in the widget: items first to last (counting from 1), not real hashes. */
export type Mountain = { first: number; last: number };

/** A mountain's label: "5" for one item, "1–4" for items 1 to 4. */
export const label = (m: Mountain): string => (m.first === m.last ? `${m.first}` : `${m.first}–${m.last}`);

/** H(peak ⌢ carried), as the widget draws it: the older mountain's items, then the carried ones. */
export const mergeMountains = (peak: Mountain, carried: Mountain): Mountain => ({ first: peak.first, last: carried.last });

/** The belt of items 1 to n, appended one at a time. */
export function beltOf(n: number): Belt<Mountain> {
  let belt: Belt<Mountain> = [];
  for (let item = 1; item <= n; item++) belt = appendSteps(belt, { first: item, last: item }, mergeMountains).belt;
  return belt;
}

/** How many items a belt holds: 2^i for each place i holding a peak. */
export const itemsIn = <T>(belt: Belt<T>): number => belt.reduce((n: number, peak, i) => (peak === null ? n : n + 2 ** i), 0);

/** How many peaks a belt has: the places that aren't ∅. */
export const peaksIn = <T>(belt: Belt<T>): number => belt.filter((peak) => peak !== null).length;
