// Lesson 2.6's widget: the tiny work_item vector's JSON and its 236 bytes, side by side. The
// bytes are made here, by encoding the JSON's values in its field order with lessons 2.1 to
// 2.5's rules, and the same walk records which bytes each field became, so the map can't be
// faked. tools/widget-vector-map.test.ts checks it against the lesson's own dump and bullets.

import { encodeMapped, isNumber, numberRule, numberSay, pieces, short, spaced } from "./codec-map.ts";
import type { Node, Type } from "./codec-map.ts";

// The shared encoder and its map, as this widget and its test have always imported them.
export { encodeMapped, flatten, fromHex, isNumber, ownerOf, pieces, short, spaced, WIDTH } from "./codec-map.ts";
export type { Node, Piece, Type } from "./codec-map.ts";

/** ImportSpec, ExtrinsicSpec and WorkItem, field by field, in the order Appendix C encodes them. */
export const IMPORT_SPEC: Type = { record: [["tree_root", "hash"], ["index", "u16"]] };
export const EXTRINSIC_SPEC: Type = { record: [["hash", "hash"], ["len", "u32"]] };
export const WORK_ITEM: Type = {
  record: [
    ["service", "u32"],
    ["code_hash", "hash"],
    ["refine_gas_limit", "u64"],
    ["accumulate_gas_limit", "u64"],
    ["export_count", "u16"],
    ["payload", "blob"],
    ["import_segments", { seq: IMPORT_SPEC }],
    ["extrinsic", { seq: EXTRINSIC_SPEC }],
  ],
};

/** codec/tiny/work_item.json, as it is. */
export const WORK_ITEM_JSON = {
  service: 16909060,
  code_hash: "0x70a50829851e8f6a8c80f92806ae0e95eb7c06ad064e311cc39107b3219e532e",
  refine_gas_limit: 42,
  accumulate_gas_limit: 42,
  export_count: 4,
  payload: "0x0102030405",
  import_segments: [
    { tree_root: "0x461236a7eb29dcffc1dd282ce1de0e0ed691fc80e91e02276fe8f778f088a1b8", index: 0 },
    { tree_root: "0xe7cb536522c1c1b41fff8021055b774e929530941ea12c10f1213c56455f29ad", index: 1 },
    { tree_root: "0xb0a487a4adf6a0eda5d69ddd2f8b241cf44204f0ff793e993e5e553b7862a1dc", index: 2 },
  ],
  extrinsic: [
    { hash: "0x381a0e351c5593018bbc87dd6694695caa1c0c1ddb24e70995da878d89495bf1", len: 16 },
    { hash: "0x6c437d85cd8327f42a35d427ede1b5871347d3aae7442f2df1ff80f834acf17a", len: 17 },
  ],
};

/** The colour of each byte: lengths and counts in the marker's amber, and the fields'
 *  values in turn blue and green, as the lesson's diagram draws them. */
export function shades(root: Node): ("mark" | "top" | "low")[] {
  const out: ("mark" | "top" | "low")[] = [];
  let k = 0;
  for (const p of pieces(root)) {
    const shade = p.role !== "value" ? "mark" : k++ % 2 === 0 ? "top" : "low";
    for (let i = p.start; i < p.end; i++) out.push(shade);
  }
  return out;
}

/** The last part of a path: "import_segments[2].index" → "index". */
const nameOf = (path: string) => path.split(".").at(-1)!;

/** A field's rule, short, for the readout. */
export function ruleOf(type: Type): string {
  if (isNumber(type)) return numberRule(type);
  if (type === "hash") return "as is";
  if (type === "blob") return "length + bytes";
  if (type === "natural") return "compact";
  if (type === "bool") return "1 or 0";
  if (type === "result") return "O: a tag, then the output if any";
  if ("seq" in type) return "count + items";
  return "fields in order";
}

/** How a record's field is written, for the line about a sequence of them. */
function partSay(name: string, t: Type): string {
  if (t === "hash") return `its 32-byte ${name}`;
  if (isNumber(t)) return `its ${name} as a ${t} (${ruleOf(t)})`;
  return `its ${name}`;
}

/** The line that says how a node's value became its bytes, on the real values. */
export function explain(node: Node, bytes: number[]): string {
  const own = bytes.slice(node.start, node.end);
  const t = node.type;
  if (isNumber(t)) return numberSay(node, own);
  if (t === "hash") return `${node.path}: a 32-byte hash, written as it is. Its size never changes, so no length → ${short(own)}`;
  if (t === "blob") {
    const n = node.end - node.start - node.prefix;
    return `${node.path}: ${n} bytes, so first its length ${n} as a compact natural → ${spaced(own.slice(0, node.prefix))}, then the bytes as they are → ${short(own.slice(node.prefix))}`;
  }
  if (t === "natural" || t === "result" || t === "bool") return `${node.path}: ${t} → ${spaced(own)}`; // a work item has neither
  if ("seq" in t) {
    const n = node.children.length;
    const each = node.children[0] ? node.children[0].end - node.children[0].start : 0;
    const parts = typeof t.seq === "object" && "record" in t.seq ? t.seq.record.map(([name, ft]) => partSay(name, ft)).join(", then ") : "its bytes";
    return `${node.path}: ${n} of them, so first the count ${n} as a compact natural → ${spaced(own.slice(0, node.prefix))}, then each one: ${parts}. ${node.prefix} + ${n} × ${each} = ${own.length} bytes.`;
  }
  if (!node.path) return `the whole work item: its fields in order, nothing between → ${own.length} bytes`;
  const parts = node.children.map((c) => {
    const b = bytes.slice(c.start, c.end);
    return c.type === "hash" ? `${nameOf(c.path)}'s 32 bytes → ${short(b)}` : `${nameOf(c.path)} ${c.json} as a ${c.type as string} (${ruleOf(c.type)}) → ${spaced(b)}`;
  });
  return `${node.path}: its fields in order and nothing between: ${parts.join(", then ")}. Every item is ${own.length} bytes, so no length.`;
}

/** The tiny work item, encoded and mapped. */
export const ITEM = encodeMapped(WORK_ITEM, WORK_ITEM_JSON);

/** The field the lesson's dump ends after: its hexdump command shows exactly the first four. */
export const DUMP_FIELD = "accumulate_gas_limit";

/** A hex dump's row: 16 bytes. */
export const ROW = 16;

/** The hex dump rows (1, 2, ...) a node's first and last bytes are on. */
export const rowsOf = (node: Node): [number, number] => [Math.floor(node.start / ROW) + 1, Math.floor((node.end - 1) / ROW) + 1];

/** Whether a node's bytes start on one row of 16 and run on into the next. */
export const crossesRow = (node: Node): boolean => rowsOf(node)[0] !== rowsOf(node)[1];
