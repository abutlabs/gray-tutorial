<!-- Lesson 11.1: each validator's assurance is a bitfield of the cores whose data it holds.
     Click their bits; a core's report is available once more than two thirds of the
     validators assure it: assured × 3 > validators × 2. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BitfieldBytes from "./BitfieldBytes.vue";
import { bitAt, bitfieldOf, isAvailable, needed } from "./bitfield.ts";
import { toHex } from "./bytes.ts";

const CORES = 2; // tiny
const SIZES = [6, 9, 12]; // the Gray Paper allows any multiple of 3 from 6
const GOALS = [
  { id: "least", say: "make core 0 available with as few assurances as it takes" },
  { id: "short", say: "leave a core one assurance short" },
  { id: "both", say: "make both cores available" },
];

// some_assurances-1's counts, on tiny: core 0 has 5 assurances, core 1 has 4
const start = (v: number) => Array.from({ length: v }, (_, i) => bitfieldOf(CORES, (c) => i < (c === 0 ? 5 : 4)));
const validators = ref(6);
const assurances = ref(start(6));
const reached = ref(new Set<string>());

const counts = computed(() => [...Array(CORES).keys()].map((c) => assurances.value.filter((a) => bitAt(a, c)).length));
const available = computed(() => counts.value.map((n) => isAvailable(n, validators.value)));

function size(v: number) {
  validators.value = v;
  assurances.value = start(v);
}
// a goal counts when the reader's click brings it about, not when it was already so
watch(counts, (now, before) => {
  const v = validators.value, mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
  const moved = (c: number) => now[c] !== before[c];
  if (moved(0) && now[0] === needed(v)) mark("least");
  if (now.some((n, c) => moved(c) && n === needed(v) - 1)) mark("short");
  if (now.some((_, c) => moved(c)) && now.every((n) => isAvailable(n, v))) mark("both");
});
</script>

<template>
  <div class="widget assurance-grid">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">needed</span><span class="tile-value">{{ needed(validators) }} of {{ validators }}</span></div>
      <div v-for="(n, c) in counts" :key="c" class="tile" :class="{ ok: available[c] }">
        <span class="tile-label">core {{ c }}</span>
        <span class="tile-value">{{ n }} {{ available[c] ? "✓" : "…" }}</span>
      </div>
    </div>
    <p class="range">
      {{ validators }} validators: more than two thirds is {{ needed(validators) }} or more. In whole numbers, assured × 3 >
      {{ validators }} × 2 = {{ 2 * validators }}. (Full JAM's 1,023 validators need 683.)
    </p>
    <div class="controls">
      <button v-for="v in SIZES" :key="v" class="small" :class="{ chosen: v === validators }" @click="size(v)">
        {{ v }} validators{{ v === 6 ? " (tiny)" : "" }}
      </button>
    </div>
    <div v-for="(a, i) in assurances" :key="i" class="row">
      <span class="who">validator {{ i }}</span>
      <BitfieldBytes v-model="assurances[i]" :cores="CORES" compact inline />
    </div>
    <p v-for="(n, c) in counts" :key="c" class="line">
      core {{ c }}: {{ n }} × 3 = {{ 3 * n }} {{ available[c] ? ">" : "≤" }} {{ 2 * validators }}:
      <b>{{ available[c] ? "available" : "not yet" }}</b>
    </p>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.tile.ok { border-color: var(--bit-low-line); background: var(--bit-low); }
.row { display: flex; align-items: center; gap: 12px; }
.who { font-size: 13px; color: var(--vp-c-text-2); white-space: nowrap; font-family: var(--vp-font-family-mono); }
.line { font-family: var(--vp-font-family-mono); font-size: 14px; margin: 4px 0; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
</style>
