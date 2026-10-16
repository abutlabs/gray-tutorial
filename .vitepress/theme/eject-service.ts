// Lesson 17.7's widget: eject (Ω_J) on the tests' ejectable() setup. Service 1's code hash
// names service 0, it keeps nothing but one request (2 items, 81 + 20 bytes), provided at 5
// and forgotten at 10; D = 32. WHO if d is 0 itself, nobody, or didn't name 0; HUH unless it
// was forgotten more than D slots ago; then its balance goes to 0 and it's gone.
// tools/widget-eject-service.test.ts checks it against the lesson's tests and check.

export const D = 32;
export const FORGOTTEN_AT = 10;
export type State = { balance0: number; one: { balance: number } | null };
export const START: State = { balance0: 1000, one: { balance: 1000 } };
export type Result = { state: State; answer: "OK" | "WHO" | "HUH"; why: string };

export function eject(s: State, d: number, t: number): Result {
  if (d === 0) return { state: s, answer: "WHO", why: "a service can't eject itself" };
  if (d !== 1 || s.one === null) return { state: s, answer: "WHO", why: `there's no service ${d}${d === 1 ? " any more" : ""}` };
  const long = FORGOTTEN_AT < t - D;
  if (!long) return { state: s, answer: "HUH", why: `forgotten at ${FORGOTTEN_AT}: ${FORGOTTEN_AT} < ${t} − ${D} = ${t - D} is false, not long enough ago` };
  return { state: { balance0: s.balance0 + s.one.balance, one: null }, answer: "OK", why: `${FORGOTTEN_AT} < ${t} − ${D} = ${t - D}: its code hash names service 0, it keeps one request, forgotten long enough ago. Its 1,000 goes to service 0` };
}
