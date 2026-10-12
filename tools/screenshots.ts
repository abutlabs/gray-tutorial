// Takes the lessons' screenshots (visual tutorial verification, WRITING.md). For each
// lesson below it follows the tutorial up to that lesson and runs it (verify, as client
// "tutorial-check"), finds that lesson's run of each panel's kind in Loki, and has headless
// Chrome photograph that one panel. Needs the stack up (obs up) and Google Chrome.
//
//   npm run screenshots            every picture
//   npm run screenshots -- 5.1     only lesson 5.1's
//
// The pictures land in each part's images/ folder, named for their lesson and panel
// (lesson 5.1's Chain panel: 05-hashing-and-signatures/images/01-chain.png).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { LESSONS, ROOT, readLessons } from "./lessons.ts";

/** A picture: a lesson's panel, from that lesson's last run of its kind, or its nth. */
type Shot = { lesson: string; panel: string; nth?: number };

const SHOTS: Shot[] = [
  { lesson: "0.4", panel: "Failed tests", nth: 2 }, // the planted bug's failing run
  { lesson: "1.1", panel: "Failed tests", nth: 2 },
  { lesson: "2.2", panel: "Failed tests", nth: 2 },
  { lesson: "2.7", panel: "Decode trace" },
  { lesson: "3.2", panel: "Failed tests", nth: 2 },
  { lesson: "4.7", panel: "Decode trace" },
  { lesson: "5.1", panel: "Failed tests", nth: 2 },
  { lesson: "5.1", panel: "Chain" },
  { lesson: "5.2", panel: "Chain" },
  { lesson: "5.3", panel: "Assurances" },
  { lesson: "6.1", panel: "State trie" },
  { lesson: "6.2", panel: "State trie" },
  { lesson: "6.3", panel: "Reading σ" },
  { lesson: "7.1", panel: "Epochs" },
  { lesson: "7.2", panel: "Shuffle" },
  { lesson: "8.1", panel: "Entropy" },
  { lesson: "8.2", panel: "Validator rotation" },
  { lesson: "8.3", panel: "Sealers" },
  { lesson: "8.4", panel: "Lottery" },
  { lesson: "8.5", panel: "Safrole" },
  { lesson: "8.6", panel: "VRF output" },
  { lesson: "8.7", panel: "Safrole" },
  { lesson: "8.9", panel: "Seals" },
  { lesson: "9.1", panel: "Belt" },
  { lesson: "9.2", panel: "Recent history" },
  { lesson: "10.1", panel: "Verdicts" },
  { lesson: "10.2", panel: "Offenders" },
  { lesson: "10.3", panel: "Cores" },
  { lesson: "10.4", panel: "Dispute checks" },
  { lesson: "10.5", panel: "Dispute checks" },
  { lesson: "11.1", panel: "Availability" },
  { lesson: "11.2", panel: "Releases" },
  { lesson: "11.3", panel: "Assurance checks" },
  { lesson: "12.1", panel: "Guarantors" },
  { lesson: "12.2", panel: "Reporters" },
  { lesson: "12.3", panel: "Placed" },
  { lesson: "12.4", panel: "Guarantee checks" },
  { lesson: "12.5", panel: "Guarantee checks" },
  { lesson: "13.1", panel: "Authorizer pools" },
  { lesson: "14.1", panel: "Preimages" },
  { lesson: "14.2", panel: "Service" },
  { lesson: "15.1", panel: "Program" },
  { lesson: "15.2", panel: "Disassembly" },
  { lesson: "15.3", panel: "PVM run" },
  { lesson: "15.4", panel: "Memory" },
  { lesson: "15.5", panel: "ALU" },
  { lesson: "15.6", panel: "Branches" },
  { lesson: "15.7", panel: "Bits" },
  { lesson: "15.8", panel: "A real program starts" },
  { lesson: "15.9", panel: "Costs" },
  { lesson: "15.10", panel: "Pipeline" },
  { lesson: "15.11", panel: "Gas" },
  { lesson: "16.1", panel: "Host calls" },
  { lesson: "16.2", panel: "Host calls" },
  { lesson: "16.3", panel: "Host calls" },
  { lesson: "16.7", panel: "Accumulate" },
  { lesson: "16.8", panel: "Accumulate" },
  { lesson: "17.1", panel: "Accumulate" },
  { lesson: "17.2", panel: "Accumulate" },
  { lesson: "17.3", panel: "Host calls" },
  { lesson: "17.4", panel: "Accumulate" },
  { lesson: "17.5", panel: "Host calls" },
  { lesson: "17.6", panel: "Accumulate" },
  { lesson: "17.7", panel: "Host calls" },
  { lesson: "17.9", panel: "Accumulate" },
  { lesson: "17.11", panel: "Accumulate" },
  { lesson: "18.1", panel: "Validator statistics" },
  { lesson: "18.2", panel: "Core and service activity" },
  { lesson: "19.1", panel: "Block import plan" },
  { lesson: "19.2", panel: "Whole state" },
  { lesson: "19.4", panel: "Block import" },
  { lesson: "19.6", panel: "Block import" },
];

