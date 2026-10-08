# Set up the project

You need git, VS Code (or any editor), and Node.js 24.

## Node 24

The repo's `.nvmrc` file says `24`. With [nvm](https://github.com/nvm-sh/nvm), at the
repo root:

```sh
nvm install      # once
nvm use          # in each new terminal
node --version   # v24.something
```

Why Node 24: it runs TypeScript files directly. It strips the type annotations and runs
what is left, so there is no build step. The code you type is the code that runs. The
types are still checked, separately, by the TypeScript compiler `tsc`.

## The repo's own tools

Also at the repo root, once:

```sh
npm install       # the website and the lesson tools
npm run vectors   # the official test vectors, about 1.4 GB, into vectors/
```

## Your client

Everything from here on happens in `client/`, which is empty. Open a terminal there:

```sh
cd client
```

**New file** `package.json`

```json
{
  "name": "jam-client",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "typecheck": "tsc -p ."
  },
  "devDependencies": {
    "@types/node": "24.19.1",
    "typescript": "7.0.2"
  }
}
```

- `"type": "module"`: every file is an ES module, so files share code with `import` and
  `export`.
- `npm test` runs Node's built-in test runner, which finds every file whose name ends in
  `.test.ts`.
- `npm run typecheck` runs `tsc`, which checks the types and writes nothing.
- The versions are exact, so your client and the tutorial's behave the same.

**New file** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2024",
    "lib": ["es2024"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "skipLibCheck": true
  },
  "include": ["src", "test", "bin"]
}
```

The options that matter:

- `strict`: every check on. `null` must be handled, every parameter has a type.
- `noEmit`: `tsc` only checks. Node runs the `.ts` files itself.
- `allowImportingTsExtensions`: imports name the real file, `./bytes.ts`, as Node needs.
- `verbatimModuleSyntax`: an import of types only must say `import type`. Node removes
  those lines, and this rule makes sure it removes exactly the right ones.
- `erasableSyntaxOnly`: no TypeScript features that generate code (`enum`, `namespace`).
  Node can only strip types, not translate features, so `tsc` refuses them.

The code lives in three folders: `src/` for the client, `test/` for its tests and `bin/`
for small programs you run.

**Run**

```sh
npm install
```

## Your first piece of JAM: the clock

JAM keeps time in six-second **timeslots**. The Gray Paper (§4, *Time*) counts time from
the **JAM Common Era**, 12:00 UTC on 1 January 2025, which is 1,735,732,800 seconds after
the Unix epoch. A timeslot lasts P = 6 seconds (§4, *Epochs and Slots*), so slot 0 is the
first six seconds of the era and slot 600 begins an hour later. Every block header names
its slot, and a block from a future slot is invalid (§5: a header's slot times P may not
be later than the current time).

Write the test first. It says what `slotAt` must do before `slotAt` exists:

**New file** `test/time.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { slotAt } from "../src/time.ts";

const at = (iso: string) => slotAt(new Date(iso));

test("slot 0 is the first six seconds of the JAM Common Era", () => {
  assert.equal(at("2025-01-01T12:00:00Z"), 0);
  assert.equal(at("2025-01-01T12:00:05.999Z"), 0);
  assert.equal(at("2025-01-01T12:00:06Z"), 1);
});

test("an hour is 600 slots", () => {
  assert.equal(at("2025-01-01T13:00:00Z"), 600);
});

test("there are no slots before the era", () => {
  assert.throws(() => at("2025-01-01T11:59:59Z"), RangeError);
});
```

`node:test` gives you `test(name, fn)`, and `node:assert/strict` gives you assertions
that compare exactly (`assert.equal(1, "1")` fails).

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

The `# fails with:` line says what to look for in the output: Node can't find
`src/time.ts`, because there isn't one yet. (A `#` line is a comment, so the shell skips
it; `# prints:` lines work the same way.)

**New file** `src/time.ts`

```ts
// Time: JAM counts six-second timeslots from the JAM Common Era (GP §4).

/** The JAM Common Era began at 12:00 UTC on 1 January 2025: seconds after the Unix epoch. */
export const JAM_COMMON_ERA = 1_735_732_800;

/** P: a timeslot lasts six seconds. */
export const SLOT_SECONDS = 6;

/** The timeslot a moment falls in: whole slots since the JAM Common Era. */
export function slotAt(date: Date): number {
  const ms = date.getTime() - JAM_COMMON_ERA * 1000;
  if (ms < 0) throw new RangeError(`${date.toISOString()} is before the JAM Common Era`);
  return Math.floor(ms / (SLOT_SECONDS * 1000));
}
```

**Run**

```sh
npm test
# prints: fail 0
npm run typecheck
```

Both pass. They check different things. Node strips the types and runs the code
without looking at them, so a type error would not fail `npm test`. `npm run typecheck`
is what catches it. Run both after every change.

## A program

**New file** `bin/now.ts`

```ts
// Prints the JAM timeslot it is right now.

import { slotAt } from "../src/time.ts";

console.log(`It is JAM timeslot ${slotAt(new Date())}.`);
```

**Run**

```sh
node bin/now.ts
# prints: It is JAM timeslot
```

It prints a slot in the millions: the number of six-second slots since the start of
2025. Run it again six seconds later and the number has gone up by one.

<details>
<summary>lasair: the same clock, in <code>lib/overview.ml</code></summary>

```ocaml
(** Unix timestamp of JAM Common Era start *)
let jam_common_era_unix : int64 = 1_735_732_800L

(** Convert Unix timestamp to JAM timeslot *)
let timeslot_of_unix (unix_ts : int64) : timeslot option =
  let open Int64 in
  let diff = sub unix_ts jam_common_era_unix in
  if diff < 0L then None
  else Some (Int32.of_int (to_int (div diff (of_int Constants.c_slot_seconds))))
```

Where your `slotAt` throws before the era, lasair returns `None`: OCaml's `option` type
says "maybe no value", and the caller must handle both cases. `let open Int64 in` lets
the function write `sub` and `div` for `Int64.sub` and `Int64.div`.

JAM time is this simple on purpose: every node computes the same slot from its own
clock, with no messages.

</details>

## What you have

A project that runs TypeScript without a build, tests with `node --test`, checks types
with `tsc`, and your first JAM rule with its tests.

Next: [Part 1 · Bytes and numbers](../01-bytes-and-numbers/index.md)
