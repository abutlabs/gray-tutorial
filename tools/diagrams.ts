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

/** Every diagram: where it goes, and what draws it. */
export const DIAGRAMS: Record<string, () => string> = {
  "02-codec/images/06-work-item-bytes.svg": workItemBytes,
};

if (import.meta.main) {
  for (const [file, draw] of Object.entries(DIAGRAMS)) {
    writeFileSync(join(LESSONS, file), draw());
    console.log(`wrote lessons/${file}`);
  }
}
