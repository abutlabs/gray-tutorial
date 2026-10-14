// The whole file after each Add to / Replace in snippet, behind the eye on the snippet's code
// block (theme/eye.ts): highlighted as the site highlights code, its changed lines marked.
// Each is a file of its own, fetched when its eye is first tapped: in the page, 369 whole
// files would make a lesson megabytes heavier. `npm run site` serves them as they're asked
// for; the build writes them all, to whole/<lesson>/<label line>.html.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createMarkdownRenderer } from "vitepress";
import type { Plugin } from "vite";
import type { Snapshot } from "../tools/snapshots.ts";

/** Where a snippet's whole file is, under the site's base: its lesson, then its label's line. */
export const wholeAddress = (key: string): string => {
  const [file, line] = key.split(":");
  return `whole/${file.replace(/\.md$/, "")}/${line}.html`;
};
export const keyOf = (address: string): string | undefined => {
  const m = /^whole\/(.+)\/(\d+)\.html$/.exec(address);
  return m ? `${m[1]}.md:${m[2]}` : undefined;
};

/** The eye, on the snippet (to show the whole file, from `src`) or on the whole file (to go back). */
export function eyeButton(onWhole: boolean, path: string, src = ""): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const says = onWhole ? "Show just this step" : `Show the whole ${path}`;
  return `<button type="button" class="eye" aria-pressed="${onWhole}" title="${escape(says)}" aria-label="${escape(says)}"`
    + `${src ? ` data-whole="${escape(src)}"` : ""}>`
    + `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${onWhole ? '<path d="M3 3l18 18"/>' : ""}</svg></button>`;
}

/** 1-based line numbers as VitePress's {…} after a fence's language: 3, 5, 6, 7 → "3,5-7". */
export function lineRanges(lines: number[]): string {
  const sorted = [...lines].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let k = 0; k < sorted.length; k++) {
    const from = sorted[k];
    while (sorted[k + 1] === sorted[k] + 1) k++;
    ranges.push(from === sorted[k] ? `${from}` : `${from}-${sorted[k]}`);
  }
  return ranges.join(",");
}

type Renderer = Awaited<ReturnType<typeof createMarkdownRenderer>>;
let renderer: Promise<Renderer> | undefined;

/** A snapshot as the site's code block, with the eye that goes back to the snippet. */
export async function wholeFileHtml(snap: Snapshot, srcDir: string, base: string): Promise<string> {
  renderer ??= createMarkdownRenderer(srcDir, {}, base);
  const md = await renderer;
  const lines = snap.lines.at(-1) === "" ? snap.lines.slice(0, -1) : snap.lines;
  const content = lines.join("\n");
  // a fence longer than any run of backticks in the file, so none of them ends it
  const fence = "`".repeat(Math.max(3, ...(content.match(/`+/g) ?? []).map((b) => b.length + 1)));
  const language = snap.path.split(".").pop();
  const html = md.render(`${fence}${language}{${lineRanges([...snap.changed].map((k) => k + 1))}}\n${content}\n${fence}\n`);
  return html.replace(/^<div class="([^"]*)">/, (_, classes) => `<div class="${classes} whole-file">${eyeButton(true, snap.path)}`);
}

/** Every whole file, into the built site. */
export async function writeWholeFiles(outDir: string, srcDir: string, base: string, whole: Map<string, Snapshot>): Promise<void> {
  for (const [key, snap] of whole) {
    const file = join(outDir, wholeAddress(key));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, await wholeFileHtml(snap, srcDir, base));
  }
}

/** `npm run site`: each whole file made when it's asked for. */
export function serveWholeFiles(srcDir: string, base: string, whole: Map<string, Snapshot>): Plugin {
  return {
    name: "the-gray-tutor:whole-files",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        const snap = path.startsWith(base) ? whole.get(keyOf(path.slice(base.length)) ?? "") : undefined;
        if (!snap) return next();
        wholeFileHtml(snap, srcDir, base).then((html) => {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(html);
        }, next);
      });
    },
  };
}
