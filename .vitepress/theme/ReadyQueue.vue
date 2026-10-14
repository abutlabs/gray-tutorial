<!-- Lesson 17.2: the ready queue ω and the accumulated history ξ, on tiny (E = 12), with
     letters for work-packages. Compose the reports a block brings, run the block, and watch
     who goes, who waits in which slot's list, and who is unlocked or given up. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import type { QueueState, Report, Step } from "./ready-queue.ts";
import { block, chainStart, describe, E, emptyState, GOALS, goalsMet, lessonStart, listOf } from "./ready-queue.ts";

const LETTERS = [..."ABCDEFGH"];
const STARTS = [
  { id: "lesson", say: "17.2's D and A", make: lessonStart },
  { id: "chain", say: "the chain vectors", make: chainStart },
  { id: "empty", say: "empty", make: () => ({ state: emptyState(42), incoming: [] as Report[] }) },
];
const GAPS = [
  { gap: 1, say: "next block" },
  { gap: 2, say: "skip a slot" },
  { gap: E, say: "an epoch later" },
];

const start = ref("lesson");
const state = ref<QueueState>(lessonStart().state);
const incoming = ref<Report[]>(lessonStart().incoming);
const last = ref<Step | null>(null);
const log = ref<{ slot: number; lines: string[] }[]>([]);
const pick = ref("A");
const deps = ref<string[]>([]);
const reached = ref(new Set<string>());

const waiting = computed(() => state.value.ready.flat().length);
const newest = computed(() => listOf(state.value.slot));

function begin(id: string) {
  const s = STARTS.find((x) => x.id === id)!.make();
  start.value = id;
  state.value = s.state;
  incoming.value = s.incoming;
  last.value = null;
  log.value = [];
}
function choose(p: string) {
  pick.value = p;
  deps.value = deps.value.filter((d) => d !== p); // a report doesn't wait for its own package
}
const toggle = (d: string) => {
  deps.value = deps.value.includes(d) ? deps.value.filter((x) => x !== d) : [...deps.value, d].sort();
};
function add() {
  // one report per package a block: a second replaces the first
  incoming.value = [...incoming.value.filter((r) => r.pkg !== pick.value), { pkg: pick.value, deps: deps.value }];
  deps.value = [];
}
function run(gap: number) {
  const before = state.value;
  const step = block(before, before.slot + gap, incoming.value);
  state.value = step.state;
  last.value = step;
  incoming.value = [];
  log.value = [{ slot: step.slot, lines: describe(step, before) }, ...log.value].slice(0, 3);
  reached.value = new Set([...reached.value, ...goalsMet(step)]);
}
const said = (r: Report) => (r.deps.length ? `${r.pkg} ← ${r.deps.join(",")}` : `${r.pkg}`);
</script>

