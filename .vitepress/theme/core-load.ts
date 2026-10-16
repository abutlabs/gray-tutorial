// Lesson 18.2's widget: a core's data load and popularity, on some_assurances-1. Both cores
// hold a report of a 12,345-byte bundle with 3 exported segments. Popularity counts every
// assurance naming the core; the load counts only a report that became available (more than
// two thirds: 5 of 6), as its bundle + 4104 · ⌈segments · 65/64⌉. tools/widget-core-load.test.ts
// checks it against the lesson's test and run.

export const SEGMENT_SIZE = 4104;
export const VALIDATORS = 6;
export const BUNDLE = 12_345;
/** How many of the vector's assurances name each core (bitfields 02 01 03 03 03 01). */
export const ASSURED = [5, 4];
export const available = (assurers: number): boolean => assurers > (2 * VALIDATORS) / 3;
export const pages = (segments: number): number => Math.ceil((segments * 65) / 64);
export const dataLoad = (bundle: number, segments: number): number => bundle + SEGMENT_SIZE * pages(segments);
