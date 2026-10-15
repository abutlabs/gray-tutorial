import { test } from "node:test";
import assert from "node:assert/strict";
import { sameInAnyOrder, tidyCode } from "./tidy-code.ts";

const same = (a: string, b: string, path = "a.ts") => tidyCode(a, path) === tidyCode(b, path);

test("no newline at the end, or spaces at a line's end, change nothing", () => {
  assert.ok(same("const a = 1;\n  \nconst b = 2;", "const a = 1;\n\nconst b = 2;\n"));
  assert.ok(same('{\n  "a": 1\n}', '{\n  "a": 1\n}\n', "package.json"));
});

test("imports are the names each module gives, however the lines group them", () => {
  const split = 'import { blob, hash } from "../src/codec/codec.ts";\nimport { record } from "../src/codec/codec.ts";\nimport type { Bytes } from "../src/bytes.ts";\n\ntest();';
  const merged = 'import type { Bytes } from "../src/bytes.ts";\nimport { record, blob, hash } from "../src/codec/codec.ts";\n\ntest();';
  assert.ok(same(split, merged));
  // a value import brings its type: import type { Bytes } beside import { Bytes } says nothing more
  assert.ok(same('import { Bytes } from "./b.ts";\nimport type { Bytes } from "./b.ts";\nx();', 'import { Bytes } from "./b.ts";\nx();'));
});

test("a name imported or not is a real difference", () => {
  assert.ok(!same('import { a } from "./m.ts";\nx();', 'import { a, b } from "./m.ts";\nx();'));
  assert.ok(!same('import { a } from "./m.ts";\nx();', 'import type { a } from "./m.ts";\nx();'));
});

test("the same declarations in another order are told apart from a change", () => {
  const first = "const NATURALS = [1, 2];\n\ntest(\"one\", () => {\n  f(NATURALS);\n});\n";
  const second = "test(\"one\", () => {\n  f(NATURALS);\n});\n\nconst NATURALS = [1, 2];\n";
  assert.ok(!same(first, second));
  assert.ok(sameInAnyOrder(tidyCode(first, "a.ts"), tidyCode(second, "a.ts")));
  assert.ok(!sameInAnyOrder(tidyCode(first, "a.ts"), tidyCode(second.replace("[1, 2]", "[1, 3]"), "a.ts")));
});
