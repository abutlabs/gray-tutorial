// Follows the whole tutorial the way the reader does: from an empty client in
// .reference/, it applies every lesson's snippets in order and runs every Run block at
// the point the lesson runs it. A lesson is only correct if this passes.
//
//   npm run verify              every lesson
//   npm run verify -- 2.3       stop after lesson 2.3
//   npm run verify -- 2.1 2.3   apply everything, but only run lessons 2.1 to 2.3

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { readLessons, ROOT } from "./lessons.ts";
import { applyStep } from "./tangle.ts";

const REFERENCE = join(ROOT, ".reference");
const [from, to] = process.argv.length > 3 ? process.argv.slice(2) : [undefined, process.argv[2]];

const lessons = readLessons();
const last = to ? lessons.findIndex((l) => l.id === to) : lessons.length - 1;
const first = from ? lessons.findIndex((l) => l.id === from) : 0;
if (last < 0 || first < 0) throw new Error(`no lesson ${last < 0 ? to : from}`);

// Start from an empty client, but keep node_modules: npm install is then quick.
mkdirSync(REFERENCE, { recursive: true });
for (const name of readdirSync(REFERENCE)) {
  if (name !== "node_modules") rmSync(join(REFERENCE, name), { recursive: true, force: true });
}

let failures = 0, runs = 0;
const started = Date.now();
for (const [i, lesson] of lessons.slice(0, last + 1).entries()) {
  const running = i >= first;
  if (running) console.log(`\n${lesson.id} ${lesson.title}`);
  for (const step of lesson.steps) {
    const where = `lessons/${lesson.file}:${step.line}`;
    if (step.kind === "file") {
      try {
        applyStep(REFERENCE, step);
      } catch (e) {
        console.log(`  FAIL ${where}  ${(e as Error).message}`);
        process.exit(1); // later steps build on this one
      }
      continue;
    }
    if (!running) continue;
    runs++;
    const t = Date.now();
    const r = spawnSync("bash", ["-eo", "pipefail", "-c", step.command], { cwd: REFERENCE, encoding: "utf8" });
    const output = r.stdout + r.stderr;
    // "# prints: x" and "# fails with: x" lines tell the reader what to expect; the output must contain x
    const expected = [...step.command.matchAll(/^# (?:prints|fails with): (.+)$/gm)].map((m) => m[1].trim());
    const missing = expected.filter((x) => !output.includes(x));
    const ok = (r.status === 0) !== step.fails && missing.length === 0;
    const commands = step.command.split("\n").filter((l) => l.trim() && !l.startsWith("#")).join("; ");
    console.log(`  ${ok ? "ok  " : "FAIL"} ${commands}${step.fails ? "   (fails, as it should)" : ""}  ${((Date.now() - t) / 1000).toFixed(1)}s`);
    if (!ok) {
      failures++;
      console.log(`       at ${where}, exit ${r.status}${missing.length ? `, output lacks: ${missing.join(" | ")}` : ""}`);
      console.log(indent(output.trim().split("\n").slice(-30).join("\n")));
    }
  }
}
console.log(`\n${runs - failures}/${runs} run blocks passed, lessons ${lessons[first].id} to ${lessons[last].id}, ${((Date.now() - started) / 1000).toFixed(0)}s`);
process.exit(failures ? 1 : 0);

function indent(s: string): string {
  return s.split("\n").map((l) => "       " + l).join("\n");
}
