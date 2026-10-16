// Lesson 16.9's widget: one preimage request's life under solicit, provide, forget and query,
// on the tests' account (2 items, 50 bytes, a balance of 1,000) and tiny's D = 32. The rules
// are the lesson's solicit, forget and query; provide is lesson 14.1's [] → [t].
// tools/widget-request-life.test.ts checks every case against the lesson's tests and checks.

export const D = 32; // tiny's expunge period
export const Z = 100; // the request's length, as in the tests
export const START = { history: null as number[] | null, items: 2, bytes: 50, balance: 1000 };
export type State = typeof START;
export const GAS = { solicit: 2193, forget: 3250, query: 643, provide: 0 };
export type Op = keyof typeof GAS;
const minimumBalance = (s: { items: number; bytes: number }) => 100 + 10 * s.items + s.bytes;

export type Result = { state: State; answer: string; r7?: bigint; r8?: bigint };
/** One call at slot t. */
export function apply(s: State, op: Op, t: number): Result {
  const h = s.history;
  if (op === "solicit") {
    if (h !== null && h.length !== 2) return { state: s, answer: "HUH" };
    const after = h ? s : { ...s, items: s.items + 2, bytes: s.bytes + 81 + Z };
    if (after.balance < minimumBalance(after)) return { state: s, answer: "FULL" };
    return { state: { ...after, history: h ? [...h, t] : [] }, answer: "OK" };
  }
  if (op === "forget") {
    const expired = (y: number) => y < t - D;
    if (h !== null && (h.length === 0 || (h.length === 2 && expired(h[1])))) {
      return { state: { ...s, history: null, items: s.items - 2, bytes: s.bytes - 81 - Z }, answer: "OK" };
    }
    if (h?.length === 1) return { state: { ...s, history: [h[0], t] }, answer: "OK" };
    if (h?.length === 3 && expired(h[1])) return { state: { ...s, history: [h[2], t] }, answer: "OK" };
    return { state: s, answer: "HUH" };
  }
  if (op === "provide") {
    // lesson 14.1: a block delivers the preimage of a request that's waiting, []
    if (h?.length !== 0) return { state: s, answer: "not wanted" };
    return { state: { ...s, history: [t] }, answer: "provided" };
  }
  if (h === null) return { state: s, answer: "NONE", r7: 2n ** 64n - 1n, r8: 0n };
  const [x, y, w] = h.map(BigInt);
  return { state: s, answer: "OK", r7: BigInt(h.length) + (x ?? 0n) * 2n ** 32n, r8: (y ?? 0n) + (w ?? 0n) * 2n ** 32n };
}
/** The kinds of history, by their length: the table in the lesson. */
export const KINDS = [["[]", "asked for, not provided yet"], ["[x]", "provided at x"], ["[x, y]", "provided at x, forgotten at y"], ["[x, y, w]", "asked for again at w"]];
export const historyText = (h: number[] | null): string => (h === null ? "no request" : `[${h.join(", ")}]`);
