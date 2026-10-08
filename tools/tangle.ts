// Applies a lesson's file steps to a client directory, exactly as the reader is told to:
// new files, additions at the end, replaced declarations, rewritten files.
//
// "Add to" and "Replace in" need two conventions, which the lessons follow and the
// reader can see:
//  - Import lines at the top of a snippet go to the top of the file, merged with the
//    file's own imports. An import is a single line.
//  - A declaration (function, const, type, interface, class) starts at column 0, with
//    its comment directly above it, and runs until the next line that starts at
//    column 0 with a declaration, an import or a comment. Its body is indented.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Step } from "./lessons.ts";

type FileStep = Extract<Step, { kind: "file" }>;

export function applyStep(dir: string, step: FileStep): void {
  const path = join(dir, step.path);
  const exists = existsSync(path);
  if (step.op === "new" && exists) throw new Error(`${step.path} already exists (use Rewrite)`);
  if (step.op !== "new" && !exists) throw new Error(`${step.path} does not exist yet (use New file)`);
  const code = step.code.replace(/\s+$/, "") + "\n";
  if (step.op === "new" || step.op === "rewrite") {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, code);
    return;
  }
  const { imports, body } = splitImports(code);
  let lines = mergeImports(readFileSync(path, "utf8").replace(/\s+$/, "").split("\n"), imports);
  if (step.op === "add") {
    if (body.length) lines = [...lines, "", ...body];
  } else {
    const decls = blocks(body);
    const stray = body.findIndex((l, k) => l.trim() !== "" && k < (decls[0]?.start ?? body.length));
    if (stray >= 0) throw new Error(`${step.path}: a Replace snippet may only hold declarations: ${body[stray]}`);
    for (const decl of decls) {
      if (!decl.name) throw new Error(`${step.path}: a Replace snippet may only hold declarations: ${body[decl.start]}`);
      const target = blocks(lines).filter((b) => b.name === decl.name);
      if (target.length === 0) throw new Error(`${step.path}: no declaration named ${decl.name} to replace`);
      const first = target[0], last = target.at(-1)!;
      lines = [...lines.slice(0, first.start), ...body.slice(decl.start, decl.end), ...lines.slice(last.end)];
    }
  }
  writeFileSync(path, lines.join("\n") + "\n");
}

const IMPORT = /^import\s/;
const NAMED = /^import (type )?\{([^}]*)\} from ("[^"]+"|'[^']+');?$/;

function splitImports(code: string): { imports: string[]; body: string[] } {
  const lines = code.replace(/\s+$/, "").split("\n");
  let i = 0;
  while (i < lines.length && (IMPORT.test(lines[i]) || lines[i].trim() === "")) i++;
  const imports = lines.slice(0, i).filter((l) => l.trim() !== "");
  for (const l of imports) {
    if (!/;$/.test(l) && !/from\s+["'][^"']+["']$/.test(l)) throw new Error(`an import must fit on one line: ${l}`);
  }
  return { imports, body: lines.slice(i) };
}

function mergeImports(lines: string[], imports: string[]): string[] {
  const out = [...lines];
  for (const imp of imports) {
    const named = NAMED.exec(imp);
    const same = named && out.findIndex((l) => {
      const m = NAMED.exec(l);
      return m !== null && m[1] === named[1] && m[3] === named[3];
    });
    if (named && same !== null && same >= 0) {
      const have = names(NAMED.exec(out[same])![2]);
      const add = names(named[2]).filter((n) => !have.includes(n));
      out[same] = `import ${named[1] ?? ""}{ ${[...have, ...add].join(", ")} } from ${named[3]};`;
    } else if (!out.includes(imp)) {
      let last = -1;
      out.forEach((l, k) => { if (IMPORT.test(l)) last = k; });
      if (last >= 0) out.splice(last + 1, 0, imp);
      else out.splice(leadingComment(out), 0, imp, ...(out.length ? [""] : []));
    }
  }
  return out;
}

const names = (list: string) => list.split(",").map((n) => n.trim()).filter(Boolean);

/** Where a new first import goes: after the file's opening comment, if it has one. */
function leadingComment(lines: string[]): number {
  let i = 0;
  while (i < lines.length && /^\/\/|^\/\*|^ \*/.test(lines[i])) i++;
  return i > 0 && i < lines.length && lines[i].trim() === "" ? i + 1 : 0;
}

interface Block { name: string | null; start: number; end: number } // lines [start, end)

const STARTS = /^(export|import|const|let|var|function|async|type|interface|class|abstract|declare|enum)\b|^\/\/|^\/\*/;
const COMMENT = /^\/\/|^\/\*/;
const DECL = /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(function\*?|const|let|var|type|interface|class|abstract\s+class|enum)\s+([A-Za-z_$][\w$]*)/;

/** A declaration's name. Types live apart from values ("type WorkItem" and "const WorkItem" are two). */
function declName(line: string): string | null {
  const m = DECL.exec(line);
  if (!m) return null;
  return m[1] === "type" || m[1] === "interface" ? `type ${m[2]}` : m[2];
}

/** The file's top-level blocks; a block's end leaves out the blank lines after it. */
function blocks(lines: string[]): Block[] {
  const out: (Block & { commentOnly: boolean })[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!STARTS.test(lines[i])) continue;
    const cur = out.at(-1);
    const attached = cur && cur.commentOnly && lines[i - 1].trim() !== "";
    if (attached && COMMENT.test(lines[i])) continue; // the comment goes on
    if (attached) {
      cur.commentOnly = false; // the comment belongs to this declaration
      cur.name = declName(lines[i]);
      continue;
    }
    out.push({ name: declName(lines[i]), start: i, end: lines.length, commentOnly: COMMENT.test(lines[i]) });
  }
  for (let k = 0; k < out.length; k++) {
    let end = k + 1 < out.length ? out[k + 1].start : lines.length;
    while (end > out[k].start && lines[end - 1].trim() === "") end--;
    out[k].end = end;
  }
  return out.map(({ name, start, end }) => ({ name, start, end }));
}
