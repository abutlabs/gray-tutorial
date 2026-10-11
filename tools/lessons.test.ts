import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { LESSONS, ROOT, lessonsThrough, readParts } from "./lessons.ts";

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

// A part's page says what it builds on, so a reader starting there knows what to read
// first: the earlier parts whose files its code imports, besides Parts 0 to 2, which every
// part uses. And how to start there, as the Rust Book's introduction lets you skip: catch up
// to the last lesson before it.
test("each part's page says what it builds on and how to start there", () => {
  const madeIn = new Map<string, number>(); // a client file, and the part that made it
  for (const [i, p] of parts.entries()) {
    const used = new Set<number>();
    for (const l of p.lessons) {
      for (const s of l.steps) {
        if (s.kind !== "file") continue;
        if (!madeIn.has(s.path)) madeIn.set(s.path, p.number);
        for (const [, from] of s.code.matchAll(/from "(\.{1,2}\/[^"]+)"/g)) {
          const part = madeIn.get(join(dirname(s.path), from));
          if (part !== undefined && part > 2 && part !== p.number) used.add(part);
        }
      }
    }
    const index = readFileSync(join(LESSONS, p.dir, "index.md"), "utf8");
    if (i > 0) {
      const before = parts[i - 1].lessons.at(-1)!.id;
      assert.ok(index.includes(`\`npm run catch-up -- ${before}\``), `${p.dir}/index.md starts you at ${before}`);
    }
    if (p.number < 3) continue;
    const buildsOn = /^\*\*Builds on\*\*[\s\S]*?\n\n/m.exec(index)?.[0];
    assert.ok(buildsOn, `${p.dir}/index.md has a "**Builds on**" paragraph`);
    const linked = [...buildsOn.matchAll(/\[([^\]]+)\]\(\.\.\/(\d+-[^/)]+)\/index\.md\)/g)]
      .map(([, text, dir]) => `${dir}: ${text.replace(/\s+/g, " ")}`);
    const expected = parts.filter((q) => used.has(q.number)).map((q) => `${q.dir}: ${q.title}`);
    assert.deepEqual(linked, expected, `${p.dir}/index.md builds on the parts its code imports`);
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

// zsh, macOS's shell, doesn't read # as a comment unless told to: a pasted
// `npm install   # the tools` asks npm for packages named "#", "the" and "tools".
// A comment gets a line of its own (the website leaves those out when copying).
test("commands paste safely: no shell line has a comment after its command", () => {
  const docs = readdirSync(LESSONS, { recursive: true }).map(String).filter((f) => f.endsWith(".md"))
    .map((f) => join(LESSONS, f)).concat(["README.md", "WRITING.md", "HARDENING.md"].map((f) => join(ROOT, f)));
  const bad: string[] = [];
  for (const doc of docs) {
    let shell: boolean | undefined;
    for (const [i, line] of readFileSync(doc, "utf8").split("\n").entries()) {
      const fence = /^\s*```(\w*)/.exec(line);
      if (fence) shell = shell === undefined ? /^(sh|bash|zsh|shell)$/.test(fence[1]) : undefined;
      else if (shell && /^\s*[^#\s].*\s#/.test(line)) bad.push(`${doc.slice(ROOT.length)}:${i + 1}: ${line.trim()}`);
    }
  }
  assert.deepEqual(bad, []);
});

// Prose only: no code blocks, inline code, links, headings or HTML tags.
function prose(text: string): string {
  return text.replace(/```[\s\S]*?```|`[^`\n]*`|!?\[[^\]]*\]\([^)]*\)|^#.*$|<[^>\n]+>/gm, " ");
}
const pages = readdirSync(LESSONS, { recursive: true }).map(String).filter((f) => f.endsWith(".md"));
const HARDENING = "https://github.com/abutlabs/gray-tutorial/blob/main/HARDENING.md";
const lessonAt = new Map(parts.flatMap((p) => p.lessons).map((l) => [l.file, l.id]));

// As the Rust Book links every cross-reference: a reader can always follow one.
test("every mention of another lesson is a link to it", () => {
  const ids = new Set(lessonAt.values());
  const plain: string[] = [];
  for (const md of pages) {
    const text = prose(readFileSync(join(LESSONS, md), "utf8"));
    for (const [mention, id] of text.matchAll(/\b[Ll]essons?\s+(\d+\.\d+)/g)) {
      if (ids.has(id) && lessonAt.get(md) !== id) plain.push(`${md}: ${mention}`);
    }
  }
  assert.deepEqual(plain, []);
});

// And every part: "Part 8" links to Part 8's page, wherever it's mentioned.
test("every mention of a part is a link to its page", () => {
  const numbers = new Set(parts.map((p) => p.number));
  const plain: string[] = [];
  for (const md of pages) {
    const text = prose(readFileSync(join(LESSONS, md), "utf8"));
    for (const [mention, n] of text.matchAll(/\bParts?\s+(\d+)/g)) {
      if (numbers.has(Number(n))) plain.push(`${md}: ${mention}`);
    }
  }
  assert.deepEqual(plain, []);
});

// "The next lesson" links to it, and "the hardening pass" to HARDENING.md, where the
// shortcuts are listed: a reader can follow either.
test("the next lesson and the hardening pass are links, to the right place", () => {
  const all = parts.flatMap((p) => p.lessons);
  const problems: string[] = [];
  for (const md of pages) {
    const text = readFileSync(join(LESSONS, md), "utf8");
    for (const [plain] of prose(text).matchAll(/\b(next\s+lesson|hardening\s+pass)\b/gi)) problems.push(`${md}: ${plain}`);
    const at = all.findIndex((l) => l.file === md);
    for (const [, words, href] of text.matchAll(/\[([^\]]*\b(?:next\s+lesson|hardening\s+pass)\b[^\]]*)\]\(([^)]*)\)/gi)) {
      const want = /hardening/i.test(words) ? HARDENING : all[at + 1]?.file;
      const got = /^https:/.test(href) ? href : join(dirname(md), href);
      if (got !== want) problems.push(`${md}: [${words}] goes to ${href}`);
    }
  }
  assert.deepEqual(problems, []);
});

