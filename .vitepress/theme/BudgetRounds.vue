<!-- Lesson 17.9: the block's gas budget. Pick reports (tap one to move it to the front), the
     free gas and what a round uses: each round's budget, the reports it takes, the first
     that doesn't fit and everything behind it, and how many rounds. Computed in
     budget-rounds.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { budgetOf, CORES, G_A, G_T, M, PRESETS, rounds } from "./budget-rounds.ts";

const reports = ref([...PRESETS[0].reports]);
const free = ref(0);
const used = ref(350_000);
const all = computed(() => rounds(reports.value, free.value, used.value));
const front = (k: number) => { const r = [...reports.value]; const [x] = r.splice(k, 1); reports.value = [x, ...r]; };
</script>

<template>
  <div class="widget budget-rounds">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">g, the budget</span><span class="tile-value">{{ M(budgetOf(free)) }}</span></div>
      <div class="tile"><span class="tile-label">round 1 takes</span><span class="tile-value">{{ all[0]?.took.map(M).join(" + ") || "none" }}</span></div>
      <div class="tile"><span class="tile-label">rounds</span><span class="tile-value">{{ all.length }}</span></div>
    </div>
    <p class="line">g = max(G_T, G_A × C + free gas) = max({{ M(G_T) }}, {{ M(G_A) }} × {{ CORES }} + {{ M(free) }}) = {{ M(budgetOf(free)) }}. A round takes reports in order while they fit; the first that doesn't, and everything after it, waits, even one that would fit.</p>
    <div class="controls">
      <button v-for="p in PRESETS" :key="p.says" class="small" @click="reports = [...p.reports]; free = p.free">{{ p.says }}</button>
      <span class="muted">free gas</span>
      <button v-for="f in [0, 5_000_000]" :key="f" class="small" :class="{ chosen: free === f }" @click="free = f">{{ M(f) }}</button>
      <span class="muted">a round uses</span>
      <button v-for="u in [350_000, 5_000_000]" :key="u" class="small" :class="{ chosen: used === u }" @click="used = u">{{ M(u) }}</button>
    </div>
    <p class="row-says">the reports, in order: tap one to move it to the front</p>
    <div class="reports">
      <button v-for="(r, k) in reports" :key="k" class="small rep" @click="front(k)">{{ M(r) }}</button>
    </div>
    <ol class="rounds">
      <li v-for="(r, k) in all" :key="k">
        <b>round {{ k + 1 }}</b>, budget {{ M(r.budget) }}{{ k === 0 && free ? `, ${M(free)} of it free gas first` : "" }}: takes {{ r.took.map(M).join(" + ") || "nothing" }}<template v-if="r.waiting.length">; {{ M(r.waiting[0]) }} doesn't fit, so {{ r.waiting.map(M).join(", ") }} wait</template>.
        <template v-if="k + 1 < all.length"> It uses {{ M(r.used) }}, so g* = {{ M(r.budget) }} − {{ M(r.used) }} = {{ M(r.budget - r.used) }}.</template>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.budget-rounds .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.tile .tile-value { font-size: 17px; white-space: nowrap; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.reports { display: flex; flex-wrap: wrap; gap: 6px; }
.rep { min-height: 32px; font-family: var(--vp-font-family-mono); }
.rounds { margin: 8px 0 0; padding-left: 1.3em; font-size: 14px; line-height: 1.6; }
</style>
