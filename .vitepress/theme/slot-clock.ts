// Lesson 0.4's widget: a moment on JAM's clock and the slot it falls in. The slot is whole
// six-second slots since the JAM Common Era, rounded down; the lesson's planted bug rounds
// to nearest, so 5.999 seconds in says slot 1. tools/widget-slot-clock.test.ts checks the
// constants and every moment here against the lesson's code, tests and check questions.

/** The JAM Common Era, 12:00 UTC on 1 January 2025, in seconds since the Unix epoch (0.4). */
export const JAM_COMMON_ERA = 1_735_732_800;
/** P: a timeslot lasts six seconds. */
export const SLOT_SECONDS = 6;
const SLOT_MS = SLOT_SECONDS * 1000;

/** The slot a moment falls in: whole slots since the era, as the lesson's slotAt. */
export const slotAt = (msSinceEra: number): number => Math.floor(msSinceEra / SLOT_MS);
/** The lesson's bug: the same division, rounded to the nearest whole number. */
export const roundedSlot = (msSinceEra: number): number => Math.round(msSinceEra / SLOT_MS);
/** How far into its slot a moment is, 0 to just under 1. */
export const fractionOf = (msSinceEra: number): number => (msSinceEra % SLOT_MS) / SLOT_MS;

/** A moment as the lesson's tests and check questions name it. */
export type Moment = { name: string; ms: number };
export const MOMENTS: Moment[] = [
  { name: "the era starts", ms: 0 },
  { name: "5.999 s in", ms: 5_999 },
  { name: "6 s in", ms: 6_000 },
  { name: "an hour in", ms: 3_600_000 },
  { name: "a day in", ms: 86_400_000 },
];

/** The steps a reader can nudge the clock by, in milliseconds. */
export const STEPS: { label: string; ms: number }[] = [
  { label: "−1 s", ms: -1_000 },
  { label: "−1 ms", ms: -1 },
  { label: "+1 ms", ms: 1 },
  { label: "+1 s", ms: 1_000 },
  { label: "+1 h", ms: 3_600_000 },
];

/** A moment as a UTC clock reads it, with milliseconds: "2025-01-01 12:00:05.999". */
export function utcOf(msSinceEra: number): string {
  const d = new Date(JAM_COMMON_ERA * 1000 + msSinceEra);
  return d.toISOString().replace("T", " ").replace("Z", "");
}

/** The slots drawn under the clock: a few either side of the moment's, never below 0. */
export function slotsAround(msSinceEra: number, count = 6): number[] {
  const first = Math.max(0, slotAt(msSinceEra) - 1);
  return Array.from({ length: count }, (_, k) => first + k);
}

/** The division written out, the way the lesson's debugger shows it: "5999 / 6000 = 0.9998". */
export const divisionOf = (msSinceEra: number): string =>
  `${msSinceEra} / ${SLOT_MS} = ${(msSinceEra / SLOT_MS).toFixed(4).replace(/\.?0+$/, "")}`;
