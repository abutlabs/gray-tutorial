# What you will build

Welcome! By the end of this tutorial you will have written a JAM client: a TypeScript
program that takes a JAM block, checks it against every rule in the Gray Paper, and works
out what the chain looks like afterwards. Byte for byte the same answer every other JAM
client gets.

You write every line yourself (typing or pasting, no judgement here). And on the way you
read most of the Gray Paper, one rule at a time, with code running beside it. Sneaky.

## New words

- **JAM.** A blockchain protocol that blends ideas from Polkadot and Ethereum: anyone can
  put a program (a *service*) on it, and the work for those programs runs in parallel on
  many *cores*. The name comes from "join-accumulate", part of its model of computing.
  *Example:* in Part 15 you'll run a real JAM service's code.
- **Gray Paper (GP).** JAM's specification: the document that defines every rule, mostly
  in maths. It is still being improved, and new versions change rules; this tutorial
  follows version 0.8.0. *Example:* "§4" means its section 4.
- **Client.** A program that follows a protocol's rules. A JAM client reads blocks and
  works out the chain's state, the same way every other JAM client does. *Example:*
  lasair is a JAM client, and so will yours be.
- **Block.** A batch of new information added to the chain, at most one every six
  seconds. *Example:* the test vectors include runs of 100 real blocks.
- **State.** Everything the chain remembers between blocks: who the validators are, every
  service's data, the time, and more. *Example:* "it's slot 43" is part of the state.
- **Test vector.** An official example: an input, with the exact output a correct client
  must produce from it. *Example:* a block, and the state it must lead to.

Every word like these is also in the [glossary](../glossary.md). Each lesson starts with
the ones it brings in.

## The whole thing in one line

In plain words: the chain remembers a *state*. Each *block* changes that state, following
fixed rules. A client is a program that applies those rules, and every client that applies
them correctly gets exactly the same new state. The Gray Paper says all of that in one
equation (§4, *Overview*):

```text
σ′ ≡ Υ(σ, B)
```

- **σ** (sigma) is the chain's state before a block: seventeen parts, from validator
  keys to service accounts to the last few blocks.
- **B** is the block.
- **σ′** (sigma prime) is the state after it.
- **Υ** (upsilon) is the **state-transition function**, the machine that turns one into
  the other.

That's it. A blockchain, says the Gray Paper, is a starting state plus Υ, and almost
every other page of the paper describes one piece of Υ.

A program that computes Υ is a **block importer**. Hand it a state and a block, and it
answers either "valid, and here is the new state" or "invalid, go away". It is the first
milestone (M1) of a JAM implementation, and it is what you will have at the end.

## The road

| Part | You build |
| --- | --- |
| 0 · Start | your project, its dashboard, the JAM clock |
| 1 · Bytes and numbers | hex, and numbers too big for JavaScript |
| 2 · The codec | turning JAM values into bytes and back |
| 3 to 6 | work-reports, blocks, hashes and signatures, the state and its root |
| 7 to 18 | every part of the state, and how a block changes it |
| 19 · Block import | Υ, all of it |
| 20 · Facing the fuzzer | the official tester, throwing blocks at your client |

The [home page](../index.md) has the full map.

## How a lesson works

A rule from the Gray Paper, the code for it in small snippets, then you run it. The line
above each snippet says what to do with it:

- **New file** `src/bytes.ts`: create the file.
- **Add to** `src/bytes.ts`: paste it at the end of the file.
- **Replace in** `src/bytes.ts`: swap out the function (or type, or constant) of the
  same name, its comment included.
- **Rewrite** `package.json`: replace the whole file.
- **Run**: type it in a terminal in `client/`. It should work.
- **Run, expect it to fail**: it should fail, the way the lesson says. This tutorial uses
  test-driven development: we often write the test first and watch it go red, because a
  test that has never failed has never proved anything.

Paths are inside `client/`. A code block with no label above it is for reading.

Every lesson is checked before you see it: a script follows it from an empty folder,
applies every snippet and runs every **Run** block. If anything breaks, the lesson
doesn't ship.

## You will see everything

From lesson 0.3 on, your client tells an observability stack (Grafana and friends,
running on your own machine) everything it does: each test run, each program, and later
each step of importing a block. When something goes wrong, you won't be squinting at one
wrong number at the end. You will watch the step where it went wrong.

lasair, the JAM client this tutorial leans on, learned that the hard way, after it
needed it. You get it on day one.

## The referee

The official **test vectors** (the `davxy/jam-test-vectors` repository, which every JAM
team tests against) are inputs paired with the exact outputs a correct client produces.
They are the referee: when your code and a vector disagree, the vector wins. (Unless the
vectors' own changelog says otherwise. Even referees publish corrections.)

## lasair, the neighbour

[lasair](https://abutlabs.github.io/jam-learning/lasair/index.html) is a JAM client written in OCaml that passes
all these vectors. Under many snippets a folded box shows how lasair does the same thing:

<details>
<summary>lasair: the same idea in OCaml</summary>

```ocaml
(* OCaml reads a lot like TypeScript once you know that `let f x = ...` defines a
   function f with an argument x, and that the last expression is the result. *)
let slot_seconds = 6
```

</details>

You never need OCaml here. The fold is a second opinion, and practice reading real
client code.

## Your screen

One laptop screen is enough:

1. Open `gray-tutorial/` in VS Code. Lessons open rendered.
2. On a lesson, press <kbd>⌘K</kbd> <kbd>V</kbd> (<kbd>Ctrl+K</kbd> <kbd>V</kbd> on
   Windows and Linux) to keep it on one side and your code on the other. (To see a
   lesson's source: right-click its tab, *Reopen Editor With... > Text Editor*.)
3. *Terminal > New Terminal*, then `cd client`.

Grafana lives in a browser tab. Prefer reading lessons in the browser too? `npm run site`
at the repo root serves them with search and copy buttons. There, the left and right arrow
keys turn the lessons, and `?` lists the keys.

## Stuck?

From the repo root, `compare` shows how your client differs from the client after a
lesson (here 2.3), and `catch-up` makes your client that client:

```sh
npm run compare -- 2.3
npm run catch-up -- 2.3
```

`catch-up` backs your files up to `.backup/` first, so nothing is ever lost.

## Three house rules

They make snippets easy to place:

1. **One import per line, at the top of the file.** When a snippet starts with imports,
   add the ones your file is missing.
2. **Top-level declarations start at the left edge**, with their comment right above.
   That is what **Replace in** swaps.
3. **Field names copy the test vectors** (`anchor_slot`, not `anchorSlot`), so a vector's
   JSON and your values look exactly alike.

Ready? Next: [0.2 Set up the project](./02-set-up-the-project.md)
