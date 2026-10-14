// Runs before the tutorial's commands. The tools are TypeScript, which Node runs only from
// the version in .nvmrc on, and an older Node fails with a puzzling error ("Unknown file
// extension .ts", "Could not find tools/*.test.ts"). This says plainly what to do instead.
// Plain JavaScript on purpose: it has to run on the old Node too.
import { readFileSync } from "node:fs";

const need = Number(readFileSync(new URL("../.nvmrc", import.meta.url), "utf8").trim());
const have = Number(process.versions.node.split(".")[0]);
if (have < need) {
  console.error(`The Gray Tutor needs Node ${need}, and this terminal has ${process.version}.`);
  console.error("Run `nvm use` in this folder, then try again.");
  process.exit(1);
}
