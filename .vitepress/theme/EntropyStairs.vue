<!-- Lesson 8.1: the entropy staircase. Pick one of three safrole vectors and apply its
     block: η₀ becomes a fresh hash, stirred in the page from the vector's VRF output; at a
     new epoch the history steps down one row and η₃ falls off; over two skipped epochs it
     still moves just once. Computed in entropy-stairs.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { epochOf, epochsSkipped, ETA_VECTORS, isNewEpoch, nextEntropy, SAYS, short } from "./entropy-stairs.ts";

const vector = ref(ETA_VECTORS[0]);
const applied = ref(false);
const after = computed(() => nextEntropy(vector.value));
const matches = computed(() => after.value.every((h, i) => h === vector.value.after[i]));
const isNew = computed(() => isNewEpoch(vector.value));
const pick = (v: typeof ETA_VECTORS[number]) => { vector.value = v; applied.value = false; };
/** Where a row's value after came from: η₀ is new; η_k is η_{k−1} before at a new epoch, else itself. */
const from = (k: number) => (k === 0 ? "H(η₀ ⌢ Y)" : isNew.value ? `η${k - 1} before` : "unchanged");
</script>

<template>
  <div class="widget entropy-stairs">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">slot τ → slot</span><span class="tile-value">{{ vector.tau }} → {{ vector.slot }}</span></div>
      <div class="tile"><span class="tile-label">epoch {{ epochOf(vector.tau) }} → {{ epochOf(vector.slot) }}: new</span><span class="tile-value">{{ isNew ? "yes" : "no" }}</span></div>
      <div class="tile wide"><span class="tile-label">Y(H_V), the VRF output</span><span class="tile-value hash">{{ short(vector.vrf) }}</span></div>
      <div class="tile"><span class="tile-label">η′ = the vector's</span><span class="tile-value">{{ applied ? (matches ? "yes" : "no") : "–" }}</span></div>
    </div>
    <p class="line">
      <template v-if="!applied">{{ SAYS[vector.name] }}. Apply the block: η₀ is stirred, η′₀ = H(η₀ ⌢ Y), and {{ isNew ? "the history steps down one row, the oldest falling off" : "the history stays as it is" }}.</template>
      <template v-else-if="epochsSkipped(vector) > 1">Two epochs skipped, and the history moved once: the Gray Paper asks only <em>whether</em> a new epoch began, never how many.</template>
      <template v-else-if="isNew">A staircase: each old value stepped down one row, η₀ got a brand-new hash, and the oldest fell off the bottom.</template>
      <template v-else>Only η₀ changed. η₁ to η₃ move at a new epoch, and this block didn't start one.</template>
    </p>
    <div class="controls">
      <button v-for="v in ETA_VECTORS" :key="v.name" class="small" :class="{ chosen: vector === v }" :aria-pressed="vector === v" @click="pick(v)">{{ SAYS[v.name] }}</button>
      <button class="small go" :aria-pressed="applied" @click="applied = !applied">{{ applied ? "before the block" : "apply the block ▶" }}</button>
    </div>
    <table class="eta">
      <thead><tr><th></th><th>before</th><th>after</th><th>from</th></tr></thead>
      <tbody>
        <tr v-for="k in 4" :key="k" :class="{ moved: applied && (k === 1 || isNew) }">
          <td>η{{ ['₀', '₁', '₂', '₃'][k - 1] }}</td>
          <td class="hash">{{ short(vector.before[k - 1]) }}</td>
          <td class="hash">{{ applied ? short(after[k - 1]) : "" }}</td>
          <td class="muted">{{ applied ? from(k - 1) : "" }}</td>
        </tr>
      </tbody>
    </table>
    <p class="legend">The values are the vector's; η′₀ is hashed here, in your browser, from η₀ and the VRF output.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.tile.wide .tile-value { min-width: 20ch; font-size: 16px; }
.tile .tile-value.hash { font-size: 15px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.eta { margin: 0; font-size: 13px; }
.eta th, .eta td { padding: 3px 8px; }
.eta td.hash { font-family: var(--vp-font-family-mono); font-size: 12px; }
.eta tr.moved td:nth-child(3) { background: var(--vp-c-brand-soft); }
.muted { color: var(--vp-c-text-2); font-size: 12px; }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
@media (max-width: 640px) { .eta th, .eta td { padding: 3px 4px; } .eta td.hash { font-size: 11px; } }
</style>
