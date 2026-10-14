// The Grafana dashboards are one overview, one dashboard per theme, a few Parts each, and
// the scoreboard's, which every Part from 2 on fills. These tests keep them one set: the
// same link bar and menus everywhere, every Part on exactly one theme, and every panel a
// lesson names on the dashboard for its Part, the overview or the scoreboard's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LESSONS, ROOT, readParts } from "./lessons.ts";

type Dashboard = {
  uid: string;
  title: string;
  links: { url: string }[];
  templating: unknown;
  panels: { type: string; title: string }[];
};

const DIR = join(ROOT, "observability", "dashboards");
const dashboards = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as Dashboard)
  .sort((a, b) => a.title.localeCompare(b.title));
const overview = dashboards.find((d) => d.uid === "gray-tutorial")!;
const scoreboard = dashboards.find((d) => d.uid === "gray-tutorial-vectors")!;
const themes = dashboards.filter((d) => d !== overview && d !== scoreboard);
const parts = readParts();
const partOf = (dir: string) => Number(dir.split("-")[0]); // "07-time-and-shuffling" → 7

/** The Parts a theme dashboard covers, from its title: "3 · Consensus (Parts 7-9)". */
function covers(d: Dashboard): number[] {
  const m = d.title.match(/\(Parts? (\d+)(?:-(\d+))?\)$/);
  assert.ok(m, `${d.title} names its Parts, like "(Parts 7-9)"`);
  const [from, to] = [Number(m[1]), Number(m[2] ?? m[1])];
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

test("every dashboard has the same link bar, to all of them in order, and the same menus", () => {
  assert.ok(overview, "the overview keeps uid gray-tutorial: the run links point to it");
  assert.equal(dashboards[0], overview, "the overview sorts first");
  const urls = dashboards.map((d) => `/d/${d.uid}`);
  for (const d of dashboards) {
    assert.deepEqual(d.links.map((l) => l.url), urls, `${d.title}: the link bar`);
    assert.deepEqual(d.links, overview.links, `${d.title}: the link bar matches the overview's`);
    assert.deepEqual(d.templating, overview.templating, `${d.title}: the client and run menus`);
  }
});

test("each Part is on exactly one theme dashboard", () => {
  assert.ok(scoreboard, "the scoreboard's dashboard keeps uid gray-tutorial-vectors");
  const seen = themes.flatMap(covers).sort((a, b) => a - b);
  assert.deepEqual(seen, parts.map((p) => partOf(p.dir)));
});

test("a panel a lesson names is on the dashboard for the lesson's Part", () => {
  for (const p of parts) {
    const theme = themes.find((d) => covers(d).includes(partOf(p.dir)))!;
    const titles = new Set([...theme.panels, ...overview.panels, ...scoreboard.panels].map((q) => q.title));
    for (const l of p.lessons) {
      const text = readFileSync(join(LESSONS, l.file), "utf8");
      for (const [, name] of text.matchAll(/\*([^*\n]+)\* panel/g)) {
        assert.ok(titles.has(name), `${l.file} names the ${name} panel: not on ${theme.title}`);
      }
    }
  }
});
