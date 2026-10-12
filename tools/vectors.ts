// Fetches the official JAM test vectors into vectors/: the v0.8.0 tag of
// davxy/jam-test-vectors, which follows Gray Paper 0.8.0. Only the folders the
// tutorial uses are checked out (about 1.4 GB); the 4 GB of fuzzer traces are left out.
//
//   npm run vectors

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lessons.ts";

const URL = "https://github.com/davxy/jam-test-vectors.git";
const TAG = "v0.8.0";
const COMMIT = "d3c089c9a1d5352ad353626d7a2db8589f137b2a"; // what TAG pointed to when the tutorial was written
const FOLDERS = [
  "lib", "codec", "trie", "shuffle", "erasure", "stf",
  "traces/fallback", "traces/safrole", "traces/storage", "traces/storage_light",
  "traces/preimages", "traces/preimages_light", "traces/fuzzy", "traces/fuzzy_light",
];
const DIR = join(ROOT, "vectors");

function git(...args: string[]): string {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
  return r.stdout.trim();
}

if (!existsSync(join(DIR, ".git"))) {
  console.log(`cloning ${URL} at ${TAG} (only the history of that one commit)...`);
  git("clone", "--filter=blob:none", "--no-checkout", "--depth", "1", "--branch", TAG, URL, "vectors");
}
git("-C", DIR, "sparse-checkout", "set", ...FOLDERS);
console.log("checking out the folders the tutorial uses...");
git("-C", DIR, "checkout", "--quiet", TAG);
const head = git("-C", DIR, "rev-parse", "HEAD");
if (head !== COMMIT) {
  console.log(`warning: ${TAG} is now ${head}, not ${COMMIT} as when the lessons were checked.`);
}
console.log(`vectors/ is ready: ${TAG} (${head.slice(0, 8)}).`);
