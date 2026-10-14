<!-- Lesson 5.2: the extrinsic hash on a small made-up block. Five parts → five hashes → one
     root. Change a value and watch which hashes change; then prove one report was in the
     block from the report, the guarantees part and four hashes. extrinsic-hash.ts computes
     every hash, with real Blake2b. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { apply, ATTEMPTS, BLOCK, bytesHashed, changes, checkProof, CORES, EMPTY, encodeParts, extrinsicHash, extrinsicSize, forge, FORGERIES, partHashes, PARTS, proofOf, proofSize } from "./extrinsic-hash.ts";
import type { Edit, Extrinsic, Forgery } from "./extrinsic-hash.ts";
import { H, spaced } from "./hash.ts";

const GOALS = [
  { id: "preimage", say: "change one preimage byte: see which hashes change" },
  { id: "tickets", say: "make the root change without touching tickets' hash" },
  { id: "prove", say: "prove report 1 without showing report 2" },
  { id: "empty", say: "empty the block: its root is the one every fallback block carries" },
];
const FORGED_SAY: Record<Forgery, string> = {
  report: "a byte of the report",
  "other report": "the other report's hash",
  slot: "the guarantee's slot",
  "tickets hash": "the tickets' hash",
};

const block = ref<Extrinsic>(BLOCK);
const previous = ref<Extrinsic | null>(null);
const mode = ref<"block" | "proof">("block");
const proving = ref(0);
const forged = ref(new Set<Forgery>());
const reached = ref(new Set<string>());

const parts = computed(() => encodeParts(block.value));
const hashes = computed(() => partHashes(block.value));
const root = computed(() => extrinsicHash(block.value));
const diff = computed(() => (previous.value ? changes(previous.value, block.value) : null));
const changedSay = computed(() => {
  const d = diff.value;
  if (!d) return "—";
  const names = PARTS.filter((_, i) => d.parts[i]);
  if (!d.root) return "nothing";
  return [names.length > 1 ? `${names.length} parts` : names, "root"].flat().join(" + ");
});
const isEmpty = computed(() => PARTS.slice(0, 4).every((_, i) => parts.value[i].length === 1));

const canProve = computed(() => block.value.guarantees.length > 0);
const honest = computed(() => (canProve.value ? proofOf(block.value, Math.min(proving.value, block.value.guarantees.length - 1)) : null));
const proof = computed(() => (honest.value ? [...forged.value].reduce(forge, honest.value) : null));
const check = computed(() => (proof.value ? checkProof(proof.value, root.value) : null));
const other = computed(() => 1 - proving.value);

const short = (bytes: number[], n = 4) => spaced(bytes.slice(0, n)).replace(/ /g, "");
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
const fmt = (n: number) => n.toLocaleString("en-US");
const same = (a: number[], b: number[]) => a.every((x, i) => x === b[i]);

const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
function edit(e: Edit) {
  previous.value = block.value;
  block.value = apply(block.value, e);
  const d = diff.value!;
  if (e.kind === "blob") mark("preimage");
  if (d.root && !d.parts[0]) mark("tickets");
}
function load(x: Extrinsic) {
  previous.value = block.value;
  block.value = x;
  forged.value = new Set();
  if (x === EMPTY) { mark("empty"); mode.value = "block"; }
}
function setMode(m: "block" | "proof") {
  mode.value = m;
  forged.value = new Set();
  provedCheck();
}
function prove(i: number) {
  proving.value = i;
  forged.value = new Set();
  provedCheck();
}
function toggle(f: Forgery) {
  const next = new Set(forged.value);
  if (next.has(f)) next.delete(f); else next.add(f);
  forged.value = next;
  provedCheck();
}
/** The proof goal counts when the reader's own choice shows report 1's honest proof holding. */
function provedCheck() {
  if (mode.value === "proof" && proving.value === 0 && check.value?.ok && proof.value!.guarantees.length > 1) mark("prove");
}
const touched = (i: number) => diff.value?.parts[i] ?? false;
</script>

