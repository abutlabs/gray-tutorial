# Set up the project

You need git, VS Code (or any editor), Docker Desktop, and Node.js 26.

## Node 26

The repo's `.nvmrc` file says `26`. With [nvm](https://github.com/nvm-sh/nvm), at the
repo root:

```sh
nvm install      # once
nvm use          # in each new terminal
node --version   # v26.something
```

Why Node 26: it runs TypeScript files directly. It strips the type annotations and runs
what is left, so there is no build step. The code you type is the code that runs. The
types are still checked, separately, by the TypeScript compiler `tsc`. It also has the
newest JavaScript built-ins, such as turning bytes into hex and back, which lesson 1.1
uses.

## The repo's own tools

Also at the repo root, once:

```sh
npm install       # the website and the lesson tools
npm run vectors   # the official test vectors, about 1.4 GB, into vectors/
```

## The observability stack

From the next lesson on, your client reports everything it does to an observability
stack: Grafana to look at, Prometheus for numbers, Loki for events. It is the same stack
lasair reports into, and it runs in Docker, so start Docker Desktop first.

The stack is its own repo, [abutlabs/observability](https://github.com/abutlabs/observability).
Clone it next to this one, so the two folders sit side by side, and start it:

```sh
cd ..                     # the folder that holds gray-tutorial/
git clone https://github.com/abutlabs/observability.git    # once
cd observability
./obs up
cd ../gray-tutorial
```

`./obs up` prints the addresses it serves. Open Grafana at http://localhost:3300 and go to
*Dashboards*: there is a folder **gray-tutorial** with the dashboard **Gray Tutorial: your
client**. The stack found it in this repo's `observability/dashboards/`, because the
checkouts sit side by side (if yours don't, start it with
`OBS_PROJECT_DIRS=/path/to/gray-tutorial ./obs up`). The dashboard is empty: nothing has
reported yet.

Leave the stack running while you work. `./obs down` stops it, and your data stays for
the next `./obs up`. To learn the stack itself, there is a whole course,
[Learning Observability](https://abutlabs.github.io/jam-learning/observability/).

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
    "test": "node --test \"test/**/*.test.ts\"",
    "typecheck": "tsc -p ."
  },
  "devDependencies": {
    "@types/node": "26.6.4",
    "typescript": "7.0.2"
  }
}
```

- `"type": "module"`: every file is an ES module, so files share code with `import` and
  `export`.
- `npm test` runs Node's built-in test runner on every file in `test/` whose name ends in
  `.test.ts`. The pattern matters: without it, Node runs every file in a `test/` folder,
  helpers included.
- `npm run typecheck` runs `tsc`, which checks the types and writes nothing.
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

The options that matter:

- `lib`: `esnext`, the newest JavaScript built-ins (such as `Uint8Array.fromHex`), which
  Node 26 has.
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

## What you have

Node 26, the official test vectors, the observability stack running, and an empty client
project that knows how to test and type-check itself.

Next: [0.3 Watch your client](./03-watch-your-client.md)
