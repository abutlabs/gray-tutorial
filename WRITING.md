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

Every step a lesson builds also reports what it did: test runs through `test/grafana.ts`,
programs through `Run`, codec and later STF steps through a `Trace`. A **Run** block that
reports says so (`# prints: reported`, or the `reported ...` line in its Output block), so
verify checks the run reached the stack. When a step needs a new panel, it goes in the
same change onto the theme dashboard for its Part
(`observability/dashboards/gray-tutorial-*.json`; the title names its Parts), in that
Part's row, in lesson order. Test results and everything reported stay on the overview,
`gray-tutorial.json`, where the run links land. A new Part joins a theme by widening that
theme's title. `tools/dashboards.test.ts` checks that every panel a lesson names is on its
Part's dashboard, and that all of them share one link bar and one pair of menus.

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

**Addresses stay.** The site is public, so a page's address keeps working once it's
published, as the Rust Book keeps its old chapters' addresses. A new page: add its address
to `PUBLISHED` in `.vitepress/urls.ts`. A page that moves or is renumbered: add `"old":
"new"` to `MOVED`, and the build leaves a page at the old address that sends the reader on,
to the same section. A renamed heading: put `<a id="old-id"></a>` on the line above it.
`tools/urls.test.ts` checks all three, and that every `#section` link lands on a heading.

## Shape

0. **New words**: right under the opening paragraph, every term the lesson uses for the
   first time (a JAM word, a Gray Paper symbol, a programming word a newcomer may not
   know), each with a one-line plain-English definition and a tiny concrete example. Add
   each one to `lessons/glossary.md` too (plain English, example, the symbol, the lesson).
   A word used before it's defined is a bug.
1. **What the Gray Paper says**: the rule, quoted or paraphrased, with its section
   (§11, *Refinement Context*; Appendix C). Check every quote against the 0.8.0 tex.
2. **The code**: test-driven development where it helps (the test, then the code), each
   in a labelled snippet.
3. **Run**: the tests pass, the types check.
4. **lasair**, folded in `<details>`: the same rule in lasair's OCaml, quoted from the
   source (say when comments are trimmed), with a sentence on reading it.
5. **What you have**, the last section: what works now and which vectors pass, then one
   sentence on why the next lesson comes next, then the link to it.

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

**Honest, not flattering.** Never praise the Gray Paper or JAM ("it thinks of
everything"). The Gray Paper is still being improved, and new versions change rules:
explain why a rule exists, and when one looks odd or likely to change, say so plainly.
Use the common software-engineering name for a practice (test-driven development), never
a coined one.

Plain words, no em-dashes. Explain why, not only what. Every claim about lasair, the
vectors or the Gray Paper is checked against the source before it is written.

## Lessons from the Rust Book

*The Rust Programming Language* (the Book, doc.rust-lang.org/book) is our model for
teaching. What we take from it, each with its reason. "Checked" means a test enforces it.

- **Say where the lesson goes.** The opening paragraph says what the reader will have at
  the end, and why it's worth having. *Why:* knowing the destination tells you which details
  matter.
- **Close the loop.** *What you have* is the last section, and it ends with one sentence on
  why the next lesson comes next (checked). *Why:* a summary fixes what was learned, and the
  bridge makes the order feel earned.
- **Show the real output.** After a **Run**, show what the terminal prints, trimmed to what
  matters, and say what changes from run to run (ids, times, durations). The first time a
  tool's output appears, walk through it line by line. *Why:* readers compare their screen
  with the page, and a description of output can't be compared.
- **Read the red together.** When a test fails on purpose, show the failure and point at
  the line to read: which test, expected, actual. *Why:* reading errors is a skill to teach,
  not to assume.
- **Red for the right reason.** Where the rule is the point of the lesson, give a stub first
  (the function exists and answers wrongly), so the first red is the rule failing, not a
  missing file. *Why:* "Cannot find module" proves only that a file is missing; a failed
  assertion proves the test tests the rule.
- **Steps in words before code.** When a rule has several steps, number them in plain
  English between *What the Gray Paper says* and the code. *Why:* the reader holds the plan
  while reading the code.
- **Quote what you explain.** After a long snippet, quote again the two to four lines the
  text explains, where it explains them. *Why:* nobody has to scroll back to find "the line
  with `#at`".
- **Link every reference.** "lesson 2.3" is always a link (checked). When a lesson uses
  something a later one explains, give the minimum ("for now, all you need to know is ...")
  and link forward. *Why:* the tutorial reads as one connected whole, and a promise never
  leaves the reader stuck.
- **Italics for a new word.** In the body, a term from *New words* is in italics where it's
  first used. *Why:* the reader can match the use to the definition.
- **Tangents in a note.** A side story (why `bigint`, how Node strips types) goes in a
  `> [!NOTE]` box. *Why:* the main line reads straight, and the curious still find it.
- **Name the simple road.** Where a lesson takes the simple way on purpose, say so, and link
  where it's revisited (`HARDENING.md`). *Why:* readers trust a tutorial that names its
  shortcuts.
- **Refactor in the open.** When the client's structure changes, name what hurts first, then
  change it in small *Replace in* steps, each followed by a **Run**. *Why:* the reader learns
  why the shape changes, and is never more than one step from green.
- **Rules of thumb.** Where judgement matters (a bad block is an error the code returns; a
  bug in our code throws), state the rule of thumb in a sentence. *Why:* the Book teaches
  when, not only how.
- **Words and code stay apart.** Two `bigint` values, never two `bigint`s (checked). A
  function is named without parentheses: "`slotAt` returns", not "`slotAt()` returns".
  *Why:* the code font means exactly this code, and `bigint`s isn't code.

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

**Output.** A ```` ```text ```` block right after a Run block is that run's output, as the
Rust Book shows every run's; the website gives it an *Output* tab. verify checks it
against the real run (`tools/output.ts`): its lines in order and one after another; a
line `...` marks a cut (at the start and end too, if the output goes on); `…` inside a
line stands for anything; times, durations, run ids and paths into the client are masked
on both sides. Paste real output from `.verify-output/<lesson>/line-<n>.txt`, which verify
writes for every run. A Run with an Output block needs no `# prints:` lines, so its block
is pure commands.

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

`verify` follows every lesson from an empty client; `check` typechecks and tests the
tools and builds the website (which finds dead links).

```sh
npm run verify
npm run check
```

Then read the lesson rendered in VS Code's preview and on the website.
