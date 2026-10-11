import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LESSONS } from "./lessons.ts";
import { jamWords, misspellings, proseWords, speller } from "./spelling.ts";

const files = readdirSync(LESSONS, { recursive: true }).map(String).filter((f) => f.endsWith(".md")).sort();

test("prose only: no code, URLs, numbers, paths or names, and the line numbers kept", () => {
  const page = [
    "The wrods here.", // a typo: line 1
    "```ts",
    "const notprose = 1;",
    "```",
    "Some `inlinecode`, <code>htmlcode</code>, https://example.org/xyzzy and 0xff.",
    "A path …/client/src, a file HARDENING.md, X^mov, the PVM's JAM, VitePress.",
    "[linktext](./qwerty.md) and ![alttext](./img.png)",
  ].join("\n");
  const words = proseWords(page).map((w) => `${w.line}:${w.word}`);
  assert.deepEqual(words, [
    "1:The", "1:wrods", "1:here", "5:Some", "5:and", "6:path", "6:file", "6:the",
    "7:linktext", "7:and", "7:alttext",
  ]);
});

test("a word is known in either English, or as a JAM word, its plural or its 's", () => {
  const { known } = speller();
  for (const w of ["colour", "color", "serialization", "validators", "Validator", "lasair's", "trie's"]) {
    assert.ok(known(w), w);
  }
  for (const w of ["wrods", "valdiator", "preimgae"]) assert.ok(!known(w), w);
});

test("every word of the lessons' prose is spelled right (or add a JAM word to tools/words.txt)", () => {
  assert.deepEqual(misspellings(files), []);
});

test("every word in tools/words.txt is needed: no dictionary knows it, and a lesson uses it", () => {
  const { english } = speller();
  const used = new Set<string>();
  for (const f of files) {
    for (const { word } of proseWords(readFileSync(join(LESSONS, f), "utf8"))) {
      used.add(word.toLowerCase().replace(/'s$/, ""));
    }
  }
  for (const w of jamWords()) {
    assert.ok(!english(w), `${w}: the dictionaries know it, so tools/words.txt needn't`);
    assert.ok(used.has(w) || used.has(`${w}s`) || used.has(`${w}es`), `${w}: no lesson uses it`);
  }
});
