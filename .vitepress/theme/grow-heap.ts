// Lesson 16.3's widget: grow_heap (Ω_♊︎) on tinyCode's layout. a, the read-write zone's first
// page; b, as far as it may reach; h, where the heap ends today. Asking for no more than h,
// or past b, just reports h for 275; otherwise 275 + 121 a new page, and the pages up to φ₇
// become writable. tools/widget-grow-heap.test.ts checks it against the lesson's tests.

export const ZONE = 2 ** 16;
export const PAGE = 4096;
export const INPUT_SIZE = 2 ** 24;
const roundUp = (x: number, size: number) => Math.ceil(x / size) * size;
/** tinyCode: 3 bytes of o, 2 of w, 1 heap page, a 100-byte stack. */
export const TINY_CODE = { o: 3, w: 2, z: 1, s: 100 };
export const A = (2 * ZONE + roundUp(TINY_CODE.o, ZONE)) / PAGE;
export const B = (2 ** 32 - 3 * ZONE - INPUT_SIZE - roundUp(TINY_CODE.s, PAGE)) / PAGE;
/** Where the heap ends at the start: a, plus w's page and the heap page. */
export const H0 = A + roundUp(TINY_CODE.w, PAGE) / PAGE + TINY_CODE.z;
export const BUDGET = 10_000;

export type Call = { want: number; before: number; after: number; r7: number; gas: number; grew: boolean; why: string };
/** One grow_heap from a heap ending at `h`. */
export function growHeap(h: number, want: number): Call {
  if (want <= h || want > B) {
    const why = want <= h ? `${want} ≤ h = ${h}: the heap is already that big` : `${want.toLocaleString("en-US")} > b: too big`;
    return { want, before: h, after: h, r7: h, gas: 275, grew: false, why: `${why}, so nothing changes and φ₇ = h` };
  }
  const pages = want - h;
  return { want, before: h, after: want, r7: want, gas: 275 + pages * 121, grew: true, why: `${pages} new page${pages === 1 ? "" : "s"}, ${h} to ${want - 1}, made writable: 275 + ${pages} × 121` };
}
export const ASKS = [0, 50, 53, 51, B + 1];
