// Lesson 17.11's widget: M_B, the well-balanced Merkle root, with Keccak. A list splits in two,
// the first half rounded up; each half is rooted; the two are hashed under "node". One item
// alone is hashed; none is 32 zero bytes. The items are the test's single bytes 1, 2, 3, …;
// the hashes are real. tools/widget-well-balanced.test.ts checks them against the lesson.

import { keccak_256 } from "@noble/hashes/sha3.js";

const NODE = Array.from(new TextEncoder().encode("node"));
export const keccak = (bytes: number[]): number[] => Array.from(keccak_256(Uint8Array.from(bytes)));

/** The tree the root is built from: a leaf (an item, as it is) or a node over two halves. */
export type Tree = { kind: "leaf"; items: number[][] } | { kind: "node"; left: Tree; right: Tree; hash: number[] } | { kind: "zeros" };
export function treeOf(items: number[][]): Tree {
  if (items.length === 0) return { kind: "zeros" };
  if (items.length === 1) return { kind: "leaf", items };
  const half = Math.ceil(items.length / 2);
  const left = treeOf(items.slice(0, half));
  const right = treeOf(items.slice(half));
  return { kind: "node", left, right, hash: keccak([...NODE, ...valueOf(left), ...valueOf(right)]) };
}
/** What a subtree stands for in its parent's hash: its node hash, or its one item as it is. */
export const valueOf = (t: Tree): number[] => (t.kind === "node" ? t.hash : t.kind === "leaf" ? t.items[0] : Array(32).fill(0));
/** M_B: one item is hashed; otherwise the tree's value. */
export const wellBalancedRoot = (items: number[][]): number[] => (items.length === 1 ? keccak(items[0]) : valueOf(treeOf(items)));
export const hex = (b: number[]): string => `0x${b.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
/** The vector's root over its one output, ℰ₄(1) ⌢ h, where h is what service 1 yielded. */
export const VECTOR_ROOT = "0x16776227fe92a881d7bffdb92adc45b575f8a24b89d563e42e43566d8b915ac0";
