// Lesson 3.3's big-picture widget: where a bundle's shards go on tiny. The core's guarantors
// cut the bundle into one shard per validator (the miniature "JAM" of shards.ts), hash each
// shard, and root the six hashes as the Gray Paper roots them, M_B with Blake2b: that root is
// the report's erasure root. Each validator gets its shard with a proof, checks it against the
// root, and says so (an assurance) if it holds it. More than two-thirds saying so makes the
// report available; any 3 real shards rebuild it. The reader decides who holds, who is
// offline and who says yes without holding. tools/widget-shard-journey.test.ts checks it.

import { H } from "./hash.ts";
import { encodeShards, lettersOf, originalShards, rebuild, SIZES, type Shard } from "./shards.ts";
import { proofOf, rootFrom, treeOf, wellBalancedRoot, type Step, type Tree } from "./well-balanced.ts";

export const V = SIZES.tiny; // 6 validators
export const FULL = SIZES.full; // 1,023
/** Any R(v) shards rebuild the bundle: 3 on tiny, 342 on full. */
export const NEED = originalShards(V);
/** More than two-thirds of the validators must say they hold their shard: 5 of 6, 683 of 1,023. */
export const enough = (v: number): number => Math.floor((2 * v) / 3) + 1;
export const ASSURE = enough(V);

export const MESSAGE = "JAM";
export const SHARDS: number[] = encodeShards(lettersOf(MESSAGE)!, V); // 74 65 77 110 164 239
/** Each validator's leaf: the hash of its shard, as the Gray Paper hashes each bundle chunk. */
export const LEAVES: number[][] = SHARDS.map((s) => H([s]));
export const TREE: Tree = treeOf(LEAVES, H);
/** The erasure root, the one hash the report carries for all six shards. */
export const ROOT: number[] = wellBalancedRoot(LEAVES, H);

export const proof = (i: number): Step[] => proofOf(LEAVES, i, H);
/** Validator i's check: its shard's hash and its proof hash back to the report's root. */
export const checks = (i: number, shard: number): boolean => same(rootFrom(H([shard]), proof(i), H), ROOT);
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, j) => x === b[j]);

/** What a validator does with its shard: keeps it and says so, is offline and says nothing,
 *  or says it holds it without holding it. */
export type Status = "holds" | "offline" | "lies";
export const STATUSES: Status[] = ["holds", "offline", "lies"];

export interface Outcome {
  said: number; // assurances: the validators that say they hold their shard
  available: boolean; // more than two-thirds said so
  holders: number[]; // who really holds one
  rebuilt: string | null; // the bundle from the holders' shards, or null with fewer than 3
}

export function outcome(statuses: Status[]): Outcome {
  const said = statuses.filter((s) => s !== "offline").length;
  const holders = statuses.flatMap((s, i) => (s === "holds" ? [i] : []));
  const held: Shard[] = holders.map((x) => ({ x, y: SHARDS[x] }));
  const back = rebuild(held, NEED);
  return { said, available: said >= ASSURE, holders, rebuilt: back && String.fromCharCode(...back) };
}

/** The story of an outcome, in one line. */
export function says(o: Outcome): string {
  const who = `${o.said} of ${V} say they hold their shard`;
  if (!o.available) return `${who}: ${ASSURE} must, so the report isn't available yet. It waits on its core, and is dropped if time runs out.`;
  if (o.rebuilt) return `${who}: available. ${o.holders.length} really do, and any ${NEED} rebuild "${o.rebuilt}" for the auditors.`;
  return `${who}: available, but only ${o.holders.length} really do, and ${NEED} are needed. More than a third lied, which is what the two-thirds rule can't survive.`;
}

/** The scenes the buttons set up, each a lesson in one tap. */
export const SCENES: { says: string; statuses: Status[] }[] = [
  { says: "everyone holds", statuses: ["holds", "holds", "holds", "holds", "holds", "holds"] },
  { says: "2 offline", statuses: ["holds", "offline", "holds", "holds", "offline", "holds"] },
  { says: "2 lie, 1 offline", statuses: ["lies", "holds", "offline", "holds", "lies", "holds"] },
  { says: "3 lie, 1 offline", statuses: ["lies", "holds", "lies", "offline", "lies", "holds"] },
];

export const short = (b: number[]): string => b.slice(0, 2).map((x) => x.toString(16).padStart(2, "0")).join("");

/** Validator i's check, step by step: its shard's hash, then the hash after each proof step,
 *  the last of which is the root. */
export function climb(i: number): number[][] {
  const values = [H([SHARDS[i]])];
  for (const step of proof(i)) values.push(rootFrom(values.at(-1)!, [step], H));
  return values;
}

/** The tree drawn for validator i: its leaf and the nodes above it ("path"), and the halves
 *  its proof hands it ("proof"). */
export function marksFor(i: number): Map<Tree, "path" | "proof"> {
  const marks = new Map<Tree, "path" | "proof">();
  const walk = (t: Tree, at: number, n: number) => {
    marks.set(t, "path");
    if (t.kind !== "node") return;
    const half = Math.ceil(n / 2);
    if (at < half) { marks.set(t.right, "proof"); walk(t.left, at, half); }
    else { marks.set(t.left, "proof"); walk(t.right, at - half, n - half); }
  };
  walk(TREE, i, V);
  return marks;
}

/** A leaf's validator: v0 to v5. */
export const leafName = (t: Tree): string | undefined => (t.kind === "leaf" ? `v${LEAVES.indexOf(t.items[0])}` : undefined);