<template>
  <div class="widget extrinsic-commit">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">root, the extrinsic hash</span><span class="tile-value bytes">{{ short(root) }}…</span></div>
      <div class="tile changed"><span class="tile-label">changed by the last change</span><span class="tile-value">{{ changedSay }}</span></div>
      <div class="tile"><span class="tile-label">bytes hashed</span><span class="tile-value">{{ fmt(bytesHashed(block)) }}</span></div>
    </div>
    <p class="range">
      The header's extrinsic hash, in three steps: encode each of the five parts, hash each (five 32-byte hashes), glue
      the five (160 bytes) and hash that. A preimage goes in as its requester and its data's hash; a guarantee as its
      report's hash, slot and signatures. This block is small and made up (tiny: 2 cores), its reports a few bytes
      standing in for hundreds; every hash is real Blake2b.
    </p>
    <div class="controls">
      <button class="small" :class="{ chosen: mode === 'block' }" :aria-pressed="mode === 'block'" @click="setMode('block')">change the block</button>
      <button class="small" :class="{ chosen: mode === 'proof' }" :aria-pressed="mode === 'proof'" :disabled="!canProve" @click="setMode('proof')">prove one report</button>
      <button class="small" @click="load(BLOCK)">the made-up block</button>
      <button class="small" @click="load(EMPTY)">an empty block</button>
    </div>

    <template v-if="mode === 'block'">
      <p class="line">Tap a value to change it. A changed hash is marked; the others stay as they were.</p>
      <ol class="parts">
        <li class="part" :class="{ hit: touched(0) }">
          <div class="head"><b>1 · tickets</b><span>{{ fmt(parts[0].length) }} bytes encoded</span></div>
          <div v-for="(t, i) in block.tickets" :key="i" class="item">
            ticket {{ i + 1 }}: attempt
            <button class="small val" :aria-label="`ticket ${i + 1}'s attempt, ${t.attempt} of 0 to ${ATTEMPTS - 1}: tap to change`" @click="edit({ kind: 'attempt', ticket: i })">{{ t.attempt }}</button>
            <span class="dim">and a {{ t.signature.length }}-byte proof</span>
          </div>
          <div v-if="!block.tickets.length" class="item dim">none: just the count, 00</div>
          <div class="out" :class="{ hit: touched(0) }">→ H = <span class="bytes">{{ short(hashes[0], 8) }}…</span></div>
        </li>
        <li class="part" :class="{ hit: touched(1) }">
          <div class="head"><b>2 · preimages</b><span>{{ fmt(parts[1].length) }} bytes encoded</span></div>
          <div v-for="(p, i) in block.preimages" :key="i" class="item">
            service {{ p.requester }}'s data:
            <span class="cells">
              <button v-for="(b, k) in p.blob" :key="k" class="cell-btn unit-byte" :aria-label="`data byte ${k}, ${spaced([b])}: tap to add 1`"
                @click="edit({ kind: 'blob', preimage: i, byte: k })">{{ spaced([b]) }}</button>
            </span>
            <span class="twist">goes in as its requester and H(data) = <span class="bytes">{{ short(H(p.blob)) }}…</span></span>
          </div>
          <div v-if="!block.preimages.length" class="item dim">none: just the count, 00</div>
          <div class="out" :class="{ hit: touched(1) }">→ H = <span class="bytes">{{ short(hashes[1], 8) }}…</span></div>
        </li>
        <li class="part" :class="{ hit: touched(2) }">
          <div class="head"><b>3 · guarantees</b><span>{{ fmt(parts[2].length) }} bytes encoded</span></div>
          <div v-for="(g, i) in block.guarantees" :key="i" class="item">
            report {{ i + 1 }} ({{ g.report.length }} bytes):
            <span class="cells">
              <button v-for="(b, k) in g.report" :key="k" class="cell-btn unit-byte" :aria-label="`report ${i + 1} byte ${k}, ${spaced([b])}: tap to add 1`"
                @click="edit({ kind: 'report', guarantee: i, byte: k })">{{ spaced([b]) }}</button>
            </span>
            slot <button class="small val" :aria-label="`guarantee ${i + 1}'s slot, ${g.slot}: tap to add 1`" @click="edit({ kind: 'slot', guarantee: i })">{{ g.slot }}</button>
            <span class="dim">{{ plural(g.signatures.length, "signature") }}</span>
            <span class="twist">goes in as H(report) = <span class="bytes">{{ short(H(g.report)) }}…</span>, then slot and signatures</span>
          </div>
          <div v-if="!block.guarantees.length" class="item dim">none: just the count, 00</div>
          <div class="out" :class="{ hit: touched(2) }">→ H = <span class="bytes">{{ short(hashes[2], 8) }}…</span></div>
        </li>
        <li class="part" :class="{ hit: touched(3) }">
          <div class="head"><b>4 · assurances</b><span>{{ fmt(parts[3].length) }} bytes encoded</span></div>
          <div v-for="(a, i) in block.assurances" :key="i" class="item">
            validator {{ a.validator }} holds its chunks for core
            <button v-for="c in CORES" :key="c" class="small val" :class="{ chosen: (a.bitfield >> (c - 1)) & 1 }"
              :aria-pressed="((a.bitfield >> (c - 1)) & 1) === 1" :aria-label="`validator ${a.validator}, core ${c - 1}`"
              @click="edit({ kind: 'bit', assurance: i, core: c - 1 })">{{ c - 1 }} {{ (a.bitfield >> (c - 1)) & 1 ? "✓" : "·" }}</button>
          </div>
          <div v-if="!block.assurances.length" class="item dim">none: just the count, 00</div>
          <div class="out" :class="{ hit: touched(3) }">→ H = <span class="bytes">{{ short(hashes[3], 8) }}…</span></div>
        </li>
        <li class="part" :class="{ hit: touched(4) }">
          <div class="head"><b>5 · disputes</b><span>{{ parts[4].length }} bytes encoded</span></div>
          <div class="item dim">empty, as in every trace: three empty lists (verdicts, culprits, faults), 00 00 00</div>
          <div class="out" :class="{ hit: touched(4) }">→ H = <span class="bytes">{{ short(hashes[4], 8) }}…</span></div>
        </li>
      </ol>
      <div class="label">the five hashes glued together: 5 × 32 = 160 bytes</div>
      <div class="glue">
        <span v-for="(h, i) in hashes" :key="i" class="seg" :class="{ hit: touched(i) }"><small>{{ PARTS[i] }}</small><span class="bytes">{{ short(h, 3) }}…</span></span>
      </div>
      <div class="root" :class="{ hit: diff?.root }">→ H, the root:<br /><b class="bytes">{{ short(root, 16) }}</b><br /><b class="bytes">{{ short(root.slice(16), 16) }}</b></div>
      <p v-if="isEmpty" class="line">Five empty parts: this is the extrinsic hash every <code>fallback</code> block's header carries, <code class="bytes">0x{{ short(root) }}…{{ spaced(root.slice(-3)).replace(/ /g, "") }}</code>.</p>
    </template>

    <template v-else-if="proof && check">
      <div class="controls">
        <span class="label">prove:</span>
        <button v-for="(g, i) in block.guarantees" :key="i" class="small" :class="{ chosen: proving === i }" :aria-pressed="proving === i" @click="prove(i)">report {{ i + 1 }}</button>
      </div>
      <p class="line">
        Someone holds only the header, so only the root. To show them report {{ proving + 1 }} was in this block, hand over
        {{ fmt(proofSize(proof)) }} bytes, not the extrinsic's {{ fmt(extrinsicSize(block)) }}.
      </p>
      <div class="cols">
        <div class="col">
          <div class="label">shown</div>
          <ul class="list">
            <li>report {{ proving + 1 }} itself, {{ proof.report.length }} bytes</li>
            <li v-for="(g, i) in proof.guarantees" :key="i">
              guarantee {{ i + 1 }}:
              <template v-if="g.report === null">a place for report {{ proving + 1 }}'s hash</template>
              <template v-else>report {{ i + 1 }} shrunk to its hash, <span class="bytes">{{ short(g.report) }}…</span></template>,
              slot {{ g.slot }}, {{ plural(g.signatures.length, "signature") }}
            </li>
            <li v-for="(h, k) in proof.others" :key="k">the {{ ["tickets", "preimages", "assurances", "disputes"][k] }}' hash, <span class="bytes">{{ short(h) }}…</span></li>
          </ul>
        </div>
        <div class="col hidden">
          <div class="label">kept back</div>
          <ul class="list">
            <li v-if="block.guarantees.length > 1">report {{ other + 1 }} itself, {{ block.guarantees[other].report.length }} bytes</li>
            <li>the tickets, {{ fmt(parts[0].length) }} bytes</li>
            <li>the preimages' data</li>
            <li>the assurances, {{ fmt(parts[3].length) }} bytes</li>
          </ul>
        </div>
      </div>
      <div class="label">the checker's sums</div>
      <ol class="steps">
        <li>H(report {{ proving + 1 }}) = <span class="bytes">{{ short(check.reportHash) }}…</span>, into its place</li>
        <li>encode the guarantees part, hash it: <span class="bytes">{{ short(check.guaranteesHash) }}…</span>
          <span :class="same(check.guaranteesHash, hashes[2]) ? 'ok' : 'bad'">{{ same(check.guaranteesHash, hashes[2]) ? "(the block's)" : "(not the block's)" }}</span></li>
        <li>the five hashes in order, hashed: <span class="bytes">{{ short(check.recomputed) }}…</span></li>
        <li>
          the header's root: <span class="bytes">{{ short(root) }}…</span>
          <b :class="check.ok ? 'ok' : 'bad'">{{ check.ok ? "✓ the same: the report was in the block" : "✗ different: the proof fails" }}</b>
        </li>
      </ol>
      <div class="controls">
        <span class="label">a cheat changes:</span>
        <button v-for="f in FORGERIES" :key="f" class="small" :class="{ chosen: forged.has(f) }" :aria-pressed="forged.has(f)"
          :disabled="f === 'other report' && proof.guarantees.length < 2" @click="toggle(f)">{{ FORGED_SAY[f] }}</button>
      </div>
    </template>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} <UnitText :text="g.say" /></li>
    </ul>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 10ch; }
