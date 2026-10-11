// The whole file after each "Add to" and "Replace in" snippet, for the website's fold under
// the snippet ("where does this go?"). It follows the lessons' file steps with tangle, as
// verify does, and marks the lines the step changed.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readLessons } from "./lessons.ts";
import { applyStep } from "./tangle.ts";

export interface Snapshot {
  path: string; // relative to client/
  lines: string[]; // the whole file after the step
  changed: Set<number>; // indexes into lines: what the step added or changed
}

/** Every snapshot, by "<lesson file>:<label line>" (the label's line, from 1). */
export function wholeFiles(): Map<string, Snapshot> {
  const dir = mkdtempSync(join(tmpdir(), "gray-tutorial-snapshots-"));
  const out = new Map<string, Snapshot>();
  try {
    for (const lesson of readLessons()) {
      for (const step of lesson.steps) {
        if (step.kind !== "file") continue;
        const path = join(dir, step.path);
        const before = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
        applyStep(dir, step);
        if (step.op !== "add" && step.op !== "replace") continue;
        const lines = readFileSync(path, "utf8").split("\n");
        out.set(`${lesson.file}:${step.line}`, { path: step.path, lines, changed: changedLines(before, lines) });
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return out;
}

/** The lines of `after` that aren't part of a longest common subsequence with `before`. */
export function changedLines(before: string[], after: string[]): Set<number> {
  const n = before.length, m = after.length;
  const common = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      common[i][j] = before[i] === after[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }
  const changed = new Set<number>();
  let i = 0, j = 0;
  while (j < m) {
    if (i < n && before[i] === after[j]) {
      i++;
      j++;
    } else if (i < n && common[i + 1][j] >= common[i][j + 1]) {
      i++;
    } else {
      changed.add(j++);
    }
  }
  return changed;
}
