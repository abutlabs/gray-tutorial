<!-- Lesson 11.2: the life of a work-report on a core, block by block, on tiny (6 validators,
     2 cores). Plan the next block (judge a report bad, tap the validators who assure a core,
     guarantee a new report) and import it: disputes clear first, then assurances, then
     guarantees take the cores left free. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { flip, bitAt, isAvailable, needed } from "./bitfield.ts";
import {
  AVAILABILITY_TIMEOUT, CORES, START, VALIDATORS, assuredCount, emptyBlock, importBlock, timeoutSlot,
  type Block, type Chain, type Pending,
} from "./report-life.ts";

const GOALS = [
  { id: "available", say: "get a report accumulated: make it available" },
  { id: "timeout", say: "let one time out" },
  { id: "busy", say: "try to guarantee onto a busy core" },
  { id: "judged", say: "clear one with a dispute" },
];
const LOG_LINES = 8;

const chain = ref<Chain>(START);
const block = ref<Block>(emptyBlock(START.slot + 1));
const log = ref<{ line: string; refused: boolean }[]>([]);
const reached = ref(new Set<string>());

const n = computed(() => [...Array(CORES).keys()].map((c) => assuredCount(block.value.assurances, c)));
/** The slots a pending report may be made available in: registered + 1 to registered + U. */
const chances = (p: Pending) => Array.from({ length: AVAILABILITY_TIMEOUT }, (_, i) => p.registered + 1 + i);
const left = (p: Pending) => timeoutSlot(p) - chain.value.slot; // blocks still able to make it available, the next one included

const toggleIn = (list: number[], c: number) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);
const judge = (c: number) => { block.value = { ...block.value, judged: toggleIn(block.value.judged, c) }; };
const guarantee = (c: number) => { block.value = { ...block.value, guaranteed: toggleIn(block.value.guaranteed, c) }; };
function assure(v: number, c: number) {
  const assurances = block.value.assurances.map((a, i) => (i === v ? flip(a, c) : a));
  block.value = { ...block.value, assurances };
}
function next() {
  const out = importBlock(chain.value, block.value);
  log.value = [{ line: out.log, refused: out.refused !== null }, ...log.value].slice(0, LOG_LINES);
  // a goal counts when the reader's own block brings it about
  const mark = (id: string, when: boolean) => { if (when) reached.value = new Set([...reached.value, id]); };
  mark("available", out.available.length > 0);
  mark("timeout", out.timedOut.length > 0);
  mark("busy", out.refused === "core_engaged");
  mark("judged", out.judged.length > 0);
  if (out.refused) return; // the block is thrown away; the plan stays, to fix
  chain.value = out.chain;
  block.value = emptyBlock(out.chain.slot + 1);
}
function restart() {
  chain.value = START;
  block.value = emptyBlock(START.slot + 1);
  log.value = [];
}
</script>

