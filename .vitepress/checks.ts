// A lesson's understanding check: questions written in the Markdown, so they read as a plain
// list in VS Code, and become tappable on the website (theme/CheckYourself.vue).
//
//   ::: check
//   **Why is `service` written `04 03 02 01`?**
//
//   - [ ] The JSON stores it backwards
//     > No: the JSON says 16909060, which is 0x01020304 ...
//   - [x] ℰ₄ writes the least significant byte first
//     > Yes: ...
//   :::
//
// Every option says why it is right or wrong: a wrong answer teaches most when it's explained.

import type MarkdownIt from "markdown-it";

export type CheckOption = { text: string; right: boolean; why: string };
export type CheckQuestion = { question: string; options: CheckOption[] };

export const OPEN = "::: check";
export const CLOSE = ":::";

/** The questions between `::: check` and `:::`, or an error saying which line is wrong. */
export function parseCheck(lines: string[]): CheckQuestion[] {
  const questions: CheckQuestion[] = [];
  let option: CheckOption | undefined;
  for (const [i, line] of lines.entries()) {
    const where = `check line ${i + 1}: ${line}`;
    if (line.trim() === "") continue;
    const q = /^\*\*(.+)\*\*$/.exec(line);
    const o = /^- \[( |x)\] (.+)$/.exec(line);
    const why = /^ {2}> (.+)$/.exec(line);
    if (q) {
      questions.push({ question: q[1], options: [] });
      option = undefined;
    } else if (o) {
      const current = questions.at(-1);
      if (!current) throw new Error(`${where}: an option before any question`);
      option = { text: o[2], right: o[1] === "x", why: "" };
      current.options.push(option);
    } else if (why) {
      if (!option) throw new Error(`${where}: a reason before any option`);
      option.why += (option.why ? " " : "") + why[1];
    } else {
      throw new Error(`${where}: not a question (**…**), an option (- [ ] or - [x]) or a reason (  > …)`);
    }
  }
  return questions;
}

/** What makes a check fair: 2 to 5 options, exactly one right, and a reason for every one. */
export function checkProblems(questions: CheckQuestion[]): string[] {
  const problems: string[] = [];
  if (questions.length === 0) problems.push("a check with no questions");
  for (const { question, options } of questions) {
    if (options.length < 2 || options.length > 5) problems.push(`"${question}": ${options.length} options, not 2 to 5`);
    const right = options.filter((o) => o.right).length;
    if (right !== 1) problems.push(`"${question}": ${right} right answers, not 1`);
    for (const o of options) if (!o.why) problems.push(`"${question}": "${o.text}" says nothing about why`);
  }
  return problems;
}

/** Every `::: check` block in a lesson's Markdown, by the line it opens on (1-based). */
export function checksIn(markdown: string): { line: number; questions: CheckQuestion[] }[] {
  const lines = markdown.split("\n");
  const found: { line: number; questions: CheckQuestion[] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== OPEN) continue;
    const end = lines.findIndex((l, j) => j > i && l.trim() === CLOSE);
    if (end < 0) throw new Error(`line ${i + 1}: a check that never closes with ${CLOSE}`);
    found.push({ line: i + 1, questions: parseCheck(lines.slice(i + 1, end)) });
    i = end;
  }
  return found;
}

/** Turns each `::: check` block into the CheckYourself widget, its text rendered as Markdown. */
export function checkBlocks(md: MarkdownIt): void {
  md.block.ruler.before("fence", "check", (state, startLine, endLine, silent) => {
    const line = (n: number) => state.src.slice(state.bMarks[n] + state.tShift[n], state.eMarks[n]);
    if (line(startLine).trim() !== OPEN) return false;
    let end = startLine + 1;
    while (end < endLine && line(end).trim() !== CLOSE) end++;
    if (end >= endLine) return false;
    if (silent) return true;
    // the raw lines, indentation kept: a reason is the two spaces then >
    const raw = [];
    for (let n = startLine + 1; n < end; n++) raw.push(state.src.slice(state.bMarks[n], state.eMarks[n]));
    const questions = parseCheck(raw);
    const problems = checkProblems(questions);
    if (problems.length > 0) throw new Error(`${state.env?.relativePath ?? "a lesson"}: ${problems.join("; ")}`);
    const inline = (s: string) => md.renderInline(s, state.env);
    const rendered = questions.map((q) => ({
      question: inline(q.question),
      options: q.options.map((o) => ({ text: inline(o.text), right: o.right, why: inline(o.why) })),
    }));
    const token = state.push("html_block", "", 0);
    token.content = `<CheckYourself data="${encodeURIComponent(JSON.stringify(rendered))}" />\n`;
    token.map = [startLine, end + 1];
    token.meta = { check: true }; // Albert sits in it (albert.ts)
    state.line = end + 1;
    return true;
  }, { alt: ["paragraph", "reference", "blockquote", "list"] });
}
