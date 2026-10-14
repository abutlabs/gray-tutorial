// Lesson 19.1's widget: a block import as the Gray Paper's dependency graph (§4.2,
// equation transitionfunctioncomposition). Each step makes some new values from some
// inputs; a step's wave is one more than the latest wave among its inputs, the block and
// the state before it being wave 0. The steps are the lesson's STEPS, line for line, and
// the waves are computed from them, never written down. tools/widget-import-waves.test.ts
// checks both against the lesson.

/** One line of the graph: the values a step makes, what it's made from, and the lessons that
 *  build it. A prime (′) is a value after the block, a dagger (†, ‡) a value halfway. */
export type Step = { makes: string[]; from: string[]; lesson: string };

/** The Gray Paper's dependency graph, in the order it lists the steps (lesson 19.1's STEPS). */
export const STEPS: Step[] = [
  { makes: ["τ′"], from: ["H"], lesson: "4.6" },
  { makes: ["β_H†"], from: ["H", "β_H"], lesson: "9.2" },
  { makes: ["γ′"], from: ["H", "τ", "E_T", "γ", "ι", "η′", "κ′", "ψ′"], lesson: "8.5" },
  { makes: ["η′"], from: ["H", "τ", "η"], lesson: "8.1" },
  { makes: ["κ′"], from: ["H", "τ", "κ", "γ"], lesson: "8.2" },
  { makes: ["λ′"], from: ["H", "τ", "λ", "κ"], lesson: "8.2" },
  { makes: ["ψ′"], from: ["E_D", "ψ"], lesson: "10.1, 10.2" },
  { makes: ["ρ†"], from: ["E_D", "ρ"], lesson: "10.3" },
  { makes: ["ρ‡"], from: ["E_A", "ρ†"], lesson: "11.2" },
  { makes: ["ρ′"], from: ["E_G", "ρ‡", "κ", "τ′"], lesson: "12.3" },
  { makes: ["𝐑*"], from: ["E_A", "ρ†"], lesson: "11.1, 17.2" },
  {
    makes: ["ω′", "ξ′", "δ‡", "χ′", "ι′", "ϕ′", "θ′", "𝐒"],
    from: ["𝐑*", "ω", "ξ", "δ", "χ", "ι", "ϕ", "τ", "τ′"],
    lesson: "17",
  },
  { makes: ["β_H′"], from: ["H", "E_G", "β_H†", "θ′"], lesson: "9.2" },
  { makes: ["δ′"], from: ["E_P", "δ‡", "τ′"], lesson: "14.1" },
  { makes: ["α′"], from: ["H", "E_G", "ϕ′", "α"], lesson: "13.1" },
  { makes: ["π′"], from: ["E_G", "E_P", "E_A", "E_T", "τ", "κ′", "π", "H", "𝐒"], lesson: "18" },
];

/** Every symbol in plain words, as the glossary and the lessons name them. */
export const NAMES: Record<string, string> = {
  H: "the header",
  E_T: "tickets",
  E_D: "disputes",
  E_P: "preimages",
  E_A: "assurances",
  E_G: "guarantees",
  τ: "the time",
  β_H: "recent blocks",
  γ: "Safrole state",
  η: "entropy",
  κ: "validators",
  λ: "previous validators",
  ι: "next validators",
  ψ: "past judgements",
  ρ: "cores",
  ω: "ready queue",
  ξ: "accumulated packages",
  δ: "services",
  χ: "privileged services",
  ϕ: "authorizer queue",
  α: "authorizer pools",
  π: "statistics",
  "τ′": "new time",
  "β_H†": "recent blocks, last root filled in",
  "γ′": "Safrole state",
  "η′": "new entropy",
  "κ′": "new validators",
  "λ′": "new previous validators",
  "ψ′": "new judgements",
  "ρ†": "cores after judgments",
  "ρ‡": "cores after assurances",
  "ρ′": "cores after guarantees",
  "𝐑*": "reports ready to accumulate",
  "ω′": "ready queue",
  "ξ′": "accumulated packages",
  "δ‡": "services after accumulation",
  "χ′": "privileged services",
  "ι′": "next validators",
  "ϕ′": "authorizer queue",
  "θ′": "accumulation outputs",
  𝐒: "accumulation statistics",
  "β_H′": "recent blocks",
  "δ′": "services with preimages",
  "α′": "authorizer pools",
  "π′": "statistics",
};

/** A step's name: its one value's, or "accumulation" for the step that makes eight. */
export const stepName = (step: Step): string => (step.makes.length === 1 ? NAMES[step.makes[0]] : "accumulation");

/** The Parts the steps come from, by number: their folder and title. */
export const PARTS: Record<number, { dir: string; title: string }> = {
  4: { dir: "04-blocks", title: "Blocks" },
  8: { dir: "08-safrole", title: "Safrole" },
  9: { dir: "09-recent-history", title: "Recent history" },
  10: { dir: "10-disputes", title: "Disputes" },
  11: { dir: "11-assurances", title: "Assurances" },
  12: { dir: "12-guarantees", title: "Guarantees" },
  13: { dir: "13-authorization", title: "Authorization" },
  14: { dir: "14-services", title: "Services and preimages" },
  17: { dir: "17-accumulation", title: "Accumulation" },
  18: { dir: "18-statistics", title: "Statistics" },
};

