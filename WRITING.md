# Writing a lesson

## How a part is made

1. **Build it in `reference/` first** (the reference client, a repository of its own):
   plain, simple code that keeps the Gray Paper's structure, tested against the official
   vectors, every step reporting through a `Trace` or a `Run`, with `OBS_CLIENT=reference`.
2. **Write the lessons from it**, in the shape below, snippets copied from the reference.
3. **Check**: `npm run verify` (the lessons rebuild a working client from nothing, with
   the stack up) and `npm run compare -- <last lesson> --dir reference` (the lessons give
   exactly the reference's code).

## Observability in every lesson

Every step a lesson builds also reports what it did: test runs through
`test/grafana.ts`, programs through `Run`, codec and later STF steps through a `Trace`.
A **Run** block that reports says so (`# prints: reported`), so verify checks the run
reached the stack. When a step needs a new panel, it goes in the same change onto the
theme dashboard for its Part (`observability/dashboards/gray-tutorial-*.json`; the title
names its Parts), in that Part's row, in lesson order. Test results and everything
reported stay on the overview, `gray-tutorial.json`, where the run links land. A new Part
joins a theme by widening that theme's title. `tools/dashboards.test.ts` checks that
every panel a lesson names is on its Part's dashboard, and that all of them share one
link bar and one pair of menus.

## Visual tutorial verification

A picture of what the reader's screen should show after a step: Grafana after a run, a
terminal, the website. Use one wherever a step's result is something to look at, and at
least for every new panel a lesson sends the reader to.

- **Just the picture**, right after the step it shows: no label and no words around it.
  The name is ours, for writing; the reader only sees a screenshot.
- **File** `lessons/NN-part/images/NN-what.png`, the first `NN` being the lesson's own
  number: `00-start/images/03-its-alive.png` is lesson 0.3's.
- **Taken** by `npm run screenshots`, from a real run of the lesson's own code: it
  follows the tutorial to the lesson (verify), runs it, and photographs one panel filtered
  to that lesson's run. A new picture is one line in `SHOTS` in `tools/screenshots.ts`
  (lesson, panel, and which of the lesson's runs if not its last), then the image line in
  the lesson. Rerun it when a panel or a lesson's output changes.
- **By hand** only for what the tool can't take, such as a whole dashboard (0.3's): cropped
  to what matters, the thing to look at outlined, nothing private (no home-folder paths,
  no tokens).
- **Alt text** says what the picture shows, for anyone who can't see it.
- **Under 1 MB.** `tools/lessons.test.ts` checks that every image a lesson shows exists,
  sits in its part's `images/`, has alt text and fits; and that every image is shown by
  some lesson.

## Where

`lessons/NN-part-name/NN-lesson-name.md`. The numbers give the order and the lesson's id
(`02-codec/03-...` is lesson 2.3). Each part folder has an `index.md` whose `# ` title is
the part's name and which links its lessons. `lessons/index.md` links every part and
lesson. `npm test` checks those links, and that each lesson ends with a link to the next.

## Shape

0. **New words**: right under the opening paragraph, every term the lesson uses for the
   first time (a JAM word, a Gray Paper symbol, a programming word a newcomer may not
   know), each with a one-line plain-English definition and a tiny concrete example. Add
   each one to `lessons/glossary.md` too (plain English, example, the symbol, the lesson).
   A word used before it's defined is a bug.
1. **What the Gray Paper says**: the rule, quoted or paraphrased, with its section
   (§11, *Refinement Context*; Appendix C). Check every quote against the 0.8.0 tex.
2. **The code**: test-driven development where it helps (the test, then the code), each
   in a labelled snippet. Call it that, test-driven development, never "test-first".
3. **Run**: the tests pass, the types check.
4. **lasair**, folded in `<details>`: the same rule in lasair's OCaml, quoted from the
   source (say when comments are trimmed), with a sentence on reading it.
5. A link to the next lesson.

**Foundations before complexity.** A beginner should never meet the hard parts first.
Inside a lesson: plain English and a concrete example first, the Gray Paper's notation
second, code third, and at most about three new ideas. Across the tutorial: the base rules
of every part through block import come first; cryptography, hardening and rare cases come
after, in parts marked as later.

**The first pass teaches the base rule.** A lesson shows the rule working in its simplest
form; edge cases, hostile input and fuzzer-level defences wait for the hardening pass,
listed in `HARDENING.md` (what, where, why, which case needs it). Don't confuse a learner
for the sake of 100% fuzz compatibility.

**Fun.** Friendly, playful, curious: short sentences, vivid analogies, the odd joke, a
little drama when a test goes red. Never at the cost of accuracy, never padding.

Plain words, no em-dashes. Explain why, not only what. Every claim about lasair, the
vectors or the Gray Paper is checked against the source before it is written.

## Labels

The line right above a code block, exactly one of:

```text
**New file** `src/x.ts`
**Add to** `src/x.ts`
**Replace in** `src/x.ts`
**Rewrite** `package.json`
**Run**
**Run, expect it to fail**
```

Paths are relative to `client/`. A Run block is ```` ```sh ````, runs in `client/`, and may
hold `# prints: text` or `# fails with: text` lines: the output must contain that text.

## Code style the tools rely on

- One import per line, at the top. A snippet's leading imports are merged into the
  file's (`tools/tangle.ts`).
- Top-level declarations start at column 0 with their comment directly above; their
  bodies are indented. **Replace in** swaps declarations by name; a type and a value of
  the same name are two declarations.
- No multi-line template literals that put text at column 0.
- Erasable TypeScript only (no `enum`, `namespace`, parameter properties): Node runs the
  files by stripping types.
- Field names as in the test vectors (`anchor_slot`).

## Before publishing a lesson

```sh
npm run verify        # every lesson, from an empty client
npm run check         # tools typecheck and tests, website build (dead links)
```

Then read the lesson rendered in VS Code's preview and on the website.
