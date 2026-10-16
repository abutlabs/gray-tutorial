// Where Albert shows up on the website (his faces are theme/albert.ts). He perches on a code
// block's top right corner, as Ferris sits on the Rust Book's, and a tap on him goes to
// lesson 0.1, where he's introduced:
//
//   a Run block that runs the scoreboard          tongue out
//   a Run, expect it to fail block                a mix of his other faces
//   a Break it section's last code block
//   a check (checks.ts)                           the same mix, inside the check's box
//   a quote of his, "> **Albert:** …"              the same mix, beside his words
//
// The words stand without him: VS Code's preview shows none of this, and neither does the
// e-book, which leaves out the code he sits on.

import type MarkdownIt from "markdown-it";
import type { Token } from "markdown-it";
import { albertFor, type Face, type Moment } from "./theme/albert.ts";

type Albert = { face: Face; quip: string };

const SCOREBOARD = /^npm run scoreboard$/m;
const SAYS = /^\*\*Albert:\*\* (.+)$/;
const BREAK_IT = /^Break it\b/;

/** Albert, as a link to where he's introduced, from a page at `relativePath`. The paths are
 * relative, so the build bundles his picture and the link works under any base. */
export function albertTag(relativePath: string, { face, quip }: Albert): string {
  const up = "../".repeat(relativePath.split("/").length - 1) || "./";
  return `<a class="albert" href="${up}00-start/01-what-you-will-build#albert" title="${quip}">`
    + `<img src="${up}00-start/images/01-albert-${face}.svg" alt="Albert: ${quip}" width="60" height="60"></a>`;
}

/** Picks Albert's moments on a page, in reading order, then draws him on their blocks. */
export function albert(md: MarkdownIt): void {
  md.core.ruler.push("albert", (state) => {
    const page: string = state.env?.relativePath ?? "";
    let n = 0;
    const next = (moment: Moment): Albert => albertFor(moment, page, n++);
    const t = state.tokens;
    let breaking = false; // inside a Break it section
    let lastCode: Token | undefined; // that section's last code block outside lasair's folds
    let perched = false; // a run in it already has Albert: once a section is enough
    let lasair = 0; // how deep in <details> folds
    const endSection = () => {
      if (breaking && lastCode && !perched) lastCode.meta = { ...lastCode.meta, albert: next("break") };
      breaking = perched = false;
      lastCode = undefined;
    };
    for (let i = 0; i < t.length; i++) {
      const token = t[i];
      if (token.type === "blockquote_open" && lasair === 0 && t[i + 2]?.type === "inline" && SAYS.test(t[i + 2].content)) {
        token.meta = { ...token.meta, albert: { ...next("says"), quip: SAYS.exec(t[i + 2].content)![1] } };
      } else if (token.type === "heading_open") {
        endSection();
        breaking = BREAK_IT.test(t[i + 1].content);
      } else if (token.type === "html_block") {
        lasair += (token.content.match(/<details\b/g) ?? []).length - (token.content.match(/<\/details>/g) ?? []).length;
        if (token.meta?.check) {
          // he goes in as the check's slot: CheckYourself.vue puts him in its corner
          const tag = albertTag(page, next("question"));
          const closed = / \/>\n$/;
          if (!closed.test(token.content)) throw new Error(`${page}: a check Albert can't sit in`);
          token.content = token.content.replace(closed, `>${tag}</CheckYourself>\n`);
        }
      } else if (token.type === "fence" && lasair === 0) {
        const label = t[i - 3]?.type === "paragraph_open" && t[i - 1]?.type === "paragraph_close" ? t[i - 2].content : "";
        if (label === "**Run, expect it to fail**") token.meta = { ...token.meta, albert: next("fails") };
        else if (label === "**Run**" && SCOREBOARD.test(token.content)) token.meta = { ...token.meta, albert: next("scoreboard") };
        if (token.meta?.albert) perched = true;
        if (breaking) lastCode = token;
      }
    }
    endSection();
  });

  // beside a quote of his, his words on hover too
  const quote = md.renderer.rules.blockquote_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
    const albert: Albert | undefined = tokens[idx].meta?.albert;
    if (!albert) return quote(tokens, idx, options, env, self);
    return `<blockquote class="albert-says">${albertTag(env?.relativePath ?? "", albert)}`;
  };

  // inside the block's own box, before its copy button: absolute, so he takes no room
  const fence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const html = fence(tokens, idx, options, env, self);
    const albert: Albert | undefined = tokens[idx].meta?.albert;
    if (!albert) return html;
    const opening = /^<div class="([^"]*)">/;
    if (!opening.test(html)) throw new Error(`${env?.relativePath}: a code block Albert can't sit on: ${html.slice(0, 60)}`);
    return html.replace(opening, (_, classes) => `<div class="${classes} has-albert">${albertTag(env?.relativePath ?? "", albert)}`);
  };
}
