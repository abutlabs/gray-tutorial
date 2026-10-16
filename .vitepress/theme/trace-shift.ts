// Lesson 2.7's widget: the decode trace of the tiny work_item vector, and what it becomes
// when one field, export_count, is read from another place in the record. A decoder reads
// on from where the last field stopped, so the fields between the old place and the new
// read the wrong bytes, and the first field after them, where the widths add up again, is
// back in step. tools/widget-trace-shift.test.ts checks every line against the lesson's two
// Output blocks and its check questions.

import { ITEM, WORK_ITEM } from "./vector-map.ts";
import type { Type } from "./codec-map.ts";
import { decodeFixed, decodeNatural } from "./reader-walk.ts";

/** WorkItem's fields in the order the lesson's codec writes them, with their types. */
export const FIELDS: [string, Type][] = (WORK_ITEM as { record: [string, Type][] }).record;
export const NAMES: string[] = FIELDS.map(([n]) => n);
/** The field the lesson moves, and where it sits: fifth. */
export const MOVED = "export_count";
export const HOME = NAMES.indexOf(MOVED);
/** The vector's bytes, as 2.6's widget encodes them from the vector's values. */
export const BYTES: number[] = ITEM.bytes;

/** The field order with export_count at position `at` (0 is first). */
export function orderWith(at: number): string[] {
  const rest = NAMES.filter((n) => n !== MOVED);
  return [...rest.slice(0, at), MOVED, ...rest.slice(at)];
}

/** One line of a trace: an innermost field, where its bytes were, and the bytes. */
export type Line = { path: string; from: number; to: number; hex: string };
const hexOf = (b: number[]) => `0x${b.map((x) => x.toString(16).padStart(2, "0")).join("")}`;

/** Decodes the bytes with the fields in `order`, reporting every innermost field, the way
 *  the lesson's Reader does; stops where the bytes run out. */
export function trace(order: string[]): { lines: Line[]; ranOut: string | null } {
  const lines: Line[] = [];
  let at = 0;
  let ranOut: string | null = null;
  const take = (path: string, n: number): number[] | null => {
    if (ranOut) return null;
    if (at + n > BYTES.length) { ranOut = path; return null; }
    const out = BYTES.slice(at, at + n);
    lines.push({ path, from: at, to: at + n, hex: hexOf(out) });
    at += n;
    return out;
  };
  const read = (type: Type, path: string): void => {
    if (ranOut) return;
    if (type === "u8" || type === "u16" || type === "u32" || type === "u64") { take(path, { u8: 1, u16: 2, u32: 4, u64: 8 }[type]); return; }
    if (type === "hash") { take(path, 32); return; }
    if (typeof type === "object" && "bytes" in type) { take(path, type.bytes); return; }
    if (type === "blob") {
      if (at >= BYTES.length) { ranOut = path; return; }
      const { value, length } = decodeNatural(BYTES, at);
      take(path, length + Number(value));
      return;
    }
    if ("seq" in type) {
      if (at >= BYTES.length) { ranOut = `${path}.length`; return; }
      const { value, length } = decodeNatural(BYTES, at);
      if (!take(`${path}.length`, length)) return;
      // a count read from the wrong place can be enormous: stop as soon as the bytes run out
      for (let i = 0; i < Number(value) && !ranOut; i++) read(type.seq, `${path}.${i}`);
      return;
    }
    if ("seqN" in type) { for (let i = 0; i < type.n; i++) read(type.seqN, `${path}.${i}`); return; }
    if ("option" in type) {
      const tag = take(`${path}.tag`, 1);
      if (tag && tag[0] === 1) read(type.option, path);
      return;
    }
    for (const [name, t] of type.record) read(t, path ? `${path}.${name}` : name);
  };
  const types = new Map(FIELDS);
  for (const name of order) read(types.get(name)!, name);
  return { lines, ranOut };
}

/** The trace as the lesson first shows it: the codec's own order. */
export const ORIGINAL: Line[] = trace(NAMES).lines;

/** A moved trace beside the original: which lines changed, and the first field back in step. */
export function compare(at: number): { lines: (Line & { changed: boolean })[]; ranOut: string | null; backAt: Line | null; wrong: number } {
  const moved = trace(orderWith(at));
  const same = new Set(ORIGINAL.map((l) => `${l.path}@${l.from}-${l.to}`));
  const lines = moved.lines.map((l) => ({ ...l, changed: !same.has(`${l.path}@${l.from}-${l.to}`) }));
  const firstWrong = lines.findIndex((l) => l.changed);
  const backAt = firstWrong < 0 ? null : lines.slice(firstWrong).find((l) => !l.changed) ?? null;
  return { lines, ranOut: moved.ranOut, backAt, wrong: lines.filter((l) => l.changed).length };
}