// New words and the glossary agree: every word a lesson's New words brings in has a
// glossary entry, and every glossary word is brought in by some lesson's New words, at or
// before the lesson its entry links (the one that builds it). An entry may join words
// ("Trie, leaf and branch"); each word counts on its own. Parts are checked as they're
// brought in line (backlog 25), until every part is.
const NEW_WORDS_CHECKED = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
const wordsOf = (term: string) => term.replace(/\s*\([^)]*\)/g, "").split(/,\s*|\s+and\s+/)
  .map((w) => w.trim().toLowerCase()).filter(Boolean);
const newWords = (text: string) => [...(/^## New words\n([\s\S]*?)(?=^## )/m.exec(text)?.[1] ?? "")
  .matchAll(/^- \*\*(.+?)\.\*\*/gm)].flatMap(([, term]) => wordsOf(term));
const checkedLessons = () => parts.filter((p) => NEW_WORDS_CHECKED.has(p.number)).flatMap((p) => p.lessons);

test("every new word is in the glossary, and every glossary word is brought in by a lesson", () => {
  const order = parts.flatMap((p) => p.lessons).map((l) => l.file);
  const broughtIn = new Map<string, number>(); // a word, and the first lesson to list it
  for (const [i, file] of order.entries()) {
    for (const w of newWords(readFileSync(join(LESSONS, file), "utf8"))) if (!broughtIn.has(w)) broughtIn.set(w, i);
  }
  const glossary = new Map<string, number>(); // a word, and the lesson its entry links
  for (const entry of readFileSync(join(LESSONS, "glossary.md"), "utf8").split(/\n\s*\n/)) {
    const term = /^\*\*(.+?)\.\*\*/.exec(entry)?.[1];
    const lesson = /\(\[\d+\.\d+\]\(\.\/([^)]+)\)\)\s*$/.exec(entry)?.[1];
    if (term) for (const w of wordsOf(term)) glossary.set(w, lesson ? order.indexOf(lesson) : -1);
  }
  const checked = new Set(checkedLessons().map((l) => l.file));
  const problems: string[] = [];
  for (const file of checked) {
    for (const w of newWords(readFileSync(join(LESSONS, file), "utf8"))) {
      if (!glossary.has(w)) problems.push(`${file}: "${w}" isn't in the glossary`);
    }
  }
  for (const [w, at] of glossary) {
    if (!checked.has(order[at])) continue;
    const from = broughtIn.get(w);
    if (from === undefined || from > at) problems.push(`glossary "${w}" (${order[at]}): no New words up to there`);
  }
  assert.deepEqual(problems, []);
});

