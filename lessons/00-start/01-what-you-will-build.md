# What you will build

JAM is a blockchain protocol defined by one document, the **Gray Paper** (GP). This
tutorial builds a JAM client in TypeScript: from an empty folder to a program that
imports JAM blocks exactly as the Gray Paper says, checked byte for byte against the
official test vectors.

You write every line yourself, by typing or pasting the snippets. By the end you will
have read most of the Gray Paper, one rule at a time, with code that runs beside it.

## One equation

Section 4 of the Gray Paper (Overview) opens with the line the whole protocol hangs
from:

```text
σ′ ≡ Υ(σ, B)
```

σ (sigma) is the state of the chain before a block, B is the block, and σ′ (sigma
prime) is the state after it. Υ (upsilon) is the **state-transition function**. A
blockchain, the Gray Paper says, is a genesis state plus this function. Nearly
everything else in the paper defines a piece of Υ: how a block is encoded, how the
state splits into parts and how each part changes, how a service's code runs inside
JAM's virtual machine.

A program that computes Υ is a **block importer**. Given a state and a block, it says
whether the block is valid and, if it is, what the new state is. A block importer is
the first milestone (M1) of a JAM implementation, and it is what you will have at the
end. Later parts can go further (networking, making blocks) on the same code.

## The road

| Part | You build | Gray Paper |
| --- | --- | --- |
| 0 · Start | the project, the observability stack, the JAM clock | §4 |
| 1 · Bytes and numbers | hex, numbers too big for JavaScript | §3 |
| 2 · The codec | integer encodings, `Codec<T>`, the first test vectors | App. C |
| 3 · Work and reports | work-packages, work-digests, work-reports | §11, §14 |
| 4 · Blocks | extrinsics, header, block | §5 |
| 5 · Hashing and signatures | Blake2b, Keccak, Ed25519 | §3 |
| 6 · State and Merklization | the state, its trie, the state root | §4, App. D |
| 7 to 18 | each part of the state and how a block changes it | §6 to §13, App. A, B |
| 19 · Block import | Υ, the whole function | §4, §5 |
| 20 · Facing the fuzzer | the official conformance fuzzer's protocol | |

The [home page](../index.md) has the full list.

## How a lesson works

A lesson explains a rule from the Gray Paper, then builds it. Code comes in snippets,
and the line above each snippet says what to do with it:

- **New file** `src/bytes.ts`: create the file with this content.
- **Add to** `src/bytes.ts`: add the code at the end of the file.
- **Replace in** `src/bytes.ts`: the snippet holds a whole declaration (a function, a
  type, a constant). Replace the declaration of that name, and the comment above it,
  with the snippet.
- **Rewrite** `package.json`: replace the whole file.
- **Run**: type these commands in a terminal in `client/`. They should succeed.
- **Run, expect it to fail**: they should fail, the way the lesson says. Often a lesson
  writes a test before the code, and watching the test fail first shows it can fail.

Paths are inside `client/`. A code block with no line above it is there to read, not to
type.

The tutorial is checked the same way: a script follows every lesson in order, applies
every snippet to an empty client and runs every **Run** block. A lesson is only
published when all of them pass.

## You will watch it work

From lesson 0.3 on, your client reports everything it does to an observability stack
running on your machine (Grafana, Prometheus and Loki): every test run, every program you
run, and later every step of importing a block. When a test fails, the failure is in
Grafana with the rest of the run. When a block import goes wrong, you will see which step
of Υ went wrong, not just a wrong state root at the end.

lasair added this only after it needed it. Your client has it from the start.

## The test vectors

The official **test vectors** (the `davxy/jam-test-vectors` repository, which every JAM
team tests against) are inputs with the exact outputs a correct client produces. They
are the ground truth here. Most lessons
end with your code agreeing with them, and if you and a vector disagree, the vector is
right (or the vector repository says why not; it lists its known deviations from the
Gray Paper).

## lasair beside you

[lasair](https://github.com/abutlabs/lasair) is a JAM client written in OCaml that passes
these vectors. Under many snippets a folded block shows how lasair does the same thing:

<details>
<summary>lasair: the same idea in OCaml</summary>

```ocaml
(* OCaml reads a lot like TypeScript once you know that `let f x = ...` defines a
   function f with an argument x, and that the last expression is the result. *)
let slot_seconds = 6
```

</details>

You don't need OCaml for anything here. The fold is a second opinion, and practice in
reading the code you will be asked about.

## Your screen

On one laptop screen, in VS Code:

1. Open the repo folder (`gray-tutorial/`). Lessons are in `lessons/`.
2. Open a lesson and press <kbd>⌘K</kbd> <kbd>V</kbd> (<kbd>Ctrl+K</kbd> <kbd>V</kbd> on
   Windows and Linux): the rendered lesson opens on one side, so you can keep your code
   on the other. (In this repo, lessons open rendered already; to see one's source,
   right-click its tab and choose *Reopen Editor With... > Text Editor*.)
3. Open a terminal (*Terminal > New Terminal*) and `cd client`.

Grafana opens in your browser, in a tab of its own, for when you want to look at what a
run did.

The same lessons are a website too, with search and copy buttons: run `npm run site` at
the repo root and it opens in your browser.

## When you are stuck

From the repo root:

```sh
npm run compare -- 2.3     # how your client differs from the client after lesson 2.3
npm run catch-up -- 2.3    # make your client the client after lesson 2.3
```

`catch-up` copies your files to `.backup/` first, so nothing is lost.

## Three conventions

They keep the snippets easy to place:

1. **Imports are one line each, at the top of the file.** When a snippet starts with
   imports, add the ones your file is missing, and the names a line is missing.
2. **A top-level declaration starts at the left edge**, with its comment right above
   it. Everything inside it is indented. That is what **Replace in** replaces.
3. **Field names follow the test vectors**: `anchor_slot`, not `anchorSlot`. A vector's
   JSON and your values then have the same shape, and comparing them needs no
   translation.

Next: [0.2 Set up the project](./02-set-up-the-project.md)
