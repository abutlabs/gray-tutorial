// Follows the whole tutorial the way the reader does: from an empty client in
// .tangled/, it applies every lesson's snippets in order and runs every Run block at
// the point the lesson runs it. A lesson is only correct if this passes.
//
//   npm run verify              every lesson
//   npm run verify -- 2.3       stop after lesson 2.3
//   npm run verify -- 2.1 2.3   apply everything, but only run lessons 2.1 to 2.3

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readLessons, ROOT } from "./lessons.ts";
import { checkOutput, tidy } from "./output.ts";
import { applyStep } from "./tangle.ts";

const TANGLED = join(ROOT, ".tangled");
// every run's output, tidied (tools/output.ts), for writers to paste into Output blocks
const OUTPUTS = join(ROOT, ".verify-output");
const [from, to] = process.argv.length > 3 ? process.argv.slice(2) : [undefined, process.argv[2]];

const lessons = readLessons();
const last = to ? lessons.findIndex((l) => l.id === to) : lessons.length - 1;
const first = from ? lessons.findIndex((l) => l.id === from) : 0;
if (last < 0 || first < 0) throw new Error(`no lesson ${last < 0 ? to : from}`);

// The lessons report every run to the observability stack, so it must be up. The
// tutorial's own runs report as client "tutorial-check", apart from the reader's.
const LOKI = process.env.OBS_LOKI ?? "http://127.0.0.1:3100";
const up = await fetch(`${LOKI}/ready`, { signal: AbortSignal.timeout(3000) }).then((r) => r.ok, () => false);
if (!up) {
  console.log(`the observability stack is not running (no Loki at ${LOKI}): ../observability/obs up`);
  process.exit(1);
}
const env = { ...process.env, OBS_CLIENT: "tutorial-check" };

// Start from an empty client, but keep node_modules: npm install is then quick.
mkdirSync(TANGLED, { recursive: true });
for (const name of readdirSync(TANGLED)) {
  if (name !== "node_modules") rmSync(join(TANGLED, name), { recursive: true, force: true });
}
// npm's record of what node_modules held last time: kept, it can make npm install skip a
// package a lesson has just added to package.json
rmSync(join(TANGLED, "node_modules", ".package-lock.json"), { force: true });

let failures = 0, runs = 0;
const started = Date.now();
for (const [i, lesson] of lessons.slice(0, last + 1).entries()) {
  const running = i >= first;
  if (running) console.log(`\n${lesson.id} ${lesson.title}`);
  if (running) rmSync(join(OUTPUTS, lesson.id), { recursive: true, force: true }); // none left from an older run
  for (const step of lesson.steps) {
    const where = `lessons/${lesson.file}:${step.line}`;
    if (step.kind === "file") {
      try {
        applyStep(TANGLED, step);
      } catch (e) {
        console.log(`  FAIL ${where}  ${(e as Error).message}`);
        process.exit(1); // later steps build on this one
      }
      continue;
    }
    if (!running) continue;
    runs++;
    const t = Date.now();
    const r = spawnSync("bash", ["-eo", "pipefail", "-c", step.command], { cwd: TANGLED, env, encoding: "utf8" });
    const output = r.stdout + r.stderr;
    // "# prints: x" and "# fails with: x" lines tell the reader what to expect; the output must contain x
    const expected = [...step.command.matchAll(/^# (?:prints|fails with): (.+)$/gm)].map((m) => m[1].trim());
    const missing = expected.filter((x) => !output.includes(x));
    const wrongOutput = step.output === undefined ? null : checkOutput(step.output, output);
    mkdirSync(join(OUTPUTS, lesson.id), { recursive: true });
    writeFileSync(join(OUTPUTS, lesson.id, `line-${step.line}.txt`), output.split("\n").map(tidy).join("\n"));
    const ok = (r.status === 0) !== step.fails && missing.length === 0 && wrongOutput === null;
    const commands = step.command.split("\n").filter((l) => l.trim() && !l.startsWith("#")).join("; ");
    console.log(`  ${ok ? "ok  " : "FAIL"} ${commands}${step.fails ? "   (fails, as it should)" : ""}  ${((Date.now() - t) / 1000).toFixed(1)}s`);
    if (!ok) {
      failures++;
      console.log(`       at ${where}, exit ${r.status}${missing.length ? `, output lacks: ${missing.join(" | ")}` : ""}`);
      if (wrongOutput) console.log(indent(`its Output block: ${wrongOutput}`));
      console.log(indent(output.trim().split("\n").slice(-30).join("\n")));
    }
  }
}
console.log(`\n${runs - failures}/${runs} run blocks passed, lessons ${lessons[first].id} to ${lessons[last].id}, ${((Date.now() - started) / 1000).toFixed(0)}s`);
process.exit(failures ? 1 : 0);

function indent(s: string): string {
  return s.split("\n").map((l) => "       " + l).join("\n");
}