<template>
  <div class="widget ready-queue">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">slot</span><span class="tile-value">{{ state.slot }}</span></div>
      <div class="tile"><span class="tile-label">accumulated</span><span class="tile-value">{{ last ? last.accumulated.length : "–" }}</span></div>
      <div class="tile"><span class="tile-label">waiting</span><span class="tile-value">{{ waiting }}</span></div>
    </div>
    <p class="range">
      Tiny: E = {{ E }} slots an epoch. A report naming other packages waits in ω's list <i>slot</i> mod {{ E }},
      at most an epoch, until they're accumulated; ξ holds what each of the last {{ E }} blocks accumulated.
      <b>D ← A</b>: D waits for A.
    </p>
    <div class="controls" role="group" aria-label="start from">
      <button v-for="s in STARTS" :key="s.id" class="small" :class="{ chosen: start === s.id }" :aria-pressed="start === s.id" @click="begin(s.id)">
        {{ s.say }}
      </button>
    </div>

    <div class="label">the reports the next block brings</div>
    <div class="incoming">
      <button v-for="r in incoming" :key="r.pkg" class="small report" :aria-label="`remove ${said(r)}`" @click="incoming = incoming.filter((x) => x !== r)">
        {{ said(r) }} ×
      </button>
      <span v-if="!incoming.length" class="none">none yet: compose one below</span>
    </div>
    <div class="compose">
      <span class="what">package</span>
      <div class="letters" role="group" aria-label="package">
        <button v-for="p in LETTERS" :key="p" class="small" :class="{ chosen: pick === p }" :aria-pressed="pick === p" @click="choose(p)">{{ p }}</button>
      </div>
      <span class="what">waits for</span>
      <div class="letters" role="group" aria-label="waits for">
        <button v-for="d in LETTERS" :key="d" class="small" :class="{ chosen: deps.includes(d) }" :aria-pressed="deps.includes(d)" :disabled="d === pick" @click="toggle(d)">{{ d }}</button>
      </div>
    </div>
    <div class="controls">
      <button class="small" @click="add">add {{ said({ pkg: pick, deps }) }}{{ deps.length ? "" : " (waits for nothing)" }}</button>
    </div>
    <div class="controls go">
      <button v-for="g in GAPS" :key="g.gap" class="small" :class="{ chosen: g.gap === 1 }" @click="run(g.gap)">
        <UnitText :text="g.say" />: slot {{ state.slot + g.gap }}
      </button>
    </div>

    <div class="label">ω, the ready queue: list {{ newest }} (ringed) is slot {{ state.slot }}'s</div>
    <ol class="ring">
      <li v-for="(list, i) in state.ready" :key="i" :class="{ newest: i === newest }">
        <span class="idx">{{ i }}</span>
        <span v-for="w in list" :key="`${w.pkg}${w.since}`" class="waiter">{{ w.pkg }}←{{ w.deps.join(",") }}<small>since {{ w.since }}</small></span>
      </li>
    </ol>
    <div class="label">ξ, the accumulated history: oldest block left, newest right</div>
    <ol class="ring history">
      <li v-for="(h, i) in state.history" :key="i" :class="{ newest: i === E - 1 }">
        <span class="idx">{{ h.slot ?? "·" }}</span>
        <span class="pkgs">{{ h.pkgs.join(" ") || "–" }}</span>
      </li>
    </ol>

    <div class="log" aria-live="polite">
      <ol v-for="(entry, i) in log" :key="entry.slot" :class="{ old: i > 0 }">
        <li v-for="(line, j) in entry.lines" :key="j">{{ line }}</li>
      </ol>
      <p v-if="!log.length" class="none">Run a block: what it does is told here.</p>
    </div>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} <UnitText :text="g.say" /></li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.tile-value { min-width: 4ch; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.controls button, .incoming button { min-height: 36px; }
.go button.chosen { font-weight: 600; }
.label { font-size: 13px; color: var(--vp-c-text-2); margin: 12px 0 4px; }
.incoming { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; min-height: 36px; align-items: center; }
.report { background: var(--bit-top); border-color: var(--bit-top-line); }
.none { font-size: 13px; color: var(--vp-c-text-3); }
.compose { display: grid; grid-template-columns: max-content 1fr; gap: 6px 12px; align-items: center; margin-bottom: 8px; }
.what { font-size: 13px; color: var(--vp-c-text-2); }
.letters { display: flex; gap: 4px; flex-wrap: wrap; }
.letters button.small { min-width: 36px; min-height: 36px; padding: 0; }
.letters button:disabled { opacity: 0.35; }
.ring {
  list-style: none; padding: 0; margin: 0; display: grid; gap: 4px;
  grid-template-columns: repeat(12, minmax(0, 1fr));
}
.ring li {
  display: flex; flex-direction: column; gap: 2px; min-height: 52px; padding: 2px 4px; margin: 0;
  border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-mono); font-size: 12px; line-height: 1.3; overflow-wrap: anywhere;
}
.ring li.newest { border: 2px solid var(--vp-c-brand-1); }
.idx { font-size: 11px; color: var(--vp-c-text-3); }
.waiter { display: flex; flex-direction: column; padding: 1px 3px; border-radius: 3px; background: var(--bit-top); border: 1px solid var(--bit-top-line); font-weight: 600; }
.waiter small { font-size: 10px; font-weight: 400; color: var(--vp-c-text-2); }
.history li { min-height: 40px; }
.history li.newest .pkgs { background: var(--bit-low); border-radius: 3px; padding: 0 2px; }
.pkgs { font-weight: 600; }
.log { margin-top: 12px; font-size: 14px; line-height: 1.5; }
.log ol { margin: 0 0 8px; padding-left: 20px; }
.log ol.old { color: var(--vp-c-text-3); font-size: 13px; }
.log li { margin: 0; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .ring { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .compose { grid-template-columns: 1fr; gap: 4px; }
  .letters button.small { min-width: 32px; min-height: 32px; }
}
</style>
