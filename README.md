# Gray Tutorial

Build a JAM client in TypeScript, one Gray Paper rule at a time.

The lessons explain the [Gray Paper](https://graypaper.com) (version 0.8.0) and give the
code in snippets. You assemble them into your own client in `client/`, run the tests at
every step, and finish with a block importer that agrees byte for byte with the
official test vectors.

## Start

```sh
nvm use               # Node 26, from .nvmrc
npm install           # the website and the tools
npm run vectors       # the official test vectors, about 1.4 GB, into vectors/
../observability/obs up   # the observability stack (abutlabs/observability, checked out beside this repo)
```

Your client reports every run to that stack from lesson 0.3 on: open Grafana at
http://localhost:3300, folder *gray-tutorial*, dashboard *Gray Tutorial: your client*.

Then read [lessons/index.md](lessons/index.md), in either of two ways:

- **In VS Code, on one screen.** Open this folder. Lessons open rendered (this repo's
  `.vscode/settings.json` does that). Press <kbd>⌘K</kbd> <kbd>V</kbd> on a lesson to keep it beside your
  code, and work in a terminal in `client/`.
- **In a browser.** `npm run site` serves the same lessons at http://localhost:5173, with
  search, copy buttons and dark mode.

## The repo

```
lessons/         the tutorial: one folder per part, plain Markdown
client/          your JAM client, built lesson by lesson: empty at the start, and
                 git-ignored, so it stays yours (`git init` inside it for a history)
observability/   the client's Grafana dashboard (the stack finds it by itself)
vectors/         the official test vectors, v0.8.0 of davxy/jam-test-vectors (npm run vectors)
tools/           how the lessons are checked
.vitepress/      the website, made from lessons/
reference/       not in this repo: the client the lessons are written from (a private
                 repo of its own, checked out here and ignored)
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run site` | the lessons as a website |
| `npm run compare -- 2.3` | how your `client/` differs from the client after lesson 2.3 |
| `npm run catch-up -- 2.3` | make `client/` the client after lesson 2.3 (yours is copied to `.backup/` first) |
| `npm run verify` | follow every lesson from an empty client in `.tangled/` and run every **Run** block (the stack must be up) |
| `npm run compare -- 2.3 --dir reference` | the same comparison for another client folder |
| `npm run check` | type-check and test the tools, and build the website (which fails on a broken link) |

## How the lessons are checked

A lesson's snippets carry a label line that says what to do with them (**New file**,
**Add to**, **Replace in**, **Rewrite**, **Run**). `tools/lessons.ts` reads those same lines,
`tools/tangle.ts` applies them to a client the way a reader would, and
`tools/verify.ts` runs the whole tutorial in order. A **Run** block can say what its
output must contain (`# prints: ...`, `# fails with: ...`), and verify checks that too.
So the instructions a reader follows and the ones that are tested are the same text.
[WRITING.md](WRITING.md) has the rules for writing a lesson.
