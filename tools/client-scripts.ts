// Every script the lessons give the client, `npm pkg set scripts.NAME="…"` in a Run block,
// in the order they're given, with the lesson that gives it: the table at the end of the
// demo page (lessons/demo.md). The table is plain markdown, like the scoreboard page's, so
// it prints with the rest; tools/client-scripts.test.ts keeps it the same as the lessons.
//
//   node tools/client-scripts.ts --write    rewrites the table in lessons/demo.md

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LESSONS, readParts } from "./lessons.ts";

export type ClientScript = { name: string; command: string; lesson: string; file: string };

export const DEMO = join(LESSONS, "demo.md");
const START = "<!-- every script: written by `node tools/client-scripts.ts --write`, from the lessons -->";
const END = "<!-- end of every script -->";

/** Each Part's scripts, in the lessons' order. */
export function clientScripts(): { part: string; scripts: ClientScript[] }[] {
  return readParts().map((p) => ({
    part: p.title,
    scripts: p.lessons.flatMap((l) => l.steps.flatMap((s) => s.kind !== "run" ? [] :
      [...s.command.matchAll(/^npm pkg set scripts\.([a-z0-9-]+)="([^"]*)"$/gm)]
        .map(([, name, command]) => ({ name, command, lesson: l.id, file: l.file })))),
  })).filter((p) => p.scripts.length > 0);
}

/** The table, a heading and a table for each Part, between its two markers. */
export function scriptsTable(): string {
  const parts = clientScripts().map(({ part, scripts }) => [
    `### ${part}`,
    "",
    "| Script | Runs | Lesson |",
    "| --- | --- | --- |",
    ...scripts.map((s) => `| \`${s.name}\` | \`${s.command}\` | [${s.lesson}](./${s.file}) |`),
  ].join("\n"));
  return [START, "", ...parts.flatMap((p) => [p, ""]), END].join("\n");
}

/** The table as demo.md has it now. */
export function tableInDemo(): string {
  const text = readFileSync(DEMO, "utf8");
  const from = text.indexOf(START), to = text.indexOf(END);
  if (from < 0 || to < 0) throw new Error(`${DEMO}: no table markers`);
  return text.slice(from, to + END.length);
}

if (process.argv[1] === import.meta.filename && process.argv.includes("--write")) {
  writeFileSync(DEMO, readFileSync(DEMO, "utf8").replace(tableInDemo(), scriptsTable()));
  console.log(`${DEMO}: ${clientScripts().flatMap((p) => p.scripts).length} scripts`);
}
