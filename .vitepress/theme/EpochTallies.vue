<!-- Lesson 18.1: the validators' tallies across an epoch's turn, step by step, on the real
     vector: the assurances, the page turning, then the author and the reporters. Toggle the
     epoch change off and everything lands in one tally. Computed in epoch-tallies.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { BLOCK, COLUMNS, steps } from "./epoch-tallies.ts";

const turn = ref(true);
const at = ref(0);
watch(turn, () => { at.value = 0; });
const all = computed(() => steps(turn.value));
const s = computed(() => all.value[at.value]);
const lit = (which: string, v: number, c: number) => s.value.changed.some(([w, r, k]) => w === which && r === v && k === c);
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget epoch-tallies">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">step</span><span class="tile-value">{{ at }} of 3</span></div>
      <div class="tile"><span class="tile-label">validator 0's a in π_L</span><span class="tile-value">{{ fmt(s.last[0][5]) }}</span></div>
      <div class="tile full"><span class="tile-label">validator 1 in π_V: b t p d g a</span><span class="tile-value">{{ s.current[BLOCK.author].join(" ") }}</span></div>
    </div>
    <p class="line">{{ s.says }}</p>
    <div class="controls">
      <button class="small go" :disabled="at === 3" @click="at++">next step ▶</button>
      <button class="small" :disabled="at === 0" @click="at = 0">start again</button>
      <button class="small" :class="{ chosen: !turn }" :aria-pressed="!turn" @click="turn = !turn">no epoch change</button>
    </div>
    <div class="tables">
      <table v-for="which in ['current', 'last']" :key="which">
        <caption>{{ which === "current" ? "π_V, this epoch" : "π_L, the last epoch" }}</caption>
        <thead><tr><th>v</th><th v-for="c in COLUMNS" :key="c">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="(row, v) in (which === 'current' ? s.current : s.last)" :key="v">
            <th>{{ v }}</th>
            <td v-for="(x, c) in row" :key="c" :class="{ lit: lit(which, v, c) }">{{ x }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted">b blocks, t tickets, p preimages, d preimage bytes, g guarantees, a assurances.</p>
  </div>
</template>

<style scoped>
.epoch-tallies .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.tile { min-width: 0; }
.tile .tile-value { font-size: 16px; white-space: nowrap; }
.tile.full { grid-column: 1 / -1; }
.tile.full .tile-value { font-size: 14px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.tables { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 8px; overflow-x: auto; }
table { display: table; width: 100%; border-collapse: collapse; font-family: var(--vp-font-family-mono); font-size: 11px; margin: 0; }
caption { text-align: left; font-family: var(--vp-font-family-base); font-size: 12px; color: var(--vp-c-text-2); padding-bottom: 2px; }
th, td { padding: 2px 3px; border: 1px solid var(--vp-c-divider); text-align: right; }
td.lit { background: var(--bit-low); font-weight: 700; }
.muted { margin: 6px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
</style>
