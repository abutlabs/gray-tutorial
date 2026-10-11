// The lessons' diagrams, drawn by code so that they stay right, as the Rust Book draws its
// figures from source files. `npm run diagrams` writes them; tools/diagrams.test.ts checks
// the committed files are what this file draws.
//
//   npm run diagrams

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { LESSONS } from "./lessons.ts";

/** One field of an encoding: its name and value, its bytes, and how they were written. */
interface Field {
  name: string;
  value: string;
  bytes: string; // as hex, "…" for bytes left out
  encoding: string;
  from: number; // its first byte's offset
}

// The first fields of codec/tiny/work_item.bin, the work item of lesson 2.6, in two rows.
const WORK_ITEM: Field[][] = [[
  { name: "service", value: "16909060", bytes: "04 03 02 01", encoding: "ℰ₄", from: 0 },
  { name: "code_hash", value: "0x70a5…532e", bytes: "70 a5 08 29 … 9e 53 2e", encoding: "32 bytes, as is", from: 4 },
  { name: "refine_gas_limit", value: "42", bytes: "2a 00 00 00 00 00 00 00", encoding: "ℰ₈", from: 36 },
], [
  { name: "accumulate_gas_limit", value: "42", bytes: "2a 00 00 00 00 00 00 00", encoding: "ℰ₈", from: 44 },
  { name: "export_count", value: "4", bytes: "04 00", encoding: "ℰ₂", from: 52 },
  { name: "payload", value: "0x0102030405", bytes: "05 01 02 03 04 05", encoding: "ℰ(5), then 5 bytes", from: 54 },
]];
const SHOWN_TO = 60; // the payload's last byte + 1
const TOTAL = 236; // work_item.bin's size

const CHAR = 8.4; // monospace at 14px: every character this wide
const GAP = 6;
const PAD = 14;
const ROW = 150;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const widthOf = (...texts: string[]) => Math.max(...texts.map((t) => t.length)) * CHAR + 2 * PAD;