const LOKI = "http://127.0.0.1:3100";
const GRAFANA = "http://127.0.0.1:3300";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CLIENT = "tutorial-check"; // verify's client: the reader's own runs stay apart
const WIDTH = 960; // CSS pixels; the picture is twice that, sharp on any screen
const SCALE = 2;
const FOOTER = 88; // the empty strip Grafana leaves below a lone panel, cut off

type Panel = { uid: string; id: number; title: string; height: number; kind: string };

/** Every logs panel on the dashboards, by title; theme dashboards before the overview. */
function panels(): Map<string, Panel> {
  const dir = join(ROOT, "observability", "dashboards");
  const out = new Map<string, Panel>();
  for (const f of readdirSync(dir).sort().reverse()) { // gray-tutorial.json last
    const d = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const p of d.panels) {
      const kind = /kind="([^"]+)"/.exec(p.targets?.[0]?.expr ?? "")?.[1];
      if (p.type !== "logs" || !kind || out.has(p.title)) continue;
      out.set(p.title, { uid: d.uid, id: p.id, title: p.title, height: p.gridPos.h * 38 - 8, kind });
    }
  }
  return out;
}

/** The runs of one kind that started at or after a time, oldest first. */
async function runsSince(kind: string, since: number): Promise<string[]> {
  const query = `{job="gray_tutorial", client="${CLIENT}", kind="${kind}"}`;
  const url = `${LOKI}/loki/api/v1/label/run_id/values?query=${encodeURIComponent(query)}`
    + `&start=${since - 60_000}000000`;
  const ids = ((await (await fetch(url)).json()) as { data?: string[] }).data ?? [];
  const at = (id: string) => Number(id.split("-").at(-1));
  return ids.filter((id) => at(id) >= since).sort((a, b) => at(a) - at(b));
}

/** A PNG's pixels as stored: one row after another, each with its filter byte. */
type Png = { width: number; height: number; channels: number; rows: Buffer };

function readPng(png: Buffer): Png {
  const chunks: { type: string; data: Buffer }[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    chunks.push({ type: png.toString("latin1", at + 4, at + 8), data: png.subarray(at + 8, at + 8 + length) });
    at += 12 + length;
  }
  const ihdr = chunks[0].data;
  if (ihdr[8] !== 8 || ihdr[12] !== 0) throw new Error("expected an 8-bit, non-interlaced PNG");
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr[9] as 0 | 2 | 4 | 6];
  const rows = inflateSync(Buffer.concat(chunks.filter((c) => c.type === "IDAT").map((c) => c.data)));
  return { width: ihdr.readUInt32BE(0), height: ihdr.readUInt32BE(4), channels, rows };
}

/** The first `height` rows as a PNG. Each row is filtered against the one above only,
 * so rows cut off the bottom take nothing from the rows kept. */
