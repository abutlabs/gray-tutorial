// Lesson 8.5's Safrole widget, checked against Part 8's own values (and 7.1's), so the
// epoch a reader drives runs by the rules the lessons' code is checked against.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  attemptsAllowed, epochOf, fallback, FULL, keepLowest, nextBlock, nextEntropy, NULL_KEY, outsideIn, phaseOf, REAL_FALLBACK,
  rotate, sealedByTickets, START, step, ticketIds, ticketsMark, TINY,
} from "../.vitepress/theme/safrole-epoch.ts";
import type { State, Ticket } from "../.vitepress/theme/safrole-epoch.ts";
import { lessonText } from "./lessons.ts";

const numbers = (list: string) => list.split(",").map(Number);
const tickets = (ids: number[]): Ticket[] => ids.map((id) => ({ id, attempt: 0, by: "x" }));

test("the widget's sizes are the lessons' config: E, Y and K on tiny and full", () => {
  const configs = lessonText("08-safrole/04-the-lotterys-winners.md") + lessonText("08-safrole/07-entering-tickets.md");
  for (const [name, config] of [["TINY", TINY], ["FULL", FULL]] as const) {
    const blocks = [...configs.matchAll(new RegExp(`export const ${name}: Config = \\{([^}]+)\\}`, "g"))].map((m) => m[1]).join();
    const value = (field: string) => Number(new RegExp(`${field}: (\\d+)`).exec(blocks)![1]);
    assert.equal(config.E, value("epoch_length"), `${name}'s E`);
    assert.equal(config.Y, value("epoch_tail_start"), `${name}'s Y`);
    assert.equal(config.K, value("max_tickets_per_extrinsic"), `${name}'s K`);
  }
});

test("epochs and phases: lesson 7.1's slot 25 on tiny and 1234 on full", () => {
  const code = lessonText("07-time-and-shuffling/01-epochs.md");
  for (const [name, config] of [["tiny", TINY], ["full", FULL]] as const) {
    const [, slot] = new RegExp(`${name}Epoch: number = epochOf\\(${name.toUpperCase()}, (\\d+)\\)`).exec(code)!;
    const [, expected] = new RegExp(`\\[${name}Epoch, ${name}Phase\\], \\[(\\d+, \\d+)\\]`).exec(code)!;
    assert.deepEqual([epochOf(config, Number(slot)), phaseOf(config, Number(slot))], numbers(expected), name);
  }
  // 7.1's run: the safrole trace's epochs begin at slots 12, 24, ... 96, phase 0 each
  for (const [, slot, epoch] of lessonText("07-time-and-shuffling/01-epochs.md").matchAll(/^slot (\d+): epoch (\d+) begins/gm)) {
    assert.deepEqual([epochOf(TINY, Number(slot)), phaseOf(TINY, Number(slot))], [Number(epoch), 0], `slot ${slot}`);
  }
});

test("Z, outside in: lesson 8.4's examples, and its run's ticket order", () => {
  const lesson = lessonText("08-safrole/04-the-lotterys-winners.md");
  const cases = [...lesson.matchAll(/outsideIn\(\[([\d, ]+)\]\);\s*assert\.deepEqual\(\w+, \[([\d, ]+)\]\)/g)];
  assert.equal(cases.length, 2, "8.4's odd and even examples");
  for (const [, items, expected] of cases) assert.deepEqual(outsideIn(numbers(items)), numbers(expected), items);
  const seats = [...lesson.matchAll(/^slot +(\d+) of the next epoch: ticket (\d+), (0x[0-9a-f]+)…$/gm)];
  assert.equal(seats.length, TINY.E, "8.4's twelve seats");
  assert.deepEqual(outsideIn([...Array(TINY.E).keys()]), seats.map(([, , rank]) => Number(rank)));
});

test("the lottery closes as phase Y is reached: slot 9 → 10 on tiny, but not 10 → 11 (lesson 8.4's test)", () => {
  const lesson = lessonText("08-safrole/04-the-lotterys-winners.md");
  const full = tickets([...Array(TINY.E).keys()]);
  const cases = [...lesson.matchAll(/ticketsMark\(TINY, (\d+), (\d+), (full(?:\.slice\(1\))?)\);\s*assert\.(notEqual|equal)\(\w+, null\)/g)];
  assert.equal(cases.length, 3, "8.4's three boundary cases");
  for (const [, before, after, which, check] of cases) {
    const accumulator = which === "full" ? full : full.slice(1);
    const marked = ticketsMark(TINY, Number(before), Number(after), accumulator) !== null;
    assert.equal(marked, check === "notEqual", `${before} → ${after}, ${which}`);
  }
  // the vectors' crossing, 8.4's run: slot 3 → 11 with 12 of 12 carries the mark
  const [, from, to] = /^slot (\d+) → (\d+), the lottery closes at phase 10$/m.exec(lesson)!;
  assert.notEqual(ticketsMark(TINY, Number(from), Number(to), full), null);
  // and the next epoch is seated by them only if it follows straight on, from past the close
  assert.equal(sealedByTickets(TINY, 11, 12, full), true);
  assert.equal(sealedByTickets(TINY, 9, 12, full), false, "no block after phase Y: the lottery never closed");
  assert.equal(sealedByTickets(TINY, 11, 24, full), false, "a whole epoch skipped");
  assert.equal(sealedByTickets(TINY, 11, 12, full.slice(1)), false, "closed short");
});

