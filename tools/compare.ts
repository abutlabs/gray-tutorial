// Your client against the tutorial's, at any lesson.
//
//   npm run compare -- 2.3     how client/ differs from the client after lesson 2.3
//   npm run catch-up -- 2.3    make client/ the client after lesson 2.3; your files are
//                              first copied to .backup/, so nothing is lost
//   npm run compare -- 2.3 --dir reference
//                              the same comparison for another client folder
//
// node_modules and package-lock.json are left out of both.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { lessonsThrough, ROOT } from "./lessons.ts";
import { applyStep } from "./tangle.ts";

const dirFlag = process.argv.indexOf("--dir");
const CLIENT = join(ROOT, dirFlag > 0 ? process.argv[dirFlag + 1] : "client");
const EXPECTED = join(ROOT, ".expected");
const SKIP = new Set(["node_modules", "package-lock.json", ".DS_Store", ".gitkeep"]);

const write = process.argv.includes("--write");
const id = process.argv.slice(2).find((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--dir");
if (!id) {
  console.log(`usage: npm run ${write ? "catch-up" : "compare"} -- <lesson>, for example 2.3`);
  process.exit(2);
}

let lessons;
try {
  lessons = lessonsThrough(id);
} catch (e) {
  console.log((e as Error).message);
  process.exit(2);
}
rmSync(EXPECTED, { recursive: true, force: true });
mkdirSync(EXPECTED);
for (const lesson of lessons) {
  for (const step of lesson.steps) if (step.kind === "file") applyStep(EXPECTED, step);
}

if (write) {
  const backup = join(ROOT, ".backup", new Date().toISOString().replace(/[:.]/g, "-"));
  if (files(CLIENT).length > 0) {
    cpSync(CLIENT, backup, { recursive: true, filter: (src) => !SKIP.has(src.split("/").pop()!) });
    for (const name of readdirSync(CLIENT)) {
      if (!SKIP.has(name)) rmSync(join(CLIENT, name), { recursive: true, force: true });
    }
  }
  cpSync(EXPECTED, CLIENT, { recursive: true });
  console.log(`client/ is now the client after lesson ${id}: ${lessons.at(-1)!.title}.`);
  if (existsSync(backup)) console.log(`Your previous files are in ${relative(ROOT, backup)}/.`);
  console.log("Run npm install in client/ if the lesson added packages.");
  process.exit(0);
}

const mine = files(CLIENT), theirs = files(EXPECTED);
const all = [...new Set([...mine, ...theirs])].sort();
let differ = 0;
for (const f of all) {
  if (!mine.includes(f)) { console.log(`missing in your client: ${f}`); differ++; continue; }
  if (!theirs.includes(f)) { console.log(`only in your client: ${f}`); continue; }
  const d = spawnSync("git", ["diff", "--no-index", "--color=always", "--", join(relative(ROOT, CLIENT), f), join(".expected", f)], { cwd: ROOT, encoding: "utf8" });
  if (d.status !== 0 && d.status !== 1) throw new Error(`git diff failed on ${f}: ${d.stderr}`);
  if (d.status === 1) { process.stdout.write(d.stdout); differ++; }
}
console.log(differ
  ? `\n${differ} file(s) differ from the client after lesson ${id}. Lines with - are yours, + are the lesson's.`
  : `Your client matches the client after lesson ${id}.`);

function files(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p, base) : [relative(base, p)];
  });
}
