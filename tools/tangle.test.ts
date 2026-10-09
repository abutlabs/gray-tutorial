import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyStep } from "./tangle.ts";
import type { FileOp } from "./lessons.ts";

function run(start: string | null, op: FileOp, code: string): string {
  const dir = mkdtempSync(join(tmpdir(), "tangle-"));
  if (start !== null) writeFileSync(join(dir, "a.ts"), start);
  applyStep(dir, { kind: "file", op, path: "a.ts", code, line: 1 });
  return readFileSync(join(dir, "a.ts"), "utf8");
}

const file = `// A file.

import { a } from "./a.ts";
import type { T } from "./t.ts";

/** One. */
export function one(): number {
  return 1;
}

// Two, with a comment
// over two lines.
export const two = 2;

export type Pair = {
  x: number;
};
`;

test("a new file is written as given", () => {
  assert.equal(run(null, "new", "export const x = 1;\n\n"), "export const x = 1;\n");
});

test("a new file may not exist yet, and other steps need one", () => {
  assert.throws(() => run("", "new", "x"), /already exists/);
  assert.throws(() => run(null, "add", "x"), /does not exist/);
  assert.throws(() => run(null, "replace", "x"), /does not exist/);
});

test("add puts the code at the end, after one blank line", () => {
  assert.equal(run(file, "add", "export const three = 3;"), file + "\nexport const three = 3;\n");
});

test("add merges a snippet's imports with the file's", () => {
  const out = run(file, "add", `import { b } from "./a.ts";\nimport type { U } from "./t.ts";\nimport { c } from "./c.ts";\n\nexport const z = b;`);
  assert.match(out, /^import \{ a, b \} from "\.\/a\.ts";$/m);
  assert.match(out, /^import type \{ T, U \} from "\.\/t\.ts";$/m);
  assert.match(out, /^import type \{ T, U \} from "\.\/t\.ts";\nimport \{ c \} from "\.\/c\.ts";$/m);
  assert.ok(out.endsWith("\nexport const z = b;\n"));
});

test("a value import and a type import from one module stay apart", () => {
  const out = run(`import type { T } from "./t.ts";\n\nconst k = 1;\n`, "add", `import { v } from "./t.ts";\n\nconst m = v;`);
  assert.match(out, /^import type \{ T \} from "\.\/t\.ts";\nimport \{ v \} from "\.\/t\.ts";$/m);
});

test("the first import goes after the file's opening comment", () => {
  const out = run(`// Header.\n\nexport const k = 1;\n`, "add", `import { v } from "./v.ts";\n\nexport const m = v;`);
  assert.equal(out, `// Header.\n\nimport { v } from "./v.ts";\n\nexport const k = 1;\n\nexport const m = v;\n`);
});

test("replace swaps a declaration with its comment, and keeps the rest", () => {
  const out = run(file, "replace", "/** One, now two. */\nexport function one(): number {\n  return 2;\n}");
  assert.equal(out, file.replace("/** One. */\nexport function one(): number {\n  return 1;\n}", "/** One, now two. */\nexport function one(): number {\n  return 2;\n}"));
});

test("replace takes a multi-line // comment with its declaration", () => {
  const out = run(file, "replace", "// Two is three now.\nexport const two = 3;");
  assert.ok(out.includes("\n// Two is three now.\nexport const two = 3;\n\nexport type Pair"));
  assert.ok(!out.includes("over two lines"));
});

test("replace handles several declarations, types too", () => {
  const out = run(file, "replace", "export type Pair = { x: number; y: number };\n\nexport const two = 22;");
  assert.ok(out.includes("export type Pair = { x: number; y: number };\n"));
  assert.ok(out.includes("// Two, with a comment\n// over two lines.\nexport const two = 2;") === false);
  assert.ok(out.includes("\nexport const two = 22;\n"));
});

test("a type and a value of the same name are two declarations", () => {
  const start = "export const W = 1;\nexport type W = number;\n\nexport const after = 0;\n";
  assert.equal(run(start, "replace", "export const W = 2;"), "export const W = 2;\nexport type W = number;\n\nexport const after = 0;\n");
  assert.equal(run(start, "replace", "export type W = string;\nexport const W = 3;"), "export const W = 3;\nexport type W = string;\n\nexport const after = 0;\n");
});

test("replace stops at a top-level statement, such as a test, after the declaration", () => {
  const start = "function f(): number {\n  return 1;\n}\n\ntest(\"f\", () => {\n  f();\n});\n";
  const out = run(start, "replace", "function f(): number {\n  return 2;\n}");
  assert.equal(out, start.replace("return 1", "return 2"));
});

test("a statement right under a declaration, with no blank line, goes with it", () => {
  const start = "const x = 1;\nif (x) {\n  go();\n}\n\nlater();\n";
  const out = run(start, "replace", "const x = 2;\nif (x > 1) {\n  go();\n}");
  assert.equal(out, "const x = 2;\nif (x > 1) {\n  go();\n}\n\nlater();\n");
});

test("replace needs a declaration of that name", () => {
  assert.throws(() => run(file, "replace", "export const nine = 9;"), /no declaration named nine/);
  assert.throws(() => run(file, "replace", "console.log(1);"), /only hold declarations/);
});

test("an import must be one line", () => {
  assert.throws(() => run(file, "add", `import {\n  b,\n} from "./a.ts";\n\nconst q = 1;`), /one line/);
});
