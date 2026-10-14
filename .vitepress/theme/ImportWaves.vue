<!-- Lesson 19.1: a block import as the Gray Paper's dependency graph (§4.2). Tap any value:
     what it's made from lights up green, what's made from it blue, and its wave says how
     long it waits. The block and the old state are there from the start; the waves are
     computed from the graph, in import-waves.ts. -->
<script setup lang="ts">
import { computed, h, ref } from "vue";
import {
  BEFORE, BLOCK, LAST_WAVE, MOST_INPUTS, NAMES, STEPS, WAVES, builtIn, dependentsOf, isLongestChain, keyOf, latestInput,
  nextTrail, stepAt, stepName, symbolParts, waveOf,
} from "./import-waves.ts";

const GOALS = [
  { id: "first", say: "find a value made only from the block and the old state (wave 1)" },
  { id: "most", say: `find a value made from the most inputs (${MOST_INPUTS})` },
  { id: "sink", say: "find a new value nothing waits for, outside the last wave" },
  { id: "chain", say: `trace the longest chain: a wave 1 value, then one made from it, one tap a wave, to wave ${LAST_WAVE}` },
];

/** A symbol as the Gray Paper writes it: E_T is E with a subscript T. */
const Sym = (props: { x: string }) => {
  const p = symbolParts(props.x);
  return h("span", { class: "sym" }, [p.base, p.sub ? h("sub", p.sub) : null, p.mark]);
};

const selected = ref<string | null>(null);
const trail = ref<string[]>([]);
const reached = ref(new Set<string>());

const step = computed(() => (selected.value ? stepAt(selected.value) : undefined));
const inputs = computed(() => new Set(step.value ? step.value.from.map(keyOf) : []));
const dependents = computed(() => (selected.value ? dependentsOf(selected.value) : []));
const holdsBack = computed(() => (selected.value ? latestInput(selected.value) : undefined));

function tap(key: string) {
  selected.value = key;
  trail.value = nextTrail(trail.value, key);
  // a goal counts when the reader's own tap brings it about
  const s = stepAt(key);
  const mark = (id: string, when: boolean) => { if (when) reached.value = new Set([...reached.value, id]); };
  mark("first", waveOf(key) === 1);
  mark("most", s !== undefined && s.from.length === MOST_INPUTS);
  mark("sink", s !== undefined && dependentsOf(key).length === 0 && waveOf(key) < LAST_WAVE);
  mark("chain", isLongestChain(trail.value));
}
const role = (key: string) => ({
  chosen: selected.value === key,
  input: inputs.value.has(key),
  dependent: dependents.value.includes(key),
});
/** " and 7 more" after a step that makes several values, shown by its first. */
const more = (key: string) => {
  const n = (stepAt(key)?.makes.length ?? 1) - 1;
  return n ? ` and ${n} more` : "";
};
const label = (key: string) => {
  const s = stepAt(key);
  return s ? `${s.makes.join(", ")}: ${stepName(s)}, wave ${waveOf(key)}` : `${key}: ${NAMES[key]}, from the start`;
};
</script>

<template>
  <div class="widget import-waves">
    <div class="readout" aria-live="polite">
      <div class="tile">
        <span class="tile-label">tapped</span>
        <span class="tile-value sym">
          <template v-if="selected">
            <Sym :x="selected" />
            <small v-if="step && step.makes.length > 1"> +{{ step.makes.length - 1 }}</small>
          </template>
          <template v-else>–</template>
        </span>
      </div>
      <div class="tile"><span class="tile-label">wave</span><span class="tile-value">{{ selected ? waveOf(selected) : "–" }}</span></div>
      <div class="tile input-tile">
        <span class="tile-label">made from</span><span class="tile-value">{{ selected ? (step?.from.length ?? 0) : "–" }}</span>
      </div>
      <div class="tile dependent-tile">
        <span class="tile-label">feeds</span><span class="tile-value">{{ selected ? dependents.length : "–" }}</span>
      </div>
    </div>
    <p class="range">
      The Gray Paper's {{ STEPS.length }} lines: each new value is made from parts of the block, the state before it, and
      other new values. Those two are there from the start, wave 0. A new value's wave is one more than the latest
      wave among its inputs, so values in one wave never need each other: {{ LAST_WAVE }} waves in all.
    </p>
    <p class="legend">
      Tap any value. <span class="dot chosen-dot">tapped</span> <span class="dot input-dot">made from</span>
      <span class="dot dependent-dot">feeds</span>
    </p>

    <section class="start" aria-label="wave 0: there from the start">
      <div class="head">wave 0 · from the start</div>
      <div class="row">
        <span class="who">the block</span>
        <button v-for="x in BLOCK" :key="x" class="chip" :class="role(x)" :aria-pressed="selected === x" :aria-label="label(x)" @click="tap(x)">
          <Sym :x="x" />
          <small>{{ NAMES[x] }}</small>
        </button>
      </div>
      <div class="row">
        <span class="who">the state before it</span>
        <button v-for="x in BEFORE" :key="x" class="chip" :class="role(x)" :aria-pressed="selected === x" :aria-label="label(x)" @click="tap(x)">
          <Sym :x="x" />
          <small>{{ NAMES[x] }}</small>
        </button>
      </div>
    </section>

    <div class="waves" :style="{ '--waves': LAST_WAVE }">
      <section v-for="(wave, i) in WAVES" :key="i" class="wave" :aria-label="`wave ${i + 1}`">
        <div class="head">wave {{ i + 1 }}</div>
        <button
          v-for="s in wave" :key="s.makes[0]" class="card" :class="role(s.makes[0])"
          :aria-pressed="selected === s.makes[0]" :aria-label="label(s.makes[0])" @click="tap(s.makes[0])"
        >
          <span class="syms">
            <Sym v-for="m in s.makes" :key="m" :x="m" />
          </span>
          <small>{{ stepName(s) }}</small>
        </button>
      </section>
    </div>

    <div class="detail" aria-live="polite">
      <template v-if="!selected">Nothing tapped yet. Start anywhere: a value in wave 1, say, or the header H.</template>
      <template v-else-if="!step">
        <b><Sym :x="selected" /></b>, {{ NAMES[selected] }}: {{ BLOCK.includes(selected) ? "part of the block" : "the state before the block" }},
        there from the start. Read by {{ dependents.length }}:
        <span v-for="(d, j) in dependents" :key="d">{{ j ? ", " : "" }}<Sym :x="d" />{{ more(d) }} (wave {{ waveOf(d) }})</span>.
      </template>
      <template v-else>
        <p>
          <b><template v-for="(m, j) in step.makes" :key="m">{{ j ? ", " : "" }}<Sym :x="m" /></template></b>, {{ stepName(step) }}, is made from
          <span v-for="(x, j) in step.from" :key="x">{{ j ? ", " : "" }}<Sym :x="x" /><small> ({{ NAMES[x] }}{{ stepAt(keyOf(x)) ? `, wave ${waveOf(keyOf(x))}` : "" }})</small></span>.
        </p>
        <p v-if="waveOf(selected) === 1">Wave 1: nothing it needs is new, so it can start the moment the block arrives.</p>
        <p v-else>Wave {{ waveOf(selected) }}: its latest input, <Sym :x="holdsBack!" />, is in wave {{ waveOf(selected) - 1 }}, so it waits for that.</p>
        <p v-if="dependents.length">
          Feeds <span v-for="(d, j) in dependents" :key="d">{{ j ? ", " : "" }}<Sym :x="d" />{{ more(d) }} (wave {{ waveOf(d) }})</span>.
        </p>
        <p v-else>Nothing in this block waits for it: it goes straight into the state after the block.</p>
        <p>
          Built in
          <template v-for="(b, j) in builtIn(step)" :key="b.href">{{ j ? " and " : "" }}<a :href="b.href">{{ b.label }}</a> (Part {{ b.part }} · {{ b.partTitle }})</template>.
        </p>
      </template>
    </div>
    <p v-if="trail.length > 1" class="trail">Your chain: <template v-for="(k, j) in trail" :key="j">{{ j ? " → " : "" }}<Sym :x="k" /></template></p>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 8px; line-height: 1.5; }
