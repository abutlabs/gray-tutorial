// A Run's output, as the lesson shows it: a ```text block right after the Run block, as
// the Rust Book shows every run's output. verify checks it against the real run:
//
//   - its lines are the real output's lines, in order and one after another (blank lines,
//     npm's warnings and npm run's echo of the script aside), from the first line to the last;
//   - a line "..." (at its start) marks a cut: any lines may come there (also at the
//     start or the end);
//   - "…" inside a line stands for anything (a slot number, a hash that changes);
//   - times, durations, run ids, the client's name in links and paths into the client are
//     masked on both sides, so real output can be pasted as it is (verify saves every
//     run's in .verify-output/).

/** One line as a reader would paste it: no colours, and paths into the client shortened. */
export function tidy(line: string): string {
  return line
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/(?:file:\/\/)?\/[^\s'"`]*?\/(?:\.tangled|client)\//g, "…/client/")
    .trimEnd();
}

/** One line with what changes from run to run masked. */
export function normalize(line: string): string {
  return tidy(line)
    .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z?/g, "<time>")
    .replace(/\b\d+(\.\d+)?ms\b/g, "<ms>")
    .replace(/\bduration_ms \d+(\.\d+)?/g, "duration_ms <ms>")
    .replace(/\b([a-z][a-z-]*)-\d{13}\b/g, "$1-<run>") // run ids: kind-<ms since 1970>
    .replace(/var-client=[^&\s]+/g, "var-client=<client>"); // the reader's is "you"
}

/** Why the shown output isn't the real one, or null if it is. */
export function checkOutput(shown: string, real: string): string | null {
  // blank lines don't count, nor npm's warnings, which come from each machine's npm settings,
  // nor npm run's echo of the script ("> decode", "> node bin/decode.ts ..."): the Run block
  // shows the command already, so a lesson may leave the echo out
  const kept = (l: string) => l.trim() !== "" && !l.startsWith("npm warn ") && !/^> \S/.test(l);
  const have = real.split("\n").map(normalize).filter(kept);
  const want = shown.split("\n").map(normalize).filter(kept);
  let at = 0;
  let cut = false;
  for (const line of want) {
    if (line === "...") { // at the start of the line; an indented "..." is output (Node prints some)
      cut = true;
      continue;
    }
    const pattern = new RegExp(`^${line.split("…").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    let found = -1;
    for (let k = at; k < have.length && (cut || k === at); k++) {
      if (pattern.test(have[k])) {
        found = k;
        break;
      }
    }
    if (found < 0) {
      const next = have[at] === undefined ? "the output had ended" : `the output had: ${have[at]}`;
      return cut ? `not in the output: ${line}` : `${line}\n  expected here, but ${next} (mark a cut with ...)`;
    }
    at = found + 1;
    cut = false;
  }
  if (!cut && at < have.length) return `the output goes on after the last line shown (end with ... to cut): ${have[at]}`;
  return null;
}
