// Lesson 17.3's widget: transfer (Ω_T) from the tests' service 0 (a balance of 1,000, a
// minimum of 170; every service wants at least 20 gas a memo). Refused for WHO, LOW or CASH
// at 575 gas; sent, the amount leaves the sender now, the gas is paid up front, and the
// receiver's balance waits for the next round. tools/widget-transfer-send.test.ts checks it
// against the lesson's tests.

export const START = { balance: 1000, gasLeft: 10_000, outbox: [] as { dest: number; amount: number; gas: number }[] };
export type State = typeof START;
export const MINIMUM = 170; // 100 + 10 × 2 + 50
export const MIN_MEMO_GAS = 20;
export const SERVICES = [0, 1]; // service 1 is a copy of 0, as the first test makes it
export const RECEIVER_BALANCE = 1000;

export type Sent = { state: State; answer: "OK" | "WHO" | "LOW" | "CASH"; charged: number };
export function transfer(s: State, dest: number, amount: number, gas: number): Sent {
  const refuse = (answer: Sent["answer"]): Sent => ({ state: { ...s, gasLeft: s.gasLeft - 575 }, answer, charged: 575 });
  if (!SERVICES.includes(dest)) return refuse("WHO");
  if (gas < MIN_MEMO_GAS) return refuse("LOW");
  if (s.balance - amount < MINIMUM) return refuse("CASH");
  return {
    state: { balance: s.balance - amount, gasLeft: s.gasLeft - 575 - gas, outbox: [...s.outbox, { dest, amount, gas }] },
    answer: "OK",
    charged: 575 + gas,
  };
}
