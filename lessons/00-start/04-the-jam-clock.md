# The JAM clock

Your first piece of JAM, and the first thing your client reports about the world.

## What the Gray Paper says

JAM keeps time in six-second **timeslots**. The Gray Paper (§4, *Time*) counts time from
the **JAM Common Era**, 12:00 UTC on 1 January 2025, which is 1,735,732,800 seconds after
the Unix epoch. A timeslot lasts P = 6 seconds (§4, *Epochs and Slots*), so slot 0 is the
first six seconds of the era and slot 600 begins an hour later. Every block header names
its slot, and a block from a future slot is invalid (§5: a header's slot times P may not
be later than the current time).

## The code

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
`src/time.ts`, because there isn't one yet: you write it next. (A `#` line is a comment, so the shell skips
it; `# prints:` lines work the same way.) The failed run is reported too: on the
dashboard, *Tests failed* is no longer 0, and *Test results* says which test failed and
why.

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
# prints: reported
npm run typecheck
```

Both pass. They check different things. Node strips the types and runs the code
without looking at them, so a type error would not fail `npm test`. `npm run typecheck`
is what catches it. Run both after every change.

## A program that reports

**New file** `bin/now.ts`

```ts
// Prints the JAM timeslot it is right now, and reports it to the observability stack.

import { Run } from "../src/obs.ts";
import { slotAt } from "../src/time.ts";

const run = new Run("now");
const slot = slotAt(new Date());
console.log(`It is JAM timeslot ${slot}.`);
run.event("slot", { slot });
run.number("slot", slot);
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

The file is a module, so it can `await` at the top level: Node waits for the report
before it exits.

**Run**

```sh
node bin/now.ts
# prints: It is JAM timeslot
# prints: reported to Grafana
```

It prints a slot in the millions: the number of six-second slots since the start of
2025. On the dashboard, *JAM timeslot* shows the same number, and the run's event is in
*Everything your client reported*. Run it again six seconds later and the number has
gone up by one.

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

Your first JAM rule, its tests, and a program that reports what it found. From here on,
every lesson's `npm test` lands in Grafana.

Next: [Part 1 · Bytes and numbers](../01-bytes-and-numbers/index.md)