<template>
  <div class="widget report-life">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">slot</span><span class="tile-value">{{ chain.slot }}</span></div>
      <div v-for="(p, c) in chain.cores" :key="c" class="tile" :class="{ busy: p }">
        <span class="tile-label">core {{ c }}</span>
        <span class="tile-value">{{ p ? p.name : "free" }}</span>
        <span class="tile-note">{{ p ? `out at slot ${timeoutSlot(p)}` : "nothing waiting" }}</span>
      </div>
    </div>
    <p class="range">
      Tiny: {{ VALIDATORS }} validators, {{ CORES }} cores, each holding at most one report. A report is available when
      {{ needed(VALIDATORS) }} of {{ VALIDATORS }} assure it in one block (each block counts afresh), and times out at
      its registered slot + U = {{ AVAILABILITY_TIMEOUT }}. A block works in order: disputes, then assurances, then
      guarantees, which only take a core left free.
    </p>
    <section v-for="(p, c) in chain.cores" :key="c" class="lane" :aria-label="`core ${c}`">
      <div class="lane-head">
        <b>core {{ c }}</b>
        <span v-if="p">
          report {{ p.name }}, registered at slot {{ p.registered }}: times out at slot {{ timeoutSlot(p) }} unless
          available by then.
          <template v-if="left(p) === 1"> Slot {{ chain.slot + 1 }} is its <b>last chance</b>.</template>
          <template v-else> {{ left(p) }} blocks left.</template>
        </span>
        <span v-else class="quiet">free: nothing waiting on it.</span>
      </div>
      <div v-if="p" class="track" aria-hidden="true">
        <span v-for="s in chances(p)" :key="s" class="cell"
          :class="{ past: s <= chain.slot, now: s === chain.slot + 1, last: s === timeoutSlot(p) }">{{ s }}</span>
      </div>
      <div class="plan">
        <div v-if="p" class="assure">
          <span class="who">assured by</span>
          <button v-for="v in VALIDATORS" :key="v" class="validator" :class="{ on: bitAt(block.assurances[v - 1], c) }"
            :aria-pressed="bitAt(block.assurances[v - 1], c)" :aria-label="`validator ${v - 1} assures core ${c}`"
            @click="assure(v - 1, c)">{{ v - 1 }}</button>
          <span class="count" :class="{ ok: isAvailable(n[c], VALIDATORS) }">{{ n[c] }} of {{ VALIDATORS }}, needs {{ needed(VALIDATORS) }}</span>
        </div>
        <div class="actions">
          <button v-if="p" class="small" :class="{ chosen: block.judged.includes(c) }" :aria-pressed="block.judged.includes(c)"
            @click="judge(c)">dispute it: judged bad</button>
          <button class="small" :class="{ chosen: block.guaranteed.includes(c) }" :aria-pressed="block.guaranteed.includes(c)"
            @click="guarantee(c)">guarantee a new report on core {{ c }}</button>
        </div>
      </div>
    </section>
    <div class="controls">
      <button class="small go" @click="next">import the block at slot {{ chain.slot + 1 }}</button>
      <button class="small" @click="restart">start over</button>
    </div>
    <ol class="log" aria-live="polite">
      <li v-for="(l, i) in log" :key="log.length - i" :class="{ refused: l.refused }">{{ l.line }}</li>
      <li v-if="!log.length" class="quiet">Nothing imported yet. Each block you import gets a line here, newest first.</li>
    </ol>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.tile-note { min-width: 15ch; font-size: 12px; color: var(--vp-c-text-2); font-family: var(--vp-font-family-mono); }
.tile.busy { border-color: var(--bit-mark-line); background: var(--bit-mark); }
.lane { border: 1px solid var(--vp-c-divider); border-radius: 6px; padding: 8px 12px; margin: 0 0 8px; }
.lane-head { font-size: 14px; line-height: 1.5; }
.lane-head b:first-child { font-family: var(--vp-font-family-mono); margin-right: 6px; }
.quiet { color: var(--vp-c-text-2); }
.track { display: flex; gap: 4px; margin: 6px 0; flex-wrap: wrap; }
.cell {
  min-width: 36px; padding: 2px 0; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 4px;
  font-family: var(--vp-font-family-mono); font-size: 13px; color: var(--vp-c-text-2);
}
.cell.past { background: var(--vp-c-bg-soft); color: var(--vp-c-text-3); text-decoration: line-through; }
.cell.now { border: 2px solid var(--vp-c-brand-1); color: var(--vp-c-text-1); font-weight: 600; }
.cell.last { border-color: var(--vp-c-danger-1); }
.cell.last.now { background: var(--vp-c-danger-soft); }
.plan { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.assure { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.who { font-size: 13px; color: var(--vp-c-text-2); margin-right: 4px; }
.validator {
  width: 32px; height: 32px; border: 1px solid var(--bit-low-line); border-radius: 4px;
  font-family: var(--vp-font-family-mono); font-size: 14px; color: var(--vp-c-text-3); background: var(--vp-c-bg-soft);
}
.validator.on { background: var(--bit-low); color: var(--vp-c-text-1); font-weight: 600; }
.count { font-family: var(--vp-font-family-mono); font-size: 13px; margin-left: 6px; color: var(--vp-c-text-2); }
.count.ok { color: var(--vp-c-green-1); font-weight: 600; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; }
.widget button.small { min-height: 32px; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.log { list-style: none; padding: 0; margin: 8px 0 0; font-size: 13px; line-height: 1.5; font-family: var(--vp-font-family-mono); }
.log li { padding: 4px 0; border-top: 1px solid var(--vp-c-divider); }
.log li:first-child { color: var(--vp-c-text-1); }
.log li:not(:first-child) { color: var(--vp-c-text-2); }
.log li.refused { color: var(--vp-c-danger-1); }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .lane { padding: 8px; }
  .validator { width: 34px; }
}
</style>
