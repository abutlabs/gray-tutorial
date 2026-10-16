<!-- Lesson 19.5: a set's one order. ξ's newest slot after storage_light block 6 holds two
     packages; put them in either order: the bytes ξ would hold, and the state root, which
     matches the trace's only when the set is written sorted. Data in set-order.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { bytesOf, isSorted, OTHER_ROOT, PACKAGES, SORTED_ROOT } from "./set-order.ts";

const order = ref([...PACKAGES]);
const sorted = computed(() => isSorted(order.value));
const swap = () => { order.value = [order.value[1], order.value[0]]; };
</script>

<template>
  <div class="widget set-order">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">written in</span><span class="tile-value">{{ sorted ? "sorted order" : "accumulated order" }}</span></div>
      <div class="tile" :class="{ bad: !sorted }"><span class="tile-label">the state root</span><span class="tile-value">{{ (sorted ? SORTED_ROOT : OTHER_ROOT).slice(0, 12) }}… {{ sorted ? "= the trace's" : "≠" }}</span></div>
    </div>
    <p class="line">{{ sorted ? "Sorted, the set's bytes are the ones every client writes, and the root is the trace's." : "The same two packages in another order: the same set, but other bytes, so another state root. Appendix D writes every set sorted." }}</p>
    <div class="controls"><button class="small" @click="swap">swap the two</button></div>
    <p class="row-says">ξ's newest slot, as bytes: how many, then each package</p>
    <p class="mono">{{ bytesOf(order) }}</p>
  </div>
</template>

<style scoped>
.set-order .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.tile .tile-value { font-size: 16px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.controls { display: flex; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.row-says { margin: 8px 0 2px; font-size: 12px; color: var(--vp-c-text-2); }
.mono { margin: 0; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
