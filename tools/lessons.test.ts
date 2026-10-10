import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { LESSONS, readParts } from "./lessons.ts";

const parts = readParts();
const home = readFileSync(join(LESSONS, "index.md"), "utf8");

test("every lesson parses, with a title and a number", () => {
  assert.ok(parts.length > 0);
  for (const p of parts) for (const l of p.lessons) assert.match(l.id, /^\d+\.\d+$/, l.file);
});

test("the home page and each part's page link every lesson, titled as the lesson is", () => {
  for (const p of parts) {
    const index = readFileSync(join(LESSONS, p.dir, "index.md"), "utf8");
    assert.ok(home.includes(`](./${p.dir}/index.md)`), `the home page links ${p.dir}`);
    for (const l of p.lessons) {
      const name = l.file.slice(p.dir.length + 1);
      assert.ok(home.includes(`[${l.id} ${l.title}](./${l.file})`), `the home page links ${l.id} ${l.title}`);
      assert.ok(index.includes(`[${l.id} ${l.title}](./${name})`), `${p.dir}/index.md links ${l.id} ${l.title}`);
    }
  }
});

test("each lesson ends by pointing to the next one", () => {
  const all = parts.flatMap((p) => p.lessons);
  for (const [i, l] of all.slice(0, -1).entries()) {
    const text = readFileSync(join(LESSONS, l.file), "utf8");
    const next = all[i + 1];
    const target = next.file.split("/")[0] === l.file.split("/")[0] ? `./${next.file.split("/")[1]}` : `../${next.file.split("/")[0]}/index.md`;
    assert.ok(text.includes(`](${target})`), `${l.file} links the next lesson (${target})`);
  }
});

test("TypeScript snippet lines fit half a laptop screen: 100 characters, imports aside", () => {
  const long: string[] = [];
  for (const p of parts) for (const l of p.lessons) for (const s of l.steps) {
    if (s.kind !== "file" || !s.path.endsWith(".ts")) continue;
    s.code.split("\n").forEach((line, i) => {
      if (line.length > 100 && !line.startsWith("import ")) long.push(`${l.id} ${s.path} line ${i + 1}`);
    });
  }
  assert.deepEqual(long, []);
});

test("visual tutorial verification: every picture exists, is used, has alt text, fits", () => {
  const files = readdirSync(LESSONS, { recursive: true }).map(String);
  const shown = new Set<string>();
  for (const md of files.filter((f) => f.endsWith(".md"))) {
    const text = readFileSync(join(LESSONS, md), "utf8");
    for (const [, alt, src] of text.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)) {
      const path = join(LESSONS, dirname(md), src);
      const where = `${md}: ${src}`;
      assert.ok(alt.trim(), `${where} has alt text`);
      assert.match(src, /^\.\/images\/[^/]+$/, `${where} is in its part's images/ folder`);
      assert.equal(basename(src).slice(0, 2), basename(md).slice(0, 2), `${where} is named for its lesson`);
      assert.ok(existsSync(path), `${where} exists`);
      assert.ok(statSync(path).size < 1_000_000, `${where} is under 1 MB`);
      shown.add(path);
    }
  }
  for (const f of files.filter((f) => /\.(png|jpe?g|gif|webp|svg)$/i.test(f))) {
    assert.ok(shown.has(join(LESSONS, f)), `lessons/${f} is shown by a lesson`);
  }
});
