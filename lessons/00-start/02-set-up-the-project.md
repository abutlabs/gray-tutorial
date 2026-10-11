# Set up the project

Four things to set up, then you never think about them again: Node, the tutorial's own
tools, the observability stack, and an empty client. Ten minutes, tops. You need git,
VS Code (or any editor) and Docker Desktop.

## New words

- **Node.** The program that runs JavaScript (and, from version 26, TypeScript) outside a
  browser. *Example:* `node --version` says which one you have.
- **nvm.** A tool that installs Node versions and switches between them. *Example:*
  `nvm use` switches to the version the project asks for.
- **npm.** Node's package manager: it downloads libraries and runs a project's scripts.
  *Example:* `npm install` fetches everything a project needs.
- **tsc.** The TypeScript compiler. Here it only checks your types, and writes nothing.
  *Example:* `npm run typecheck` runs it.
- **Docker.** Runs ready-made programs in *containers*, so a whole set of tools starts
  with one command. *Example:* `./obs up` starts the observability stack in Docker.
- **Module.** A file that shares code with other files through `import` and `export`.
  *Example:* lesson 0.4's `src/time.ts` exports `slotAt`, and its test imports it.

## Node 26

The repo's `.nvmrc` says `26`. With [nvm](https://github.com/nvm-sh/nvm), at the repo
root, install it once:

```sh
nvm install
```

Then, in every new terminal, switch to it and check:

```sh
nvm use
node --version
```

It should say `v26.` and something.

Why Node 26? It runs TypeScript files directly: it strips off the type annotations and
runs what's left. No build step, so the code you type is the code that runs. (The types
still get checked, by the TypeScript compiler `tsc`, whenever you ask.) Node 26 also has
the newest JavaScript built-ins, like turning bytes into hex, which you'll meet in lesson
1.1.

## The tutorial's tools

Still at the repo root, once: `npm install` fetches the website and the lesson tools,
and `npm run vectors` downloads the official test vectors (about 1.4 GB, into
`vectors/`).

```sh
npm install
npm run vectors
```

## The observability stack

From the next lesson on, your client tells this stack everything it does. Grafana to
look at, Prometheus for numbers, Loki for events: the same stack lasair reports into.
It runs in Docker, so start Docker Desktop first.

The stack is its own repo, [abutlabs/observability](https://github.com/abutlabs/observability).
Clone it next door, so the two folders sit side by side, and start it. `cd ..` takes
you to the folder that holds `gray-tutorial/`, and the clone is needed only once:

```sh
cd ..
git clone https://github.com/abutlabs/observability.git
cd observability
./obs up
cd ../gray-tutorial
```

Now open Grafana at http://localhost:3300 and go to *Dashboards*. There's a folder
**gray-tutorial** holding the tutorial's dashboards: **0 · Your client**, where every run
lands, and one per theme, from **1 · Basics** to **7 · Accumulation and import**. A bar at
the top of each links them all. (The stack found them in this repo's
`observability/dashboards/` because the folders are neighbours. If yours aren't,
start it with `OBS_PROJECT_DIRS=/path/to/gray-tutorial ./obs up`.)

They're empty. Nothing has said anything yet. Lesson 0.3 fixes that.

Leave the stack running while you work. `./obs down` stops it and keeps your data for the
next `./obs up`. Curious how it all works? There's a whole course:
[Learning Observability](https://abutlabs.github.io/jam-learning/observability/).

## Your client

Everything from here on happens in `client/`, which is empty. It's also git-ignored: your
code never lands in the tutorial's history, and `git pull` brings new lessons without
touching it. Want a history of your own? Run `git init` inside `client/`, and it becomes
your own repository. Open a terminal there:

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
    "test": "node --test \"test/**/*.test.ts\"",
    "typecheck": "tsc -p ."
  },
  "devDependencies": {
    "@types/node": "26.6.4",
    "typescript": "7.0.2"
  }
}
```

- `"type": "module"` makes every file a module, so files share code with `import` and
  `export`.
- `npm test` runs Node's built-in test runner on every `.test.ts` file in `test/`.
  (Spell the pattern out: without it, Node runs *every* file in a `test/` folder, helpers
  and all.)
- `npm run typecheck` asks `tsc` to check the types. It writes nothing.
- The versions are exact, so your client and the tutorial's behave the same.

**New file** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["esnext"],
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

Two settings to know: `strict` turns on every check (no forgotten `null`s, no untyped
parameters), and `noEmit` means `tsc` only checks, because Node runs the `.ts` files
itself. The rest make sure Node and `tsc` agree on what your files mean: imports name the
real file (`./bytes.ts`), type-only imports say `import type`, and no TypeScript feature
needs translating (so no `enum`), because Node can only strip types away, not rewrite
code.

Your code will live in three folders: `src/` for the client, `test/` for its tests, and
`bin/` for little programs you run.

**Run**

```sh
npm install
```

## What you have

Node 26, the official test vectors, an observability stack waiting for its first word,
and an empty client that knows how to test and type-check itself.

Next: [0.3 Watch your client](./03-watch-your-client.md)
