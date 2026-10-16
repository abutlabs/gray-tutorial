// The parcel the structure widgets share (lessons 3.1, 3.2 and 3.3): a vector's value as
// compartments of tappable parts, a readout for the part tapped, and the same parts as the
// bytes hold them, in Appendix C's order. A model says what the compartments are and what
// each part is for; the bytes come from codec-map.ts's encoder, so where a part went can't
// be faked. Parcel.vue draws it.

import { encodeMapped, ERRORS, short, spaced } from "./codec-map.ts";
import type { Json, Node, Type } from "./codec-map.ts";

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

/** How refine went, for a result whose JSON key is `outcome`: "ok", or an error's name. */
export const resultSays = (outcome: string): string =>
  outcome === "ok"
    ? "How refine went: tag 0, success, then the output as a blob, its length first."
    : `How refine went: the tag ${ERRORS.indexOf(outcome) + 1}, a ${outcome}, and nothing more.`;

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
    if (typeof n.json === "boolean") return n.json ? "yes (1)" : "no (0)";
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

/** A structure for the parcel, described: its type and value, its compartments, what each
 *  part is for by its name, and what one item of each list is called. */
export interface Model {
  name: string;
  whole: string;
  type: Type;
  json: Json;
  compartments: Compartment[];
  says: Record<string, string>;
  items: Record<string, string>; // "verdicts" → "verdict"
  saysItem?: (n: Node, partAt: (path: string) => Node) => string;
  goals: Goal[];
}

/** The chips under a top-level field: the field, then the parts of each part along the way
 *  to the one selected, so any depth opens a row at a time. */
export function drillRows(partAt: (path: string) => Node, fields: string[], selected: string): string[][] {
  const rows = [fields];
  for (const top of fields) {
    if (selected !== top && !selected.startsWith(`${top}.`) && !selected.startsWith(`${top}[`)) continue;
    let path = top;
    for (;;) {
      const n = partAt(path);
      if (!n.children.length) break;
      rows.push(n.children.map((c) => c.path));
      const next = n.children.find((c) => selected === c.path || selected.startsWith(`${c.path}.`) || selected.startsWith(`${c.path}[`));
      if (!next) break;
      path = next.path;
    }
  }
  return rows;
}

/** A model, encoded and mapped, as Parcel.vue draws it. A structure that is one list has
 *  its strip cut at the list's count and items, not left as one block. */
export function makeParcel(m: Model): Parcel {
  const map = encodeMapped(m.type, m.json);
  const partAt = partsOf(map.root);
  const compartmentOf = compartmentIn(m.compartments);
  const item = /^(.*)\[(\d+)\]$/;
  const labelOf = (path: string) => {
    const i = item.exec(path);
    return i ? `${m.items[nameOf(i[1])] ?? "item"} ${i[2]}` : nameOf(path);
  };
  const saysOf = (n: Node) => {
    if (item.test(n.path)) return m.saysItem?.(n, partAt) ?? `${labelOf(n.path)}.`;
    if (n.type === "result") return resultSays(Object.keys(n.json as object)[0]);
    return m.says[nameOf(n.path)] ?? "";
  };
  const top = map.root.children;
  const only = top.length === 1 && top[0].prefix && top[0].children.length ? top[0] : null;
  const tone = (path: string) => compartmentOf(path).tone;
  const wire: Wire[] = only
    ? [{ path: only.path, bytes: only.prefix, tone: tone(only.path) }, ...only.children.map((c) => ({ path: c.path, bytes: c.end - c.start, tone: tone(c.path) }))]
    : wireOf(map.root, compartmentOf);
  return {
    name: m.name,
    whole: m.whole,
    bytes: map.bytes,
    compartments: m.compartments,
    partAt,
    compartmentOf,
    chipRows: (c, selected) => drillRows(partAt, m.compartments.find((x) => x.id === c)!.fields, selected),
    labelOf,
    saysOf,
    valueOf: valueIn(map.bytes),
    bytesOf,
    hexOf: hexIn(map.bytes),
    wire,
    goals: m.goals,
  };
}
