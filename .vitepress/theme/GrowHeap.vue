<!-- Lesson 16.3: grow_heap on tinyCode's layout. Pick the page the heap should end at and
     call it: a, b and h, which case, the gas, and the pages it makes writable. Calls add up
     until you start again. Computed in grow-heap.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Call } from "./grow-heap.ts";
import { A, ASKS, B, BUDGET, growHeap, H0 } from "./grow-heap.ts";

const h = ref(H0);
const gas = ref(BUDGET);
const want = ref(53);
const last = ref<Call | null>(null);
function call() {
  const c = growHeap(h.value, want.value);
  h.value = c.after;
  gas.value -= c.gas;
  last.value = c;
}
const reset = () => { h.value = H0; gas.value = BUDGET; last.value = null; };
const fmt = (n: number) => n.toLocaleString("en-US");
const TILES = Array.from({ length: 10 }, (_, k) => A + k);
const kind = (p: number) => (p === A ? "w" : p < H0 ? "heap" : p < h.value ? "new" : "empty");
const fresh = computed(() => (last.value?.grew ? new Set(Array.from({ length: last.value.after - last.value.before }, (_, k) => last.value!.before + k)) : new Set<number>()));
</script>

<template>
  <div class="widget grow-heap">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">h, the heap ends at page</span><span class="tile-value">{{ h }}</span></div>
      <div class="tile"><span class="tile-label">φ₇ after</span><span class="tile-value">{{ last ? fmt(last.r7) : "—" }}</span></div>
      <div class="tile"><span class="tile-label">gas charged</span><span class="tile-value">{{ last ? last.gas : "—" }}</span></div>
      <div class="tile"><span class="tile-label">gas left</span><span class="tile-value">{{ fmt(gas) }}</span></div>
    </div>
    <p class="line">
      <template v-if="last">grow_heap({{ fmt(last.want) }}): {{ last.why }}.</template>
      <template v-else>a = (2 · 2^16 + Z(3)) / 4,096 = {{ A }}: w's page. Then 1 heap page, so h = {{ H0 }}. b = (2^32 − 3 · 2^16 − 2^24 − P(100)) / 4,096 = {{ fmt(B) }}, a zone short of the stack.</template>
    </p>
    <div class="controls">
      <span class="muted">φ₇, the page to end at</span>
      <button v-for="w in ASKS" :key="w" class="small" :class="{ chosen: want === w }" :aria-pressed="want === w" @click="want = w">{{ w > B ? "past b" : w }}</button>
    </div>
    <div class="controls">
      <button class="small go" @click="call">grow_heap ▶</button>
      <button class="small" @click="reset">start again</button>
    </div>
    <p class="row-says">the read-write zone, from page a = {{ A }}</p>
    <div class="pages">
      <span v-for="p in TILES" :key="p" class="page" :class="[kind(p), { fresh: fresh.has(p) }]"><small>{{ p }}</small>{{ kind(p) === "empty" ? "—" : kind(p) }}</span>
      <span class="more">… to b = {{ fmt(B) }}</span>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; font-size: 20px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.pages { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; }
.page { display: flex; flex-direction: column; align-items: center; min-width: 46px; padding: 2px 4px; border: 1px solid var(--vp-c-divider); border-radius: 4px; font-size: 12px; font-family: var(--vp-font-family-mono); }
.page small { font-size: 10px; color: var(--vp-c-text-3); }
.page.w { background: var(--bit-top); }
.page.heap, .page.new { background: var(--bit-low); }
.page.empty { border-style: dashed; color: var(--vp-c-text-3); }
.page.fresh { border: 2px solid var(--vp-c-brand-1); }
.more { font-size: 12px; color: var(--vp-c-text-3); }
</style>
