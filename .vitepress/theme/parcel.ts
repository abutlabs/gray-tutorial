// The parcel the structure widgets share (lessons 3.1, 3.2 and 3.3): a vector's value as
// compartments of tappable parts, a readout for the part tapped, and the same parts as the
// bytes hold them, in Appendix C's order. A model says what the compartments are and what
// each part is for; the bytes come from codec-map.ts's encoder, so where a part went can't
// be faked. Parcel.vue draws it.

import { ERRORS, short, spaced } from "./codec-map.ts";
import type { Node } from "./codec-map.ts";

/** A compartment: its top-level fields, what it's for, and its colour on the page. */
export interface Compartment {
  id: string;
  name: string;
  says: string;
  fields: string[];
  tone: "green" | "grey" | "brand" | "amber" | "purple";
  stapled?: boolean; // drawn with a dashed edge, like the package's slip
}
/** Something to find by tapping. */
export interface Goal { id: string; say: string; reached: (path: string) => boolean }
/** A top-level part as the bytes hold it: its size, and the compartment it belongs to. */
export interface Wire { path: string; bytes: number; tone: Compartment["tone"] }

/** Everything Parcel.vue needs to draw one structure. */
export interface Parcel {
  name: string; // the vector's name for the whole: "work_package"
  whole: string; // what the readout says before any tap
  bytes: number[];
  compartments: Compartment[];
  partAt: (path: string) => Node;
  compartmentOf: (path: string) => Compartment;
  chipRows: (compartment: string, selected: string) => string[][];
  labelOf: (path: string) => string;
  saysOf: (n: Node) => string;
  valueOf: (n: Node) => string;
  bytesOf: (n: Node) => string;
  hexOf: (n: Node) => string;
  wire: Wire[];
  goals: Goal[];
}

/** A part's name: the last step of its path, "[1]" for an item in a list. */
export const nameOf = (path: string): string => /(\[\d+\]|[^.[\]]+)$/.exec(path)![1];

/** Every part by its path, from a map's root. */
export function partsOf(root: Node): (path: string) => Node {
  const nodes = new Map<string, Node>();
  const walk = (n: Node) => { nodes.set(n.path, n); n.children.forEach(walk); };
  walk(root);
  return (path) => {
    const n = nodes.get(path);
    if (!n) throw new Error(`no part ${path}`);
    return n;
  };
}

/** The compartment a part is in, by its top-level field. */
export const compartmentIn = (compartments: Compartment[]) => (path: string): Compartment =>
  compartments.find((c) => c.fields.includes(path.split(/[.[]/)[0]))!;

/** A part's value, short: a number as a number, bytes as their first and last few, a
 *  result as its case. */
export function valueIn(bytes: number[]): (n: Node) => string {
  return (n) => {
    const own = bytes.slice(n.start + n.tag + n.prefix, n.end);
    if (n.type === "result") {
      const [name] = Object.keys(n.json as object);
      return name === "ok" ? `ok: ${own.length} bytes of output, ${short(own)}` : `${name}: error ${ERRORS.indexOf(name) + 1}, no output`;
    }
    if (typeof n.json === "number") return String(n.json);
    if (Array.isArray(n.json)) return n.json.length === 0 ? "none" : `${n.json.length} of them`;
    if (typeof n.json === "string") return n.prefix ? `${own.length} bytes: ${short(own)}` : short(own);
    return `${n.end - n.start} bytes in ${n.children.length} parts`;
  };
}

/** Where a part's bytes are: "bytes 0 to 3, 4 of them", and what comes first, if anything. */
export function bytesOf(n: Node): string {
  const size = n.end - n.start;
  const where = size === 1 ? `byte ${n.start}, 1 of them` : `bytes ${n.start} to ${n.end - 1}, ${size} of them`;
  const first: string[] = [];
  if (n.tag) first.push(n.type === "result" ? "its tag" : "its ¿ byte");
  if (n.prefix) first.push(`${Array.isArray(n.json) ? "the count" : "its length"}${n.prefix > 1 ? ` (${n.prefix} bytes)` : ""}`);
  return first.length ? `${where}, ${first.join(" then ")} first` : where;
}

/** A part's bytes as a hex dump writes them, for the readout's line (at most 12). */
export const hexIn = (bytes: number[]) => (n: Node): string => {
  const b = bytes.slice(n.start, n.end);
  return b.length <= 12 ? spaced(b) : `${spaced(b.slice(0, 8))} … (${b.length} bytes)`;
};

/** The top-level fields as the bytes hold them, in Appendix C's order, with their sizes. */
export const wireOf = (root: Node, compartmentOf: (path: string) => Compartment): Wire[] =>
  root.children.map((n) => ({ path: n.path, bytes: n.end - n.start, tone: compartmentOf(n.path).tone }));
