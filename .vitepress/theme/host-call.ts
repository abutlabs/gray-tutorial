// Lesson 16.1's widget: a host call, start to finish (Ψ_H). The program is the lesson's: ecalli
// n, then a return through r0. The block costs 100; the machine stops on the ecalli with ı
// still on it; the host charges its g first, then answers in φ₇; the machine carries on past
// the ecalli, and the return halts. tools/widget-host-call.test.ts checks every outcome
// against the lesson's tests.

export const WHAT = 2n ** 64n - 2n;
export const BLOCK_COST = 100n; // ecalli's 100 cycles; the return is in the same basic block
export const GAS_COST = 48n;
export const UNKNOWN_COST = 1000n;

export interface Step { pc: number; gas: bigint; r7: bigint; exit: "" | "halt" | "oog"; says: string }

/** Every state the run passes through, for a call number and a budget. */
export function steps(call: number, budget: bigint): Step[] {
  const out: Step[] = [{ pc: 0, gas: budget, r7: 0n, exit: "", says: `The program: ecalli ${call}, then jump_ind r0 back to the halt address. ${budget.toLocaleString("en-US")} gas.` }];
  const last = () => out[out.length - 1];
  const push = (s: Partial<Step> & { says: string }) => out.push({ ...last(), ...s });
  let gas = budget - BLOCK_COST;
  if (gas < 0n) { push({ gas, exit: "oog", says: "The block costs 100, more than the budget: out of gas before anything runs." }); return out; }
  push({ gas, says: "The basic block is paid for first: 100 gas, the ecalli's 100 cycles." });
  push({ says: `ecalli ${call}: the machine stops and hands over to the host, with ı still on the ecalli, at 0.` });
  if (call === 0) {
    gas -= GAS_COST;
    if (gas < 0n) { push({ gas, exit: "oog", says: `gas costs 48 to ask, and only ${(gas + GAS_COST).toLocaleString("en-US")} is left: out of gas, and no answer in φ₇.` }); return out; }
    push({ gas, says: "The host charges gas's g, 48, before anything else." });
    push({ r7: gas, says: `Then answers: φ₇ = the gas left, ${gas.toLocaleString("en-US")}.` });
  } else {
    push({ r7: WHAT, says: `No host call ${call}: φ₇ = WHAT, 2^64 − 2.` });
    gas -= UNKNOWN_COST;
    if (gas < 0n) { push({ gas, exit: "oog", says: "And it costs 1,000, more than is left: out of gas." }); return out; }
    push({ gas, says: "And it costs 1,000 to be told so." });
  }
  push({ pc: 2, says: "The machine carries on at ı + 1 + skip(ı) = 0 + 1 + 1 = 2, the instruction after the ecalli." });
  push({ exit: "halt", says: "jump_ind r0: r0 holds the halt address, so the program halts." });
  return out;
}
export const show = (x: bigint): string => (x === WHAT ? "WHAT" : x.toLocaleString("en-US"));