test("the lottery keeps the E lowest ids: lesson 8.4's twelve, entered in any order", () => {
  const lesson = lessonText("08-safrole/04-the-lotterys-winners.md");
  const seats = [...lesson.matchAll(/^slot +\d+ of the next epoch: ticket (\d+), 0x([0-9a-f]+)…$/gm)];
  const byRank = seats.map(([, rank, id]) => ({ rank: Number(rank), id: parseInt(id, 16) })).sort((x, y) => x.rank - y.rank);
  const entered = tickets(byRank.map((t) => t.id).reverse()); // worst first
  let lottery: Ticket[] = [];
  for (let i = 0; i < entered.length; i += TINY.K) lottery = keepLowest(TINY, lottery, entered.slice(i, i + TINY.K));
  assert.deepEqual(lottery.map((t) => t.id), byRank.map((t) => t.id), "ranked by id, lowest first: 8.4's ticket numbers");
  // a full lottery: a better ticket pushes the worst out, a worse one doesn't get in
  const better = keepLowest(TINY, lottery, tickets([1]));
  assert.equal(better.length, TINY.E);
  assert.equal(better[0].id, 1);
  assert.ok(!better.some((t) => t.id === byRank[TINY.E - 1].id), "the worst is out");
  assert.deepEqual(keepLowest(TINY, lottery, tickets([0xffffffff])), lottery);
});

test("attempts: n = ⌈2E / |γ′_P|⌉, lesson 8.7's 4 on tiny and 2 on full", () => {
  const [, tinyIn, tiny, fullIn, full] = /on tiny, ⌈(\d+) \/ 6⌉ = (\d+); on full, ⌈([\d,]+) \/ 1023⌉ = (\d+)/
    .exec(lessonText("08-safrole/07-entering-tickets.md"))!;
  assert.equal(2 * TINY.E, Number(tinyIn));
  assert.equal(attemptsAllowed(TINY, 6), Number(tiny));
  assert.equal(2 * FULL.E, Number(fullIn.replaceAll(",", "")));
  assert.equal(attemptsAllowed(FULL, 1023), Number(full));
  const next = nextBlock(TINY, START, 1, []);
  assert.equal(next.n, Number(tiny));
  const ids = ticketIds(next.eta2, next.pending.length, next.n);
  const all = ids.flat();
  assert.deepEqual(ids.map((row) => row.length), Array(6).fill(4), "6 validators, 4 attempts each");
  assert.equal(new Set(all).size, all.length, "no two tickets share an id");
  assert.ok(all.every((id) => id >= 0 && id <= 255), "two hex digits");
  assert.deepEqual(ticketIds(next.eta2, 6, 4), ids, "the same η′₂ deals the same ids");
});

test("rotation: START is lesson 8.2's sets, and a new epoch moves them as its run does", () => {
  const lesson = lessonText("08-safrole/02-rotating-the-validators.md");
  const rows = [...lesson.matchAll(/^(staging|pending|active|previous) +((?:[0-9a-f]{4} ?)+) +→ +((?:[0-9a-f]{4} ?)+)$/gm)];
  assert.equal(rows.length, 4, "8.2's four rows");
  const [, offender] = /`([0-9a-f]{4})` is an offender/.exec(lesson)!;
  const after = rotate(START.sets, [offender]);
  for (const [, set, before, moved] of rows) {
    const key = set as keyof State["sets"];
    assert.deepEqual(START.sets[key], before.trim().split(" "), `${set} before`);
    assert.deepEqual(after[key], moved.trim().split(" "), `${set} after`);
  }
  assert.ok(after.pending.includes(NULL_KEY));
});

