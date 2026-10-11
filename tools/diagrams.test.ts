import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DIAGRAMS } from "./diagrams.ts";
import { LESSONS } from "./lessons.ts";

test("every diagram is what tools/diagrams.ts draws (run npm run diagrams after changing it)", () => {
  for (const [file, draw] of Object.entries(DIAGRAMS)) {
    assert.equal(readFileSync(join(LESSONS, file), "utf8"), draw(), `lessons/${file}`);
  }
});
