<!-- The cryptography appendix: the algorithms your client borrows, and which bytes of a real
     block (Part 4's tiny vector) each one made, or holds the keys of. Tap an algorithm, or a
     field to see whose it is. Computed in crypto-map.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { ALGORITHMS, BLOCK_BYTES, FIELDS, inBlock, short, type AlgorithmId } from "./crypto-map.ts";

const chosen = ref<AlgorithmId>("ring");
const algorithm = computed(() => ALGORITHMS.find((a) => a.id === chosen.value)!);
const made = computed(() => inBlock(chosen.value));
const share = computed(() => `${((100 * made.value.bytes) / BLOCK_BYTES).toFixed(1)}%`);
const fmt = (n: number) => n.toLocaleString("en-US");
const PARTS = [
  { name: "header", fields: FIELDS.filter((f) => f.path.startsWith("header.")) },
  { name: "extrinsic", fields: FIELDS.filter((f) => f.path.startsWith("extrinsic.")) },
];
</script>

<template>
  <div class="widget crypto-map">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">algorithm</span><span class="tile-value">{{ algorithm.name }}</span></div>
      <div class="tile"><span class="tile-label">makes</span><span class="tile-value small">{{ algorithm.makes }}</span></div>
      <div class="tile"><span class="tile-label">in this {{ fmt(BLOCK_BYTES) }}-byte block</span><span class="tile-value">{{ fmt(made.bytes) }} bytes, {{ share }}</span></div>
      <div class="tile"><span class="tile-label">your client calls</span><span class="tile-value small">{{ algorithm.library }}{{ algorithm.lesson ? `, from ${algorithm.lesson}` : "" }}</span></div>
    </div>
    <p class="line">{{ algorithm.does }}</p>
    <div class="algorithms" role="group" aria-label="the algorithms">
      <button v-for="a in ALGORITHMS" :key="a.id" class="small" :class="[a.id, { chosen: chosen === a.id }]" :aria-pressed="chosen === a.id" @click="chosen = a.id">{{ a.name }}</button>
    </div>
    <div class="map">
      <div v-for="part in PARTS" :key="part.name" class="part">
        <p class="part-name">{{ part.name }}</p>
        <button v-for="f in part.fields" :key="f.path" class="field" :class="[f.algorithm, { lit: f.algorithm === chosen }]" :aria-pressed="f.algorithm === chosen" @click="chosen = f.algorithm">
          <span class="field-path">{{ short(f.path) }}</span><span class="field-size">{{ f.count > 1 ? `${f.count} × ` : "" }}{{ f.size }} B</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crypto-map .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.tile { min-width: 0; }
/* every value may wrap, with room kept for two lines, so the readout keeps its height at any width */
.tile .tile-value { font-size: 15px; white-space: normal; line-height: 1.35; min-height: 2.7em; }
.tile .tile-value.small { font-size: 13px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.algorithms { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.algorithms button.small { min-height: 32px; }
.map { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
.part-name { margin: 0 0 4px; font-size: 12px; color: var(--vp-c-text-2); text-transform: uppercase; letter-spacing: 0.04em; }
.field { display: flex; justify-content: space-between; gap: 8px; width: 100%; min-height: 32px; margin: 0 0 3px; padding: 4px 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-3); font-family: var(--vp-font-family-mono); font-size: 12px; text-align: left; cursor: pointer; }
.field-path { min-width: 0; overflow-wrap: anywhere; }
.field-size { flex: none; }
@media (max-width: 640px) { .line { min-height: 6.4em; } }
.field.lit { color: var(--vp-c-text-1); border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-brand-soft); font-weight: 600; }
</style>