// Where the body first uses a new word, it's in italics (WRITING.md), so the reader can
// match it to its definition. Bold is for labels, not words.
test("a new word is not bold where the body first uses it", () => {
  const bold: string[] = [];
  for (const l of checkedLessons()) {
    const text = readFileSync(join(LESSONS, l.file), "utf8");
    const body = prose(text.replace(/^## New words\n[\s\S]*?(?=^## )/m, (m) => m.replace(/[^\n]/g, " ")));
    for (const w of newWords(text).filter((w) => !w.startsWith("`"))) {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const first = new RegExp(`(?<![\\w-])${escaped}(?:s|es)?(?![\\w-])`, "i").exec(body);
      if (first && body.slice(first.index - 2, first.index) === "**") bold.push(`${l.file}: **${first[0]}**`);
    }
  }
  assert.deepEqual(bold, []);
});

// The code font means "exactly this code", and `bigint`s isn't code (the Book's style guide).
test("no word is half code: two `bigint` values, not two `bigint`s", () => {
  const mixed: string[] = [];
  for (const md of pages) {
    const text = readFileSync(join(LESSONS, md), "utf8").replace(/```[\s\S]*?```/g, " ");
    for (const [word] of text.matchAll(/`[^`\n]+`(?:s|es|ed|ing)\b/g)) mixed.push(`${md}: ${word}`);
  }
  assert.deepEqual(mixed, []);
});

// A practice goes by its common name, test-driven development (WRITING.md). "Write the test
// first" says what to do, and stays; "test first" or "test-first" as the practice's name goes.
test("test-driven development is called that, never test-first", () => {
  const named: string[] = [];
  for (const md of pages) {
    const text = readFileSync(join(LESSONS, md), "utf8");
    for (const [phrase] of text.matchAll(/(?<!\bthe\s+)\btest[-\s]+first\b/gi)) named.push(`${md}: ${phrase}`);
  }
  assert.deepEqual(named, []);
});

// The Book closes a chapter with what you learned, then why the next one comes next.
test("every lesson closes with What you have", () => {
  for (const file of lessonAt.keys()) {
    const sections = [...readFileSync(join(LESSONS, file), "utf8").replace(/```[\s\S]*?```/g, "")
      .matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    assert.equal(sections.at(-1), "What you have", `${file} closes with "## What you have"`);
  }
});

// Markdown forgives a heading glued to the line above it, and blank lines doubled, but the
// source reads worse for it, and an editor's outline can miss such a heading. Code aside.
test("every heading has a blank line above it, and no blank line is doubled", () => {
  const problems: string[] = [];
  for (const file of readdirSync(LESSONS, { recursive: true }).map(String).filter((f) => f.endsWith(".md"))) {
    const lines = readFileSync(join(LESSONS, file), "utf8").split("\n");
    let code = false;
    lines.forEach((line, i) => {
      if (line.startsWith("```")) code = !code;
      if (code || i === 0) return;
      if (/^#{1,6} /.test(line) && lines[i - 1].trim() !== "") problems.push(`${file}:${i + 1} glued: ${line}`);
      if (line.trim() === "" && lines[i - 1].trim() === "") problems.push(`${file}:${i + 1} a second blank line`);
    });
  }
  assert.deepEqual(problems, []);
});

// .vscode/launch.json hands the debugger over in 1.2 (WRITING.md): each program made up to
// then has a configuration, named for the lesson that makes it. Tests have only the two
// for any lesson: all of them, and the open file.
test("every program up to 1.2 has a debug configuration, named for its lesson", () => {
  const launch = JSON.parse(readFileSync(join(ROOT, ".vscode", "launch.json"), "utf8").replace(/^\s*\/\/.*$/gm, ""));
  const madeIn = new Map<string, string>();
  for (const l of lessonsThrough("1.2")) {
    for (const s of l.steps) if (s.kind === "file" && s.op === "new") madeIn.set(s.path, l.id);
  }
  const named: string[] = [];
  for (const c of launch.configurations as { name: string; program?: string }[]) {
    const lesson = /\((\d+\.\d+)\)$/.exec(c.name)?.[1];
    if (!lesson) continue; // one for any file, such as "Tests: the open file"
    const path = (c.program ?? "").replace("${workspaceFolder}/client/", "");
    assert.equal(madeIn.get(path), lesson, `"${c.name}" runs ${path}, which lesson ${lesson} makes`);
    named.push(path);
  }
  const programs = [...madeIn.keys()].filter((p) => p.startsWith("bin/"));
  assert.deepEqual(named.sort(), programs.sort());
});