/** The lesson pages the steps name, by number, within their Part's folder. */
export const LESSON_PAGES: Record<string, string> = {
  "4.6": "06-the-header",
  "8.1": "01-stirring-the-entropy",
  "8.2": "02-rotating-the-validators",
  "8.5": "05-one-step-of-safrole",
  "9.2": "02-recent-blocks",
  "10.1": "01-votes-and-verdicts",
  "10.2": "02-culprits-and-faults",
  "10.3": "03-clearing-the-cores",
  "11.1": "01-available",
  "11.2": "02-timeouts",
  "12.3": "03-onto-the-cores",
  "13.1": "01-the-authorizer-pools",
  "14.1": "01-providing-preimages",
  "17.2": "02-waiting-reports",
};

/** Where a step was built: each lesson (or whole Part) it names, with a link from lesson 19.1. */
export type Built = { label: string; href: string; part: number; partTitle: string };
export function builtIn(step: Step): Built[] {
  return step.lesson.split(", ").map((n) => {
    const part = Number(n.split(".")[0]);
    const { dir, title } = PARTS[part];
    const page = n.includes(".") ? LESSON_PAGES[n] : "index";
    return { label: n.includes(".") ? `lesson ${n}` : `Part ${n}`, href: `../${dir}/${page}`, part, partTitle: title };
  });
}

/** The step that makes a value, or undefined for the block and the state before it. */
export const makerOf = (x: string): Step | undefined => STEPS.find((s) => s.makes.includes(x));

/** A step's key: the first value it makes. A value from the start is its own key. */
export const keyOf = (x: string): string => makerOf(x)?.makes[0] ?? x;
export const stepAt = (key: string): Step | undefined => STEPS.find((s) => s.makes[0] === key);

/** What's there from the start: the block's parts (the header, then the extrinsic's), and the
 *  state before the block, in the order σ lists its parts (GP §4.2, statecomposition). */
const read = new Set(STEPS.flatMap((s) => s.from).filter((x) => !makerOf(x)));
export const BLOCK: string[] = ["H", "E_T", "E_D", "E_P", "E_A", "E_G"].filter((x) => read.has(x));
export const BEFORE: string[] = ["α", "β_H", "θ", "γ", "δ", "η", "ι", "κ", "λ", "ρ", "τ", "ϕ", "χ", "ψ", "π", "ω", "ξ"]
  .filter((x) => read.has(x));

/** The wave of every value and step key: 0 for the block and the old state, else one more
 *  than the latest wave among the step's inputs (the longest path from the start). Throws
 *  if some steps wait for each other. */
export function wavesOf(steps: Step[]): Map<string, number> {
  const wave = new Map<string, number>();
  const visiting = new Set<Step>();
  const maker = (x: string) => steps.find((s) => s.makes.includes(x));
  const of = (x: string): number => {
    const step = maker(x);
    if (!step) return 0;
    const known = wave.get(step.makes[0]);
    if (known !== undefined) return known;
    if (visiting.has(step)) throw new Error("these steps wait for each other");
    visiting.add(step);
    const w = 1 + Math.max(...step.from.map(of));
    visiting.delete(step);
    for (const m of step.makes) wave.set(m, w);
    return w;
  };
  for (const s of steps) for (const x of [...s.from, ...s.makes]) of(x);
  for (const s of steps) for (const x of s.from) if (!maker(x)) wave.set(x, 0);
  return wave;
}

export const WAVE = wavesOf(STEPS);
export const waveOf = (key: string): number => WAVE.get(key) ?? 0;

/** The steps in waves, wave 1 first, each in the Gray Paper's order. */
export const WAVES: Step[][] = Array.from({ length: Math.max(...WAVE.values()) }, (_, i) =>
  STEPS.filter((s) => waveOf(s.makes[0]) === i + 1),
);
export const LAST_WAVE = WAVES.length;

/** What a step is made from, as keys: each value from the start, and each step it waits for. */
export const inputsOf = (key: string): string[] => [...new Set((stepAt(key)?.from ?? []).map(keyOf))];

/** The steps made from a key's values: its dependents. */
export function dependentsOf(key: string): string[] {
  const values = stepAt(key)?.makes ?? [key];
  return STEPS.filter((s) => s.from.some((x) => values.includes(x))).map((s) => s.makes[0]);
}

/** The most inputs any step has, counting each listed value once. */
export const MOST_INPUTS = Math.max(...STEPS.map((s) => s.from.length));

/** The input that holds a step back: one in the wave just before it (the first, if several). */
export function latestInput(key: string): string | undefined {
  const step = stepAt(key);
  if (!step) return undefined;
  return step.from.find((x) => waveOf(keyOf(x)) === waveOf(key) - 1);
}

/** Whether a trail of taps is a longest chain: one step per wave from wave 1 to the last,
 *  each made from the one before. */
export function isLongestChain(trail: string[]): boolean {
  if (trail.length !== LAST_WAVE) return false;
  return trail.every((k, i) => waveOf(k) === i + 1 && (i === 0 || dependentsOf(trail[i - 1]).includes(k)));
}

/** A tap extends the trail if the tapped key is made from the last one; else starts afresh. */
export const nextTrail = (trail: string[], key: string): string[] =>
  trail.length > 0 && dependentsOf(trail[trail.length - 1]).includes(key) ? [...trail, key] : [key];

/** A symbol in parts for showing: E_T is E with a subscript T; β_H† is β, sub H, then †. */
export function symbolParts(x: string): { base: string; sub: string; mark: string } {
  const m = /^(.+?)_([A-Z]+)(.*)$/u.exec(x);
  return m ? { base: m[1], sub: m[2], mark: m[3] } : { base: x, sub: "", mark: "" };
}
