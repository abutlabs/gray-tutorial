# Gray Tutorial

How to use this project - Fork this repo and Build a JAM client in TypeScript.

The lessons explain the [Gray Paper](https://graypaper.com) (version 0.8.0) and give the
code in snippets. You assemble them into your own client in `client/`, run the tests at
every step, and finish with a block importer that agrees byte for byte with the
official test vectors.

Read the lessons online at https://abutlabs.github.io/gray-tutorial/, part of
[JAM learning](https://abutlabs.github.io/jam-learning/). To build the client you need
this repository too: the tools, the dashboards and the test vectors live here.

**Building a JAM Prize implementation?** This tutorial gives you a whole client's code,
and some lessons show lasair's, another Prize entry. The Prize rules ask teams to build
clean-room and to declare any implementation code they view: read
[the note on the Prize rules](https://abutlabs.github.io/jam-learning/lasair/index.html#prize-rules)
first.


## What you need

| What | Why | Check it with |
| --- | --- | --- |
| git | to clone the two repositories | `git --version` |
| [nvm](https://github.com/nvm-sh/nvm) | to install and switch to Node 26 | `nvm --version` |
| Docker with Compose v2 (Docker Desktop on a Mac) | runs the observability stack | `docker compose version` |
| Python 3.8 or newer | the stack's `obs` command | `python3 --version` |
| About 4 GB of free disk | the test vectors (1.4 GB) and the stack's images (2 GB) | |
| VS Code (optional) | to read a lesson beside your code | |
| A GitHub account (optional) | to keep your client in a repository of its own | |

Written and checked on macOS. Linux should work the same way; on Windows, use WSL 2
(untested).

## Where things go

The tutorial expects the observability stack in a folder beside it. Clone both into
any folder of your own:

```sh
mkdir jam && cd jam
git clone https://github.com/abutlabs/observability.git
git clone git@github.com:YOUR-NAME/gray-tutorial.git    # your fork of this repository
cd gray-tutorial
```

You end up with:

```
jam/
├── observability/      the Grafana stack: ../observability/obs up, from the tutorial
└── gray-tutorial/      this repository
    ├── lessons/        what you read
    ├── client/         what you build (a repository of its own, if you like: see below)
    └── vectors/        the official test vectors, after npm run vectors
```

## Start

In the `gray-tutorial` folder:

```sh
nvm install           # Node 26, from .nvmrc: installs it the first time, then switches to it
node --version        # must say v26; if not, nothing below works
npm install           # the website and the tools
../observability/obs up   # the observability stack, from the folder beside this one
npm run vectors       # the official test vectors, about 1.4 GB, into vectors/
```

nvm switches Node in one terminal only. Every new terminal starts on your default Node
again. Three ways to live with that:

- **Let your shell switch for you.** nvm's README has a short snippet for your shell's
  startup file ([Calling `nvm use` automatically in a directory with a `.nvmrc`
  file](https://github.com/nvm-sh/nvm#calling-nvm-use-automatically-in-a-directory-with-a-nvmrc-file)):
  every terminal in this folder, `client/` included, is on Node 26 by itself, and other
  folders keep your default.
- **Make 26 your default:** `nvm alias default 26`, once.
- **Type `nvm use`** in each new terminal.

On an older Node, the tutorial's commands stop and say so:
`The Gray Tutorial needs Node 26, and this terminal has v20.15.0.`

Your client reports every run to that stack from lesson 0.3 on. Its dashboards are in
Grafana's *gray-tutorial* folder: start at *0 · Your client*
(http://localhost:3300/d/gray-tutorial), which links one dashboard per theme of the
tutorial, from *1 · Basics* to *7 · Accumulation and import*. Grafana's own Home page
belongs to the stack and shows its networks, not your client.

Then start the website, in a new terminal of its own (it keeps running until Ctrl-C):

```sh
nvm use               # a new terminal: Node 26 again
npm run site          # the lessons at http://localhost:5173; your browser opens there
```

Start at its first page, or at [lessons/index.md](lessons/index.md). There are two ways to
read the lessons:

- **In a browser.** The website above: search, copy buttons and dark mode.
- **In VS Code, on one screen.** Open this folder. Lessons open rendered (this repo's
  `.vscode/settings.json` does that). Press <kbd>⌘K</kbd> <kbd>V</kbd> on a lesson to keep it beside your
  code, and work in a terminal in `client/`.

## The repo

```
lessons/         the tutorial: one folder per part, plain Markdown
client/          your JAM client, built lesson by lesson: empty at the start, and
                 git-ignored, so it stays yours (see "Your client's own repository")
observability/   the client's Grafana dashboards (the stack finds them by itself)
vectors/         the official test vectors, v0.8.0 of davxy/jam-test-vectors (npm run vectors)
tools/           how the lessons are checked
.vitepress/      the website, made from lessons/
```

## Your client's own repository

This repository ignores `client/`: your code never lands in the tutorial's history, and
`git pull` brings new lessons without touching it. To keep a history of your own, and a
copy on GitHub, make `client/` a repository of its own:

```sh
cd client
git init                                  # client/ becomes its own repository
printf 'node_modules/\n' > .gitignore     # keep downloaded packages out of it
git add .
git commit -m "My JAM client"
```

Then create an empty repository on GitHub (no README, licence or .gitignore, so the
first push goes in cleanly), for example `my-jam-client`, private if you like, and link
it up:

```sh
git remote add origin git@github.com:YOUR-NAME/my-jam-client.git  #ie. git remote add origin git@github.com:abutlabs/my-jam-client.git
git branch -M main
git push -u origin main
```

With the GitHub CLI, those last steps are one command:
`gh repo create my-jam-client --private --source=. --push`.

From then on there are two repositories, one inside the other, each minding its own
files:

- **inside `client/`**: commit and push your work, `git add . && git commit -m "lesson
  3.2" && git push`;
- **in the tutorial folder**, one level up: `git pull` for new lessons. It never sees
  `client/`, and your client's repository never sees the lessons.

`npm run catch-up` leaves `client/.git` alone: it copies your files to `.backup/` first
and never touches your history.

## Commands

| Command | What it does |
| --- | --- |
| `npm run site` | the lessons as a website |
| `npm run compare -- 2.3` | how your `client/` differs from the client after lesson 2.3 |
| `npm run catch-up -- 2.3` | make `client/` the client after lesson 2.3 (yours is copied to `.backup/` first) |
| `npm run verify` | follow every lesson from an empty client in `.tangled/` and run every **Run** block (the stack must be up) |
| `npm run screenshots` | retake the lessons' screenshots from fresh runs of each lesson (needs the stack and Google Chrome) |
| `npm run compare -- 2.3 --dir ../other-client` | the same comparison for another client folder |
| `npm run check` | type-check and test the tools, and build the website (which fails on a broken link) |

## How the lessons are checked

A lesson's snippets carry a label line that says what to do with them (**New file**,
**Add to**, **Replace in**, **Rewrite**, **Run**). `tools/lessons.ts` reads those same lines,
`tools/tangle.ts` applies them to a client the way a reader would, and
`tools/verify.ts` runs the whole tutorial in order. A **Run** block can say what its
output must contain (`# prints: ...`, `# fails with: ...`), and verify checks that too.
So the instructions a reader follows and the ones that are tested are the same text.
[WRITING.md](WRITING.md) has the rules for writing a lesson.