.tile.changed .tile-value { font-size: 16px; min-width: 18ch; line-height: 1.95; }
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 8px; line-height: 1.5; }
.label { font-size: 13px; color: var(--vp-c-text-2); margin: 8px 0 4px; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 8px 0; }
.controls .small { min-height: 32px; }
.controls button:disabled { opacity: 0.5; cursor: default; }
.line { font-size: 14px; margin: 8px 0; line-height: 1.5; }
.parts { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.part { margin: 0; padding: 8px 10px; border: 1px solid var(--vp-c-divider); border-radius: 6px; font-size: 14px; }
.part.hit { border-color: var(--changed-line); }
.head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; }
.head span { font-size: 12px; color: var(--vp-c-text-2); }
.item { margin: 6px 0; line-height: 2.2; }
.dim { color: var(--vp-c-text-2); }
.twist { display: block; font-size: 12px; line-height: 1.4; color: var(--vp-c-text-2); }
.val { min-width: 36px; }
.cells { display: inline-flex; flex-wrap: wrap; gap: 2px; vertical-align: middle; }
.cell-btn {
  min-width: 32px; min-height: 32px; padding: 0 2px; border: 1px solid var(--bit-top-line); border-radius: 3px;
  background: var(--bit-top); font-family: var(--vp-font-family-mono); font-size: 13px; cursor: pointer;
}
.out { font-family: var(--vp-font-family-mono); font-size: 13px; padding: 2px 6px; border-radius: 4px; display: inline-block; }
.out.hit, .seg.hit, .root.hit { background: var(--changed); box-shadow: 0 0 0 1px var(--changed-line); }
.glue { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 2px; font-family: var(--vp-font-family-mono); font-size: 12px; max-width: 520px; }
.seg { display: flex; flex-direction: column; padding: 2px 4px; border: 1px solid var(--vp-c-divider); border-radius: 3px; overflow-wrap: anywhere; }
.seg small { font-family: var(--vp-font-family-base); font-size: 10px; color: var(--vp-c-text-2); }
.root { font-family: var(--vp-font-family-mono); font-size: 13px; margin: 6px 0; padding: 4px 6px; border-radius: 4px; display: inline-block; line-height: 1.6; overflow-wrap: anywhere; }
.cols { display: flex; flex-wrap: wrap; gap: 4px 24px; }
.col { flex: 1 1 240px; min-width: 0; }
.list, .steps { font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.5; }
.list li, .steps li { margin: 2px 0; overflow-wrap: anywhere; }
.col.hidden .list { color: var(--vp-c-text-3); }
.ok { color: var(--vp-c-green-1); }
.bad { color: var(--vp-c-danger-1); }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.extrinsic-commit { padding: 12px; }
  .part { padding: 6px 8px; }
  .glue { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