/** A work item's first bytes, field after field: name and value above, bytes, encoding below. */
export function workItemBytes(): string {
  const parts: string[] = [];
  let width = 0;
  WORK_ITEM.forEach((row, r) => {
    const top = r * ROW;
    let x = 16;
    for (const [i, f] of row.entries()) {
      const w = widthOf(f.name, f.value, f.bytes, f.encoding), mid = x + w / 2;
      parts.push(
        `<text class="name" x="${mid}" y="${top + 22}">${escape(f.name)}</text>`,
        `<text class="value" x="${mid}" y="${top + 42}">${escape(f.value)}</text>`,
        `<rect class="field f${(r + i) % 2}" x="${x}" y="${top + 54}" width="${w}" height="44" rx="6"/>`,
        `<text class="bytes" x="${mid}" y="${top + 82}">${escape(f.bytes)}</text>`,
        `<text class="enc" x="${mid}" y="${top + 120}">${escape(f.encoding)}</text>`,
        `<text class="offset" x="${x}" y="${top + 140}">${f.from}</text>`,
      );
      x += w + GAP;
    }
    if (r === WORK_ITEM.length - 1) {
      const rest = `… ${TOTAL - SHOWN_TO} more bytes`, w = widthOf(rest);
      parts.push(
        `<text class="offset" x="${x}" y="${top + 140}">${SHOWN_TO}</text>`,
        `<rect class="field rest" x="${x}" y="${top + 54}" width="${w}" height="44" rx="6"/>`,
        `<text class="enc" x="${x + w / 2}" y="${top + 82}">${escape(rest)}</text>`,
      );
      x += w + GAP;
    }
    width = Math.max(width, x - GAP + 16);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width)} ${WORK_ITEM.length * ROW}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">
<style>
  text { fill: #3c3c43; text-anchor: middle; }
  .value, .enc, .offset { fill: #67676c; font-size: 13px; }
  .bytes { fill: #1b1b1f; }
  .offset { text-anchor: start; }
  .field { stroke-width: 1.5; }
  .f0 { fill: #e8f0fe; stroke: #5b8def; }
  .f1 { fill: #e6f6ef; stroke: #3fa97a; }
  .rest { fill: none; stroke: #9a9aa0; stroke-dasharray: 5 4; }
  @media (prefers-color-scheme: dark) {
    text { fill: #dfdfd6; }
    .value, .enc, .offset { fill: #a8a8a0; }
    .bytes { fill: #ffffff; }
    .f0 { fill: #1e2a44; stroke: #7aa2f7; }
    .f1 { fill: #1b3329; stroke: #4fc08d; }
  }
</style>
${parts.join("\n")}
</svg>
`;
}

/** A node of the little trie in lesson 6.1: where it sits, and what it shows. */
interface TrieNode {
  x: number;
  y: number;
  kind: "branch" | "leaf";
  key?: string; // a leaf's key, as bits
  path?: number; // how many of those bits lead to it
  note: string;
}

// Lesson 6.1's three keys, 0x01, 0x40 and 0xff, and the trie they make.
const TRIE: TrieNode[] = [
  { x: 330, y: 30, kind: "branch", note: "the root: H(this node)" },
  { x: 170, y: 140, kind: "branch", note: "64 bytes: both sides' hashes" },
  { x: 490, y: 140, kind: "leaf", key: "1111 1111", path: 1, note: "0xff…: alone on the 1 side" },
  { x: 80, y: 250, kind: "leaf", key: "0000 0001", path: 2, note: "0x01…" },
  { x: 290, y: 250, kind: "leaf", key: "0100 0000", path: 2, note: "0x40…" },
];
const EDGES: [number, number, string][] = [[0, 1, "0"], [0, 2, "1"], [1, 3, "0"], [1, 4, "1"]];

/** The bits of a key, the ones that pick its path drawn strong. */
function keyBits(bits: string, path: number): string {
  let seen = 0, strong = "", rest = "";
  for (const ch of bits) {
    if (ch !== " " && seen < path) { strong += ch; seen++; } else rest += ch;
  }
  return `<tspan class="path">${strong}</tspan>${escape(rest)}`;
}

/** Lesson 6.1's trie: branches and leaves, the bits that sort the keys, the root on top. */
export function stateTrie(): string {
  const W = 130, H = 40;
  const parts = EDGES.map(([a, b, bit]) => {
    const [from, to] = [TRIE[a], TRIE[b]];
    // a branch's edges start under its note, so the note stays clear
    const [x1, y1, x2, y2] = [from.x + W / 2, from.y + H + 26, to.x + W / 2, to.y];
    return `<line class="edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>` +
      `<text class="bit" x="${(x1 + x2) / 2 + (bit === "0" ? -14 : 14)}" y="${(y1 + y2) / 2 + 4}">${bit}</text>`;
  });
  for (const n of TRIE) {
    parts.push(
      `<rect class="${n.kind}" x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="6"/>`,
      `<text x="${n.x + W / 2}" y="${n.y + (n.key ? 17 : 25)}">${n.kind}</text>`,
    );
    if (n.key) parts.push(`<text class="key" x="${n.x + W / 2}" y="${n.y + 33}">${keyBits(n.key, n.path!)}</text>`);
    parts.push(`<text class="note" x="${n.x + W / 2}" y="${n.y + H + 18}">${escape(n.note)}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 320" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">
<style>
  text { fill: #3c3c43; text-anchor: middle; }
  .note { fill: #67676c; font-size: 12px; }
  .key { fill: #67676c; font-size: 13px; }
  .path { fill: #d14d1e; font-weight: bold; }
  .bit { fill: #5b8def; font-weight: bold; }
  .edge { stroke: #9a9aa0; stroke-width: 1.5; }
  .branch { fill: #e8f0fe; stroke: #5b8def; stroke-width: 1.5; }
  .leaf { fill: #e6f6ef; stroke: #3fa97a; stroke-width: 1.5; }
  @media (prefers-color-scheme: dark) {
    text { fill: #dfdfd6; }
    .note, .key { fill: #a8a8a0; }
    .path { fill: #ff8c5a; }
    .bit { fill: #7aa2f7; }
    .edge { stroke: #6b6b72; }
    .branch { fill: #1e2a44; stroke: #7aa2f7; }
    .leaf { fill: #1b3329; stroke: #4fc08d; }
  }
</style>
${parts.join("\n")}
</svg>
`;
}

/** Z (GP §6): outside in. The first, the last, the second, the second to last, ... */
function outsideIn<T>(items: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < items.length; i++) out.push(i % 2 === 0 ? items[i / 2] : items[items.length - 1 - (i - 1) / 2]);
  return out;
}

/** Lesson 8.4's lottery on tiny (E = 12, Y = 10): the close, the winners, their seats, outside in. */
export function ticketContest(): string {
  const E = 12, Y = 10, CELL = 46, PITCH = 52, X0 = 21;
  const x = (i: number) => X0 + i * PITCH;
  const seats = outsideIn([...Array(E).keys()]); // slot s of the next epoch holds ticket seats[s]
  const parts: string[] = [
    `<text class="row" x="${X0}" y="24">this epoch: tickets enter in slots 0 to ${Y - 1}</text>`,
    `<text class="row" x="${X0}" y="138">the ${E} winners, sorted by id: t0 is the lowest, the best</text>`,
    `<text class="row" x="${X0}" y="326">the next epoch: each slot's sealer, outside in</text>`,
  ];
  for (let i = 0; i < E; i++) {
    parts.push(
      `<rect class="${i < Y ? "open" : "closed"}" x="${x(i)}" y="34" width="${CELL}" height="34" rx="5"/>`,
      `<text x="${x(i) + CELL / 2}" y="56">${i}</text>`,
      `<rect class="ticket" x="${x(i)}" y="148" width="${CELL}" height="34" rx="5"/>`,
      `<text x="${x(i) + CELL / 2}" y="170">t${i}</text>`,
      `<line class="seat" x1="${x(i) + CELL / 2}" y1="182" x2="${x(seats.indexOf(i)) + CELL / 2}" y2="242"/>`,
      `<rect class="slot" x="${x(i)}" y="242" width="${CELL}" height="34" rx="5"/>`,
      `<text x="${x(i) + CELL / 2}" y="264">t${seats[i]}</text>`,
      `<text class="small" x="${x(i) + CELL / 2}" y="294">${i}</text>`,
    );
  }
  const close = x(Y) - (PITCH - CELL) / 2;
  parts.push(
    `<line class="close" x1="${close}" y1="28" x2="${close}" y2="76"/>`,
    `<text class="note" x="${X0}" y="92">at the dashed line, Y = ${Y}, the lottery closes:</text>`,
    `<text class="note" x="${X0}" y="108">the block that crosses it carries the tickets mark</text>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 336" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">
<style>
  text { fill: #3c3c43; text-anchor: middle; }
  .row { text-anchor: start; font-size: 13px; fill: #3c3c43; }
  .note { fill: #c2410c; font-size: 12px; text-anchor: start; }
  .small { fill: #67676c; font-size: 11px; }
  .open { fill: #e8f0fe; stroke: #5b8def; stroke-width: 1.5; }
  .closed { fill: none; stroke: #9a9aa0; stroke-width: 1.5; stroke-dasharray: 4 3; }
  .ticket { fill: #fdf3e1; stroke: #d39b2a; stroke-width: 1.5; }
  .slot { fill: #e6f6ef; stroke: #3fa97a; stroke-width: 1.5; }
  .seat { stroke: #9a9aa0; stroke-width: 1.2; }
  .close { stroke: #c2410c; stroke-width: 2; stroke-dasharray: 5 3; }
  @media (prefers-color-scheme: dark) {
    text, .row { fill: #dfdfd6; }
    .note { fill: #ff9a5c; }
    .small { fill: #a8a8a0; }
    .open { fill: #1e2a44; stroke: #7aa2f7; }
    .closed { stroke: #6b6b72; }
    .ticket { fill: #3a2e14; stroke: #e0b04a; }
    .slot { fill: #1b3329; stroke: #4fc08d; }
    .seat { stroke: #6b6b72; }
    .close { stroke: #ff9a5c; }
  }
</style>
${parts.join("\n")}
</svg>
`;
}

/** Lesson 7.2's shuffle by hand (GP App. F): a b c d with the numbers 1 1 0 0, step by step. */
export function shuffleSteps(): string {
  const CELL = 40, PITCH = 46, LEFT = 128, PICKED = 384, ROW = 74, TOP = 58;
  const left = ["a", "b", "c", "d"];
  const numbers = [1, 1, 0, 0];
  const picked: string[] = [];
  const parts: string[] = [
    `<text class="row" x="${LEFT}" y="22">left</text>`,
    `<text class="row" x="${PICKED}" y="22">picked</text>`,
  ];
  numbers.forEach((n, step) => {
    const y = TOP + step * ROW;
    const l = left.length, at = n % l, last = l - 1;
    const x = (i: number, from = LEFT) => from + i * PITCH;
    parts.push(`<text class="row" x="16" y="${y + 22}">${n} mod ${l} = ${at}</text>`);
    left.forEach((item, i) => {
      const kind = i === at ? "pick" : i === last ? "last" : "item";
      parts.push(
        `<rect class="${kind}" x="${x(i)}" y="${y}" width="${CELL}" height="34" rx="5"/>`,
        `<text x="${x(i) + CELL / 2}" y="${y + 22}">${item}</text>`,
      );
    });
    if (at !== last) { // the last item moves into the gap the pick leaves
      const [from, to, top] = [x(last) + CELL / 2, x(at) + CELL / 2, y - 2];
      parts.push(
        `<path class="move" d="M ${from} ${top} C ${from} ${top - 24} ${to} ${top - 24} ${to} ${top - 6}"/>`,
        `<polygon class="tip" points="${to - 4},${top - 8} ${to + 4},${top - 8} ${to},${top}"/>`,
      );
    }
    parts.push(`<text class="small" x="${(x(3) + CELL + PICKED) / 2}" y="${y + 22}">→</text>`);
    picked.push(left[at]);
    left[at] = left[last];
    left.pop();
    picked.forEach((item, i) => {
      parts.push(
        `<rect class="picked" x="${x(i, PICKED)}" y="${y}" width="${CELL}" height="34" rx="5"/>`,
        `<text x="${x(i, PICKED) + CELL / 2}" y="${y + 22}">${item}</text>`,
      );
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 ${TOP + 4 * ROW - 22}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">
<style>
  text { fill: #3c3c43; text-anchor: middle; }
  .row { text-anchor: start; font-size: 13px; fill: #3c3c43; }
  .small { fill: #67676c; }
  .item { fill: #e8f0fe; stroke: #5b8def; stroke-width: 1.5; }
  .last { fill: #e8f0fe; stroke: #5b8def; stroke-width: 1.5; stroke-dasharray: 4 3; }
  .pick { fill: #fdf3e1; stroke: #d39b2a; stroke-width: 2; }
  .picked { fill: #e6f6ef; stroke: #3fa97a; stroke-width: 1.5; }
  .move { fill: none; stroke: #c2410c; stroke-width: 1.5; }
  .tip { fill: #c2410c; }
  @media (prefers-color-scheme: dark) {
    text, .row { fill: #dfdfd6; }
    .small { fill: #a8a8a0; }
    .item, .last { fill: #1e2a44; stroke: #7aa2f7; }
    .pick { fill: #3a2e14; stroke: #e0b04a; }
    .picked { fill: #1b3329; stroke: #4fc08d; }
    .move { stroke: #ff9a5c; }
    .tip { fill: #ff9a5c; }
  }
</style>
${parts.join("\n")}
</svg>
`;
}

/** Every diagram: where it goes, and what draws it. */
export const DIAGRAMS: Record<string, () => string> = {
  "02-codec/images/06-work-item-bytes.svg": workItemBytes,
  "06-state-and-merklization/images/01-state-trie.svg": stateTrie,
  "07-time-and-shuffling/images/02-shuffle-steps.svg": shuffleSteps,
  "08-safrole/images/04-ticket-contest.svg": ticketContest,
};

if (import.meta.main) {
  for (const [file, draw] of Object.entries(DIAGRAMS)) {
    writeFileSync(join(LESSONS, file), draw());
    console.log(`wrote lessons/${file}`);
  }
}
