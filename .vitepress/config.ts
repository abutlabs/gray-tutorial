// The website: the same Markdown files as in VS Code, with a sidebar, search, copy
// buttons and dark mode. `npm run site` serves it at http://localhost:5173; GitHub Pages
// serves it at https://abutlabs.github.io/gray-tutorial/ (SITE_BASE, set by the workflow).

import { defineConfig } from "vitepress";
import type MarkdownIt from "markdown-it";
import type { ShikiTransformer } from "shiki";
import { readParts } from "../tools/lessons.ts";
import { LEGEND, writeRedirects } from "./urls.ts";

const parts = readParts();

export default defineConfig({
  title: "Gray Tutorial",
  description: "Build a JAM client in TypeScript, one Gray Paper rule at a time.",
  srcDir: "lessons",
  base: process.env.SITE_BASE ?? "/",
  cleanUrls: true,
  // Grafana and the stack are on localhost on purpose; every other link must resolve
  ignoreDeadLinks: [/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/],
  lastUpdated: false,
  markdown: { config: snippetLabels, codeTransformers: [shellComments()] },
  // pages that moved keep their old address, as a page that sends the reader on
  buildEnd: (site) => writeRedirects(site.outDir, site.site.base),
  themeConfig: {
    // every word you type must match, so "ready queue" finds the ready queue first
    search: { provider: "local", options: { miniSearch: { searchOptions: { combineWith: "AND" } } } },
    nav: [
      { text: "Glossary", link: "/glossary" },
      { text: "JAM learning", link: "https://abutlabs.github.io/jam-learning/" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/abutlabs/gray-tutorial" }],
    outline: { level: [2, 3] },
    docFooter: { prev: "Previous lesson", next: "Next lesson" },
    // in reading order, so the pager and the arrow keys walk the lessons; the glossary is an
    // appendix at the end, as in the Rust Book, and always one click away in the top bar
    sidebar: [
      { text: "Start here", link: "/" },
      ...parts.map((p) => ({
        text: p.title,
        link: `/${p.dir}/`,
        collapsed: false,
        items: p.lessons.map((l) => ({
          text: `${l.id} ${l.title.replace(/^[\d.]+\s+/, "")}`,
          link: `/${l.file.replace(/\.md$/, "")}`,
        })),
      })),
      { text: "Glossary", link: "/glossary" },
    ],
  },
});

// A label line above a code block ("**Add to** `src/x.ts`") becomes a tab on the block, and
// its bold word a link to the list of labels in 0.1 (as the Book's Ferris icons link to theirs).
// A ```text block right after a Run block is its output (tools/output.ts): it gets an Output tab.
function snippetLabels(md: MarkdownIt): void {
  const LABEL = /^\*\*(New file|Add to|Replace in|Rewrite|Run(?:, expect it to fail)?)\*\*(?: `[^`]+`)?$/;
  const KIND: Record<string, string> = {
    "New file": "new", "Add to": "add", "Replace in": "replace", "Rewrite": "rewrite",
    "Run": "run", "Run, expect it to fail": "run fails",
  };
  md.core.ruler.push("snippet-labels", (state) => {
    const t = state.tokens;
    for (let i = 0; i + 3 < t.length; i++) {
      if (t[i].type !== "paragraph_open" || t[i + 2].type !== "paragraph_close" || t[i + 3].type !== "fence") continue;
      const m = LABEL.exec(t[i + 1].content);
      if (!m) continue;
      t[i].attrJoin("class", `snippet-label ${KIND[m[1]]}`);
      const words = t[i + 1].children ?? [];
      const link = new state.Token("link_open", "a", 1);
      link.attrs = [["href", LEGEND], ["class", "snippet-legend"], ["title", "What the labels mean"]];
      const open = words.findIndex((w) => w.type === "strong_open");
      const close = words.findIndex((w) => w.type === "strong_close");
      if (open >= 0 && close > open) {
        words.splice(close + 1, 0, new state.Token("link_close", "a", -1));
        words.splice(open, 0, link);
      }
      if (m[1].startsWith("Run") && t[i + 4]?.type === "fence" && t[i + 4].info.trim() === "text") {
        const tab = new state.Token("html_block", "", 0);
        tab.content = '<p class="snippet-label output"><strong>Output</strong></p>\n';
        t.splice(i + 4, 0, tab);
      }
    }
  });
}

// A comment line in a shell block (`# prints: ...`, `# fails with: ...`) is for reading:
// the copy button leaves it out, so what you paste is only the commands.
function shellComments(): ShikiTransformer {
  return {
    name: "shell-comments",
    line(node, line) {
      const shell = /^(sh|bash|zsh|shell)$/.test(this.options.lang);
      if (shell && /^\s*#/.test(this.source.split("\n")[line - 1] ?? "")) {
        this.addClassToHast(node, "vp-copy-ignore");
      }
    },
  };
}
