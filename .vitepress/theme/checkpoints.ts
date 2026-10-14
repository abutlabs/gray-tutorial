// Lesson 16.6's checkpoints (GP App. B.4 and B.7): a service runs with two contexts, X and
// Y, both its start to begin with. Every host call changes X; checkpoint copies X into Y;
// when the machine stops, the collapse C keeps X on a halt, Y on a panic or out of gas.
// Service 0 is lesson 16.4's made-up record (a balance of 1,000), storing lesson 16.5's
// "last" → 1, 2, 3 and "ast" → 1, 2, 3, and sending lesson 17.3's hundred to service 1.

/** What the widget follows of a context: storage, the balance, the transfers sent. */
export type Context = { storage: Record<string, string>; balance: number; sent: number[] };
/** The invocation context: X, as the service changes it, and Y, its fallback. */
export type Pair = { x: Context; y: Context };
export type Step = "write last" | "write ast" | "transfer" | "checkpoint";
export type Exit = "halt" | "panic" | "out of gas";

export const START: Context = { storage: {}, balance: 1000, sent: [] };
export const VALUE = "01 02 03"; // both writes' value, as the lesson's tests store it
export const AMOUNT = 100; // the transfer of lesson 17.3's vector: a hundred, to service 1
/** The most steps before the end: 6 transfers leave 400, above any minimum balance two writes need. */
export const MOST_STEPS = 6;

const copy = (c: Context): Context => ({ storage: { ...c.storage }, balance: c.balance, sent: [...c.sent] });

/** One host call: a write or a transfer changes X alone; checkpoint makes Y′ = X. */
export function apply(p: Pair, step: Step): Pair {
  if (step === "checkpoint") return { x: p.x, y: copy(p.x) };
  const x = copy(p.x);
  if (step === "write last") x.storage.last = VALUE;
  if (step === "write ast") x.storage.ast = VALUE;
  if (step === "transfer") {
    x.balance -= AMOUNT;
    x.sent.push(AMOUNT);
  }
  return { x, y: p.y };
}

/** The pair at the start, I(…)², and after each step. */
export function run(steps: Step[]): Pair[] {
  const pairs: Pair[] = [{ x: copy(START), y: copy(START) }];
  for (const step of steps) pairs.push(apply(pairs[pairs.length - 1], step));
  return pairs;
}

/** Which context C keeps: X on a halt, Y on a panic or running out of gas. */
export const keeps = (exit: Exit): "X" | "Y" => (exit === "halt" ? "X" : "Y");

/** C (GP App. B.4): the context the service leaves behind. */
export const collapse = (p: Pair, exit: Exit): Context => (keeps(exit) === "X" ? p.x : p.y);

/** The storage's keys, in the order a reader would read them: "last" before "ast". */
export const keysOf = (c: Context) => ["last", "ast"].filter((k) => k in c.storage);

/** Whether two contexts hold the same storage, balance and transfers. */
export function same(a: Context, b: Context): boolean {
  const storage = (c: Context) => keysOf(c).map((k) => `${k}=${c.storage[k]}`).join();
  return storage(a) === storage(b) && a.balance === b.balance && a.sent.join() === b.sent.join();
}
