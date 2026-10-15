// What npm run compare leaves out: differences that change nothing your client does. Both
// sides are tidied the same way before they're compared (tools/compare.ts):
//  - spaces at the end of a line, and the newline at the end of the file;
//  - blank lines (compare's git diff skips a change that is only blank lines);
//  - how imports are written: one line per module, its names sorted, however your lines
//    group them, and no type that a value import from the same module already brings;
// and a file with the same declarations in another order says so in one line, not a diff.

import { blocks } from "./tangle.ts";

const NAMED = /^import (type )?\{([^}]*)\} from ("[^"]+"|'[^']+');?$/;
const IMPORT = /^import\s.*\S$/;

/** A file as compare reads it. A .ts file's imports go, tidied, where its first one was. */
export function tidyCode(text: string, path: string): string {
  let lines = text.split("\n").map((l) => l.trimEnd());
  if (path.endsWith(".ts")) {
    const at = lines.findIndex((l) => IMPORT.test(l));
    if (at >= 0) {
      const imports = tidyImports(lines.filter((l) => IMPORT.test(l)));
      lines = lines.filter((l) => !IMPORT.test(l));
      lines.splice(at, 0, ...imports);
    }
  }
  while (lines.length > 0 && lines.at(-1) === "") lines.pop();
  return lines.join("\n") + "\n";
}

/** Imports one line per module and kind, names sorted, a value's type dropped from `import type`. */
function tidyImports(imports: string[]): string[] {
  const named = new Map<string, Set<string>>(); // "type|module" or "|module" → names
  const other = new Set<string>(); // default, namespace and bare imports, as written
  for (const line of imports) {
    const m = NAMED.exec(line);
    if (!m) { other.add(line.replace(/;?$/, ";")); continue; }
    const key = `${m[1] ? "type" : ""}|${m[3]}`;
    const names = named.get(key) ?? new Set<string>();
    for (const n of m[2].split(",").map((s) => s.trim()).filter(Boolean)) names.add(n);
    named.set(key, names);
  }
  const out = [...other];
  for (const [key, names] of named) {
    const [kind, from] = key.split("|");
    const values = kind ? named.get(`|${from}`) : undefined;
    const kept = [...names].filter((n) => !values?.has(n)).sort();
    if (kept.length > 0) out.push(`import ${kind ? "type " : ""}{ ${kept.join(", ")} } from ${from};`);
  }
  return out.sort();
}

/** Whether two tidied files hold the same declarations and statements, in any order. */
export function sameInAnyOrder(a: string, b: string): boolean {
  const pieces = (text: string) => {
    const lines = text.split("\n");
    const found = blocks(lines);
    const before = lines.slice(0, found[0]?.start ?? lines.length);
    return [before, ...found.map((k) => lines.slice(k.start, k.end))]
      .map((p) => p.filter((l) => l !== "").join("\n"))
      .filter(Boolean)
      .sort();
  };
  const [x, y] = [pieces(a), pieces(b)];
  return x.length === y.length && x.every((p, i) => p === y[i]);
}