test("η: START is lesson 8.1's starting entropy, and a new epoch moves it along one", () => {
  const lesson = lessonText("08-safrole/01-stirring-the-entropy.md");
  // 8.1's first red: the stub's η, the vectors' starting state, first entry marked +
  const red = [...lesson.matchAll(/^ {2}[+ ] {3}'0x([0-9a-f]{8})[0-9a-f]{56}',?$/gm)].map(([, start]) => start);
  assert.deepEqual(START.entropy.map((eta) => eta.base), red);
  assert.ok(START.entropy.every((eta) => eta.stirs === 0));
  const moved = nextEntropy(START.entropy, true);
  assert.deepEqual(moved.slice(1), START.entropy.slice(0, 3), "η₀ → η₁ → η₂ → η₃, the oldest dropped");
  assert.deepEqual(moved[0], { base: START.entropy[0].base, stirs: 1 });
  const stayed = nextEntropy(START.entropy, false);
  assert.deepEqual(stayed.slice(1), START.entropy.slice(1), "no new epoch: only η₀ changes");
});

test("the fallback: the first new epoch gets lesson 8.3's real picks, later ones say they're illustrative", () => {
  const lesson = lessonText("08-safrole/03-the-fallback-sealers.md");
  const picks = [...lesson.matchAll(/^slot +(\d+) of the epoch: validator (\d+)$/gm)].map(([, , v]) => Number(v));
  assert.deepEqual(REAL_FALLBACK.picks, picks);
  // 8.3's run: κ′ is the old γ_P, η′₂ the old η₁: START's, whatever the first epoch held
  assert.match(lesson, /κ′ is the old pending set γ_P, and η′₂ is the old η₁/);
  const first = fallback(TINY, START.entropy[1], START.sets.pending);
  assert.deepEqual(first, { keys: picks.map((p) => START.sets.pending[p]), real: true });
  const later = fallback(TINY, { base: START.entropy[0].base, stirs: 11 }, START.sets.staging);
  assert.equal("real" in later && later.real, false);
  assert.ok("keys" in later && later.keys.every((k) => START.sets.staging.includes(k)), "each pick is a validator of κ′");
});

/** Drives the widget: a block a slot, entering the `enter` lowest free tickets in each. */
function drive(from: State, blocks: number, enter: (slot: number) => number, offenders: string[] = []) {
  let state = from;
  const results = [];
  for (let i = 0; i < blocks; i++) {
    const slot = state.time + 1;
    const next = nextBlock(TINY, state, slot, offenders);
    const ids = ticketIds(next.eta2, next.pending.length, next.n);
    const held = new Set(next.newEpoch ? [] : state.accumulator.map((t) => t.id));
    const free = next.pending.flatMap((by, row) => ids[row].map((id, attempt) => ({ id, attempt, by })))
      .filter((t) => t.by !== NULL_KEY && !held.has(t.id)).sort((x, y) => x.id - y.id);
    const result = step(TINY, state, slot, next.open ? free.slice(0, enter(slot)) : [], offenders);
    results.push({ slot, ...result });
    state = result.after;
  }
  return { state, results };
}

test("a driven epoch: filled, marked at Y, seated outside in; then one closed short falls back", () => {
  const { state, results } = drive(START, 2 * TINY.E, (slot) => (slot < 5 ? TINY.K : slot >= 13 && slot < 15 ? TINY.K : 0), ["ab00"]);
  const marks = results.filter((r) => r.mark).map((r) => r.slot);
  assert.deepEqual(marks, [TINY.Y], "the mark is in the block that reaches phase Y, and only there");
  const seated = results.find((r) => r.byTickets)!;
  assert.equal(seated.slot, TINY.E);
  assert.ok("tickets" in seated.after.sealers);
  const lottery = results.find((r) => r.slot === TINY.E - 1)!.after.accumulator;
  assert.deepEqual(seated.after.sealers.tickets, outsideIn(lottery));
  assert.equal(seated.after.accumulator.length, 0, "a new epoch starts a new lottery");
  // epoch 1's lottery got 6 tickets: closed short, so epoch 2 falls back (stand-in picks)
  assert.ok("keys" in state.sealers && !state.sealers.real);
  assert.equal(epochOf(TINY, state.time), 2);
  assert.deepEqual(state.sets.pending, rotate(START.sets, ["ab00"]).pending, "ι, ab00 blanked");
  // tickets only while open: none ever entered in a block at phase Y or later
  assert.ok(results.every((r) => r.entered.length === 0 || phaseOf(TINY, r.slot) < TINY.Y));
  assert.ok(results.every((r) => r.entered.length <= TINY.K));
});

test("a first epoch that closes short gets the real fallback", () => {
  const { results } = drive(START, TINY.E, () => 1);
  const change = results.at(-1)!;
  assert.equal(change.newEpoch, true);
  assert.equal(change.byTickets, false);
  assert.deepEqual(change.after.sealers, { keys: REAL_FALLBACK.picks.map((p) => START.sets.pending[p]), real: true });
});
