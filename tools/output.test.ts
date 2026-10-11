import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOutput, normalize } from "./output.ts";

const real = [
  "✔ slot 0 is the first six seconds of the JAM Common Era (0.61ms)",
  "✔ an hour is 600 slots (0.08ms)",
  "",
  "ℹ tests 2",
  "ℹ pass 2",
  "ℹ fail 0",
  "ℹ duration_ms 41.27",
].join("\n");

test("the whole output, with its times as they were on the writer's run", () => {
  const shown = real.replace("0.61ms", "0.7ms").replace("41.27", "39.1");
  assert.equal(checkOutput(shown, real), null);
});

test("a cut is marked with ..., at the start, in the middle or at the end", () => {
  assert.equal(checkOutput("...\nℹ pass 2\nℹ fail 0\n...", real), null);
  assert.equal(checkOutput("✔ slot 0 is the first six seconds of the JAM Common Era (1ms)\n...\nℹ fail 0\n...", real), null);
});

test("an unmarked cut, a wrong line, or output left over is caught", () => {
  assert.match(checkOutput("✔ slot 0 is the first six seconds of the JAM Common Era (1ms)\nℹ pass 2\n...", real)!, /mark a cut/);
  assert.match(checkOutput("...\nℹ pass 3\n...", real)!, /not in the output: ℹ pass 3/);
  assert.match(checkOutput("...\nℹ pass 2", real)!, /goes on after the last line/);
  assert.match(checkOutput("ℹ tests 2\n...", real)!, /expected here/);
});

test("… stands for anything inside a line", () => {
  assert.equal(checkOutput("It is JAM timeslot …, reported", "It is JAM timeslot 5,233,107, reported"), null);
  assert.match(checkOutput("It is JAM timeslot …, sent", "It is JAM timeslot 5,233,107, reported")!, /not right|expected here/);
});

test("masks: times, durations, run ids, paths into the client, colours", () => {
  assert.equal(normalize("at 2026-10-11T13:01:02.123Z"), "at <time>");
  assert.equal(normalize("ℹ duration_ms 52.3"), "ℹ duration_ms <ms>");
  assert.equal(normalize("run test-1791722258705 reported"), "run test-<run> reported");
  assert.equal(normalize("Cannot find module '/Users/a/gray-tutorial/.tangled/src/time.ts'"), "Cannot find module '…/client/src/time.ts'");
  assert.equal(normalize("imported from /home/b/jam/gray-tutorial/client/test/x.ts"), "imported from …/client/test/x.ts");
  assert.equal(normalize("\x1b[32m✔ ok\x1b[39m"), "✔ ok");
});