.tile-value.sym { min-width: 6ch; white-space: nowrap; }
.tile-value small { font-size: 14px; font-weight: 500; color: var(--vp-c-text-2); }
.input-tile { border-color: var(--bit-low-line); }
.dependent-tile { border-color: var(--bit-top-line); }
.legend { font-size: 13px; color: var(--vp-c-text-2); margin: 0 0 10px; line-height: 1.8; }
.dot { padding: 0 6px; border: 1.5px solid; border-radius: 4px; margin-left: 4px; }
.chosen-dot { border: 2px solid var(--vp-c-brand-1); }
.input-dot { background: var(--bit-low); border-color: var(--bit-low-line); }
.dependent-dot { background: var(--bit-top); border-color: var(--bit-top-line); }
.head { font-size: 13px; font-weight: 600; color: var(--vp-c-text-2); margin: 0 0 6px; }
.start { border: 1px dashed var(--vp-c-divider); border-radius: 6px; padding: 8px; margin-bottom: 10px; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 4px 0; }
.who { font-size: 13px; color: var(--vp-c-text-2); min-width: 100%; }
.chip, .card {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40px;
  padding: 3px 6px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1); cursor: pointer; line-height: 1.25;
}
.chip { min-width: 52px; }
.chip small, .card small { font-size: 11px; color: var(--vp-c-text-2); text-align: center; }
.import-waves :deep(.sym) { font-family: var(--vp-font-family-mono); font-size: 15px; font-weight: 600; white-space: nowrap; }
.import-waves :deep(.sym sub) { font-size: 10px; }
.tile-value :deep(.sym) { font-size: inherit; }
.detail :deep(.sym), .trail :deep(.sym) { font-size: inherit; }
.syms { display: flex; flex-wrap: wrap; gap: 0 6px; justify-content: center; }
.waves { display: grid; grid-template-columns: repeat(var(--waves), minmax(0, 1fr)); gap: 8px; }
.wave { display: flex; flex-direction: column; gap: 6px; border-left: 2px solid var(--vp-c-divider); padding-left: 6px; }
.card { width: 100%; min-height: 48px; }
.chosen { border: 2px solid var(--vp-c-brand-1); }
.input { background: var(--bit-low); border-color: var(--bit-low-line); }
.dependent { background: var(--bit-top); border-color: var(--bit-top-line); }
.chosen.input, .chosen.dependent { border-color: var(--vp-c-brand-1); }
.detail {
  margin: 12px 0 0; padding: 8px 12px; border-left: 3px solid var(--bit-mark-line); background: var(--bit-mark);
  font-size: 14px; line-height: 1.5; min-height: 6em;
}
.detail p { margin: 0 0 4px; }
.detail small { color: var(--vp-c-text-2); }
.trail { font-family: var(--vp-font-family-mono); font-size: 13px; margin: 6px 0 0; overflow-wrap: anywhere; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.import-waves { padding: 12px; }
  .waves { grid-template-columns: minmax(0, 1fr); }
  .wave { border-left: none; padding-left: 0; border-top: 2px solid var(--vp-c-divider); padding-top: 6px; }
  .wave .card { flex-direction: row; justify-content: space-between; gap: 8px; padding: 4px 10px; }
  .wave .card small { text-align: right; }
  .syms { justify-content: flex-start; }
}
</style>
