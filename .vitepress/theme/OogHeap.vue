<!-- Lesson 19.6: out of gas while growing the heap, under two rules. Fuzzy block 31's service
     holds 454,214 of its 2,000,000 as it asks; pick how many pages: the cost, and what each
     rule leaves, the exit, and the gas used. Computed in oog-heap.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BUDGET, cost, grow, LEFT, PAGES } from "./oog-heap.ts";

const pages = ref(5000);
const old = computed(() => grow(pages.value, LEFT, "old"));
const vec = computed(() => grow(pages.value, LEFT, "vectors"));
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget oog-heap">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">cost: 275 + 121 × {{ fmt(pages) }}</span><span class="tile-value">{{ fmt(cost(pages)) }}</span></div>
      <div class="tile"><span class="tile-label">GP 0.8.0's text: used</span><span class="tile-value">{{ fmt(old.used) }}</span></div>
      <div class="tile" :class="{ bad: vec.exit === 'oog' }"><span class="tile-label">the vectors' rule: used</span><span class="tile-value">{{ fmt(vec.used) }}</span></div>
    </div>
    <p class="line">
      <template v-if="vec.exit === 'continue'">{{ fmt(cost(pages)) }} fits in the {{ fmt(LEFT) }} left: both rules grow the heap, and the service carries on.</template>
      <template v-else>{{ fmt(cost(pages)) }} is more than the {{ fmt(LEFT) }} left. The old text checks first and takes nothing: the gas stays {{ fmt(LEFT) }}, so u = {{ fmt(BUDGET) }} − {{ fmt(LEFT) }} = {{ fmt(old.used) }}. The vectors spend it, as charge does for any call: ϱ′ = {{ fmt(vec.left) }}, so u = {{ fmt(BUDGET) }} − max(ϱ′, 0) = {{ fmt(vec.used) }}. C(13) records u, so the state roots differ.</template>
    </p>
    <div class="controls">
      <span class="muted">pages asked for</span>
      <button v-for="p in PAGES" :key="p" class="small" :class="{ chosen: pages === p }" :aria-pressed="pages === p" @click="pages = p">{{ fmt(p) }}</button>
    </div>
  </div>
</template>

<style scoped>
.oog-heap .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tile { min-width: 0; }
.tile .tile-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 6.4em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
</style>
