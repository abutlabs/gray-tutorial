// Lesson 8.7's widget: the rules a block's tickets must keep, in the order safroleError
// checks them, and what the lottery holds after the good ones merge. Tiny: E = 12, Y = 10,
// K = 3, n = ⌈2E / |γ′_P|⌉ = 4. The starting tickets are the lesson's two runs'.
// tools/widget-ticket-rules.test.ts checks every rule against the lesson's code, runs and
// check questions.

export const E = 12;
export const Y = 10;
export const K = 3;
export const VALIDATORS = 6;
/** n: the tickets each validator may enter, ⌈2E / |γ′_P|⌉: fewer validators, more each. */
export const attemptsAllowed = (validators: number, epochLength = E): number => Math.ceil((2 * epochLength) / validators);
export const N = attemptsAllowed(VALIDATORS);

export type Ticket = { attempt: number; id: string; held?: boolean };
/** The tickets of publish-tickets-no-mark-2 (they enter) and no-mark-4 (bad_ticket_order), as the runs print them. */
export const ENTERING: Ticket[] = [
  { attempt: 0, id: "0x00e51b1c…" },
  { attempt: 1, id: "0x015d2d6f…" },
  { attempt: 2, id: "0x20164381…" },
];
export const OUT_OF_ORDER: Ticket[] = [
  { attempt: 3, id: "0xd6feae23…" },
  { attempt: 1, id: "0x5af49b10…" },
  { attempt: 2, id: "0x34341918…" },
];

/** Why Safrole refuses the block's tickets, in the lesson's order, or null if they enter. */
export function ticketError(phase: number, tickets: Ticket[], n = N): { error: string; rule: number } | null {
  const open = phase < Y;
  if (tickets.length > (open ? K : 0)) return { error: "unexpected_ticket", rule: 1 };
  if (tickets.some((t) => t.attempt >= n)) return { error: "bad_ticket_attempt", rule: 2 };
  const ids = tickets.map((t) => t.id);
  if (ids.some((id, i) => i > 0 && id <= ids[i - 1])) return { error: "bad_ticket_order", rule: 4 };
  if (tickets.some((t) => t.held)) return { error: "duplicate_ticket", rule: 5 };
  return null;
}
/** What the lottery holds after the block: the E lowest ids of the old and the new together. */
export function merged(held: string[], entered: Ticket[]): string[] {
  return [...held, ...entered.map((t) => t.id)].sort().slice(0, E);
}
/** The rules, in the lesson's words, by number. */
export const RULES: Record<number, string> = {
  1: `only while the lottery is open (m′ < ${Y}), and at most K = ${K} at a time`,
  2: `each attempt below n = ⌈2E / |γ′_P|⌉ = ${N}`,
  4: "the ids go strictly up, in the block's order",
  5: "none is in the lottery already",
};
/** A fresh id the reader can add, higher than any the runs show. */
export const EXTRA_ID = "0xf4aac2fb…";