function writePng(p: Png, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(p.width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = { 1: 0, 3: 2, 2: 4, 4: 6 }[p.channels as 1 | 2 | 3 | 4];
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "latin1");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
  };
  const kept = p.rows.subarray(0, height * (1 + p.width * p.channels));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(kept, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/** The pixels themselves: each row's filter undone (PNG's five filters). */
function unfilter(p: Png): Uint8Array {
  const [bpp, row] = [p.channels, p.width * p.channels];
  const out = new Uint8Array(p.height * row);
  const paeth = (a: number, b: number, c: number) => {
    const [pa, pb, pc] = [Math.abs(b - c), Math.abs(a - c), Math.abs(a + b - 2 * c)];
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < p.height; y++) {
    const [filter, src, dst] = [p.rows[y * (row + 1)], y * (row + 1) + 1, y * row];
    for (let x = 0; x < row; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y > 0 ? out[dst - row + x] : 0;
      const c = x >= bpp && y > 0 ? out[dst - row + x - bpp] : 0;
      const guess = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1
        : filter === 4 ? paeth(a, b, c) : 0;
      out[dst + x] = (p.rows[src + x] + guess) & 255;
    }
  }
  return out;
}

/** How many rows to keep: down to the last row with anything on it, plus a margin. The
 * background is the commonest colour; the panel's own border (the outer rows and columns)
 * doesn't count as anything. */
function contentHeight(p: Png): number {
  const [px, row] = [unfilter(p), p.width * p.channels];
  const colour = (y: number, x: number) => px.subarray(y * row + x * p.channels, y * row + x * p.channels + 3);
  const counts = new Map<string, number>();
  for (let y = 0; y < p.height; y += 4) for (let x = 0; x < p.width; x += 4) {
    const k = colour(y, x).join();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const bg = [...counts].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number);
  const edge = 6 * SCALE;
  for (let y = p.height - 1 - edge; y > 0; y--) {
    for (let x = edge; x < p.width - edge; x++) {
      const c = colour(y, x);
      if (Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]) > 24) {
        return Math.min(p.height, y + 14 * SCALE);
      }
    }
  }
  return p.height;
}

/** One panel, filtered to one run, photographed alone. */
function photograph(panel: Panel, run: string, file: string) {
  const start = Number(run.split("-").at(-1));
  const url = `${GRAFANA}/d-solo/${panel.uid}?orgId=1&panelId=${panel.id}&theme=dark`
    + `&var-client=${CLIENT}&var-run_id=${run}&from=${start - 60_000}&to=${start + 3_600_000}`;
  const tmp = join(mkdtempSync(join(tmpdir(), "gray-shot-")), "shot.png");
  const chrome = spawnSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
    `--force-device-scale-factor=${SCALE}`, `--window-size=${WIDTH},${panel.height + FOOTER}`,
    "--virtual-time-budget=15000", `--screenshot=${tmp}`, url], { encoding: "utf8" });
  if (chrome.status !== 0) throw new Error(`Chrome failed on ${url}: ${chrome.stderr}`);
  mkdirSync(dirname(file), { recursive: true });
  const shot = readPng(readFileSync(tmp));
  const panelOnly = { ...shot, height: panel.height * SCALE }; // without Grafana's footer
  writeFileSync(file, writePng(panelOnly, contentHeight(panelOnly)));
}

const only = process.argv[2];
const byTitle = panels();
const lessons = readLessons();
for (const l of lessons) {
  const shots = SHOTS.filter((s) => s.lesson === l.id && (!only || only === l.id));
  if (shots.length === 0) continue;
  const since = Date.now();
  const verify = spawnSync("node", [join(ROOT, "tools", "verify.ts"), l.id, l.id], { encoding: "utf8" });
  if (verify.status !== 0) throw new Error(`verify ${l.id} failed:\n${verify.stdout}${verify.stderr}`);
  for (const s of shots) {
    const panel = byTitle.get(s.panel);
    if (!panel) throw new Error(`${l.id}: no logs panel titled ${s.panel}`);
    const runs = await runsSince(panel.kind, since);
    const run = s.nth ? runs[s.nth - 1] : runs.at(-1);
    if (!run) throw new Error(`${l.id}: no run of kind ${panel.kind} (${runs.length} runs)`);
    const slug = s.panel.toLowerCase().replace(/σ/g, "sigma").replace(/[^a-z0-9]+/g, "-");
    const file = join(LESSONS, dirname(l.file), "images", `${basename(l.file).slice(0, 2)}-${slug}.png`);
    photograph(panel, run, file);
    console.log(`${l.id}  ${s.panel}  ${run}  ${file.slice(LESSONS.length + 1)}`);
  }
}
