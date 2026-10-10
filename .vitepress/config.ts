// The website: the same Markdown files as in VS Code, with a sidebar, search, copy
// buttons and dark mode. `npm run site` serves it at http://localhost:5173; GitHub Pages
// serves it at https://abutlabs.github.io/gray-tutorial/ (SITE_BASE, set by the workflow).

import { defineConfig } from "vitepress";
import type MarkdownIt from "markdown-it";
import { readParts } from "../tools/lessons.ts";

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
  markdown: { config: snippetLabels },
  themeConfig: {
    search: { provider: "local" },
    nav: [{ text: "JAM learning", link: "https://abutlabs.github.io/jam-learning/" }],
    socialLinks: [{ icon: "github", link: "https://github.com/abutlabs/gray-tutorial" }],
    outline: { level: [2, 3] },
    docFooter: { prev: "Previous lesson", next: "Next lesson" },
    sidebar: [
      { text: "Start here", link: "/" },
      { text: "Glossary", link: "/glossary" },
      ...parts.map((p) => ({
        text: p.title,
        link: `/${p.dir}/`,
        collapsed: false,
        items: p.lessons.map((l) => ({
          text: `${l.id} ${l.title.replace(/^[\d.]+\s+/, "")}`,
          link: `/${l.file.replace(/\.md$/, "")}`,
        })),
      })),
    ],
  },
});

// A label line above a code block ("**Add to** `src/x.ts`") becomes a tab on the block.
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
      if (m) t[i].attrJoin("class", `snippet-label ${KIND[m[1]]}`);
    }
  });
}
