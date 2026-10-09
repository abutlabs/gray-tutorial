# Watch your client

A test tells you whether code is right. It doesn't tell you what the code did. lasair, a
complete JAM client, learned that late: it passed its tests and still had to grow
observability before anyone could see why a network misbehaved. (The observability
course opens with that story:
[Why a JAM network needs observability](https://abutlabs.github.io/jam-learning/observability/lesson.html?lesson=00-welcome/01-why-observe).)

Your client starts the other way round. Before it knows any JAM, it learns to report what
it does, and from now on every run is watched: each `npm test`, each program you run, and
later each step of importing a block.

## Two kinds of signal

| Signal | What it answers | Where it goes |
| --- | --- | --- |
| **Events**: one JSON line per thing that happened | What exactly happened, in what order? | Loki |
| **Numbers**: a value per run | How many tests passed? Which slot is it? | Pushgateway, then Prometheus |

Grafana shows both on the dashboard **Gray Tutorial: your client**. A client reports a
whole **run** at once, at its end, and every event and number of the run carries the
run's id. In Grafana you can pick one run and see only what it did.

Both stores take plain HTTP, so the client needs no library to talk to them: `fetch`,
built into Node, is enough.

## The tests

The tests run against a stand-in for the stack, a small HTTP server inside the test that
records what it is sent. That way the tests check exactly what your client sends, and pass
whether or not the real stack is running.

**New file** `test/obs.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Run } from "../src/obs.ts";

/** A stand-in for the stack: an HTTP server that records every request it gets. */
async function fakeStack() {
  const got: { method: string; url: string; body: string }[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      got.push({ method: req.method ?? "", url: req.url ?? "", body });
      res.writeHead(204).end();
    });
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const stack = { loki: url, pushgateway: url, grafana: url, client: "test" };
  return { got, stack, close: () => server.close() };
}

test("a run sends its events to Loki and its numbers to the Pushgateway", async () => {
  const fake = await fakeStack();
  const run = new Run("demo");
  run.event("hello", { big: 2n ** 64n - 1n, bytes: Uint8Array.of(1, 255) });
  run.number("answer", 42);
  const link = await run.report(fake.stack);
  fake.close();

  const grafana = fake.stack.grafana;
  assert.equal(link, `${grafana}/d/gray-tutorial?var-client=test&var-run_id=${run.id}`);
  const [loki, pushgateway] = fake.got;
  assert.equal(loki.url, "/loki/api/v1/push");
  const stream = JSON.parse(loki.body).streams[0];
  const labels = { job: "gray_tutorial", client: "test", kind: "demo", run_id: run.id };
  assert.deepEqual(stream.stream, labels);
  const line = JSON.parse(stream.values[0][1]);
  assert.deepEqual(line, { step: "hello", big: "18446744073709551615", bytes: "0x01ff" });
  assert.equal(pushgateway.method, "PUT");
  assert.equal(pushgateway.url, "/metrics/job/gray_tutorial/client/test/kind/demo");
  assert.equal(pushgateway.body, `gray_tutorial_answer{run_id="${run.id}"} 42\n`);
});

test("with no stack running, a run says so and the client carries on", async () => {
  const fake = await fakeStack();
  fake.close(); // nothing answers at its address any more
  const run = new Run("demo");
  run.event("hello");
  assert.equal(await run.report(fake.stack), null);
});
```

`fakeStack` listens on port 0, which asks the system for any free port, and reads the port
it got from `server.address()`. The second test closes its stand-in before reporting, so
nothing answers at that address: what happens when the stack is down. Its run prints a
`not reported:` line, which is the client saying so.

**Run, expect it to fail**

```sh
npm test
# fails with: Cannot find module
```

## The module

**New file** `src/obs.ts`

```ts
// Observability: the client reports what it does to the observability stack (abutlabs/
// observability), so every run can be watched in Grafana. Events go to Loki as JSON lines;
// numbers go to the Pushgateway, where Prometheus reads them.

/** Where the stack listens (./obs up's ports), and who is reporting. */
export const STACK = {
  loki: process.env.OBS_LOKI ?? "http://127.0.0.1:3100",
  pushgateway: process.env.OBS_PUSHGATEWAY ?? "http://127.0.0.1:9091",
  grafana: process.env.OBS_GRAFANA ?? "http://127.0.0.1:3300",
  client: process.env.OBS_CLIENT ?? "you",
};

/** One run of the client, its tests or a program: its events and numbers, reported together. */
export class Run {
  readonly kind: string;
  readonly id: string;
  #events: [string, string][] = []; // [time in nanoseconds, JSON line], as Loki takes them
  #numbers = new Map<string, number>();

  constructor(kind: string) {
    this.kind = kind;
    this.id = `${kind}-${new Date().toISOString().replace(/\D/g, "").slice(0, 17)}`;
  }

  /** Something the client did: the step, and the values that matter. */
  event(step: string, fields: Record<string, unknown> = {}): void {
    // nanoseconds; the event count keeps events in order within one millisecond
    const at = BigInt(Date.now()) * 1_000_000n + BigInt(this.#events.length % 1_000_000);
    this.#events.push([at.toString(), JSON.stringify({ step, ...fields }, jsonValue)]);
  }

  /** A number this run measured, such as how many tests passed. */
  number(name: string, value: number): void {
    this.#numbers.set(name, value);
  }

  /** Sends the run to the stack: a link to it in Grafana, or null if the stack is not there. */
  async report(stack = STACK): Promise<string | null> {
    const labels = { job: "gray_tutorial", client: stack.client, kind: this.kind, run_id: this.id };
    try {
      if (this.#events.length > 0) {
        const push = { streams: [{ stream: labels, values: this.#events }] };
        const url = `${stack.loki}/loki/api/v1/push`;
        await send("POST", url, "application/json", JSON.stringify(push));
      }
      if (this.#numbers.size > 0) {
        let text = "";
        for (const [name, value] of this.#numbers) {
          text += `gray_tutorial_${name}{run_id="${this.id}"} ${value}\n`;
        }
        const group = `/metrics/job/gray_tutorial/client/${stack.client}/kind/${this.kind}`;
        await send("PUT", stack.pushgateway + group, "text/plain", text);
      }
    } catch (e) {
      const why = e instanceof Error && e.cause instanceof Error ? e.cause.message : String(e);
      console.log(`not reported: the observability stack is not reachable (${why})`);
      return null;
    }
    return `${stack.grafana}/d/gray-tutorial?var-client=${stack.client}&var-run_id=${this.id}`;
  }
}

/** JSON for what JSON.stringify can't write: bigints as decimal strings, bytes as 0x hex. */
function jsonValue(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return "0x" + Buffer.from(value).toString("hex");
  return value;
}

async function send(method: string, url: string, type: string, body: string): Promise<void> {
  const headers = { "Content-Type": type };
  const res = await fetch(url, { method, body, headers, signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}
```

The pieces:

- `STACK` holds the addresses, and `client` names who reports: `you`, unless `OBS_CLIENT`
  says otherwise. (The tutorial's own checks report as `tutorial-check`, so their runs
  don't mix with yours.)
- `event` keeps each event as Loki wants it: a time in nanoseconds, as a string, and the
  line. `jsonValue` fixes the two kinds of value JSON can't hold: a `bigint` becomes its
  digits, bytes become hex.
- `report` sends everything in two requests. The Pushgateway keeps one group per
  `client` and `kind` and replaces it on every push, so it always holds the latest run's
  numbers. That is what the dashboard's "last run" panels show.
- If the stack is down, `report` says so in one line and returns `null`. Your client keeps
  working without it.

**Run**

```sh
npm test
# prints: fail 0
npm run typecheck
```

## Every test run, reported

Node's test runner lets you add a **reporter**: a function that receives every test's
result as it happens. This one turns them into a run, events for each test and numbers
for the totals, and reports it.

**New file** `test/grafana.ts`

```ts
// Reports each npm test run to the observability stack: each test's result as an event,
// the totals as numbers. Prints one line: where to see the run in Grafana.

import { relative } from "node:path";
import type { TestEvent } from "node:test/reporters";
import { Run } from "../src/obs.ts";

export default async function* grafana(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
  const run = new Run("test");
  let passed = 0;
  let failed = 0;
  for await (const event of source) {
    if (event.type !== "test:pass" && event.type !== "test:fail") continue;
    const { name, file, details } = event.data;
    if (details.type === "suite") continue;
    const ok = event.type === "test:pass";
    const error = event.type === "test:fail" ? String(event.data.details.error.cause) : undefined;
    if (ok) passed++;
    else failed++;
    const where = file && relative(process.cwd(), file);
    run.event("test", { name, file: where, ok, ms: Math.round(details.duration_ms), error });
  }
  run.number("tests_passed", passed);
  run.number("tests_failed", failed);
  const link = await run.report();
  if (link) yield `reported ${passed + failed} tests to Grafana: ${link}\n`;
}
```

A reporter is an *async generator*: `for await` takes each test event as the runner
produces it, and each `yield` writes text to the terminal. This one writes a single line,
at the end. Its name doesn't end in `.test.ts`, so the runner doesn't run it as a test.

Tell `npm test` to use it, next to the usual output (`spec`):

**Rewrite** `package.json`

```json
{
  "name": "jam-client",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=./test/grafana.ts --test-reporter-destination=stdout \"test/**/*.test.ts\"",
    "typecheck": "tsc -p ."
  },
  "devDependencies": {
    "@types/node": "24.19.1",
    "typescript": "7.0.2"
  }
}
```

**Run**

```sh
npm test
# prints: fail 0
# prints: reported 2 tests to Grafana
npm run typecheck
```

Open the link it prints. *Test results* lists your two tests, and *Tests passed* says 2.
Run `npm test` again: a second run appears, with its own id in the *run* menu at the top.

<details>
<summary>lasair: the same idea, for its gate</summary>

lasair reports its conformance gate the same way, from Python, in
`scripts/obsreport.py`: one push per run to the Pushgateway, grouped so it replaces the
run's previous numbers.

```python
def push(cli, job, run_id, net, snapshot):
    """Replace the job's group for this run with the snapshot."""
    if cli:
        obs(cli, "push", job, "--replace", "--group", "run_id=" + run_id, "--group", "net=" + net,
            stdin=snapshot.text())
```

`obs push` is the stack's command-line tool sending the same `PUT` your `report` sends.
lasair's gate dashboard is built on those numbers, as yours is on your runs.

</details>

## What you have

A client that reports itself: every test run lands in Grafana with each test's result,
and any program can report its own run with three calls: `new Run`, `event`, `report`.

Next: [0.4 The JAM clock](./04-the-jam-clock.md)
