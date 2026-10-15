// An Add to / Replace in step on the website shows the whole file after it (config.ts,
// stepViews): the lines the step adds or changes highlighted, the rest dimmed, so where the
// step goes is never a guess. A long run of unchanged lines folds to one line, "⋯ 42
// unchanged lines", that a tap opens (theme/eye.ts). The folded lines are in the page as
// plain text, so the copy button copies the whole file, folded or not. The eye in the
// corner swaps in just the step's own lines, the snippet, and back.

import type { Snapshot } from "../tools/snapshots.ts";

/** Unchanged lines kept open on each side of a change. */
export const CONTEXT = 3;
/** A shorter run of unchanged lines stays open: folding it would hide less than it saves. */
export const SHORTEST_FOLD = 6;

/** The runs [from, to) of a file's lines that fold: unchanged, CONTEXT away from any change. */
export function folds(count: number, changed: Set<number>): [number, number][] {
  const near = new Array<boolean>(count).fill(false);
  for (const c of changed) {
    for (let k = Math.max(0, c - CONTEXT); k <= Math.min(count - 1, c + CONTEXT); k++) near[k] = true;
  }
  const out: [number, number][] = [];
  for (let k = 0; k < count; ) {
    if (near[k]) { k++; continue; }
    let end = k;
    while (end < count && !near[end]) end++;
    if (end - k >= SHORTEST_FOLD) out.push([k, end]);
    k = end;
  }
  return out;
}

/** A file's lines, without the empty one after its last newline. */
export const linesOf = (snap: Snapshot): string[] => (snap.lines.at(-1) === "" ? snap.lines.slice(0, -1) : snap.lines);

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

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The eye: on the whole file, it shows just the step; on the step, the whole file again. */
export function eyeButton(onWhole: boolean, path: string): string {
  const says = onWhole ? "Show just this step's lines" : `Show the whole ${path}`;
  return `<button type="button" class="eye" aria-pressed="${!onWhole}" title="${escape(says)}" aria-label="${escape(says)}">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${onWhole ? "" : '<path d="M3 3l18 18"/>'}</svg></button>`;
}

/**
 * A step as the website shows it: `wholeHtml` is the whole file as the site's code block,
 * its changed lines highlighted ({…}), and `snippetHtml` the step's own block. The whole
 * file comes first, folded, with the eye; the snippet after it, hidden until the eye's tap.
 */
export function stepView(wholeHtml: string, snippetHtml: string, snap: Snapshot): string {
  const lines = linesOf(snap);
  const code = /<code>([\s\S]*)<\/code>/.exec(wholeHtml);
  const shown = code?.[1].split("\n");
  if (!code || !shown || shown.length !== lines.length) {
    throw new Error(`${snap.path}: the highlighted file has ${shown?.length} lines, not ${lines.length}`);
  }
  for (const [from, to] of folds(lines.length, snap.changed).reverse()) {
    const n = to - from;
    const bar = `<span class="line fold vp-copy-ignore"><button type="button" class="unfold">⋯ ${n} unchanged lines</button></span>`;
    shown.splice(from, n, `${bar}<span class="folded" hidden>${escape(lines.slice(from, to).join("\n"))}</span>`);
  }
  const folded = wholeHtml.slice(0, code.index) + `<code>${shown.join("\n")}</code>` + wholeHtml.slice(code.index + code[0].length);
  const whole = folded.replace(/^<div class="([^"]*)">/, (_, c) => `<div class="${c} whole-step">${eyeButton(true, snap.path)}`);
  const step = snippetHtml.replace(/^<div class="([^"]*)">/, (_, c) => `<div class="${c} step-only">${eyeButton(false, snap.path)}`);
  return whole + step;
}
