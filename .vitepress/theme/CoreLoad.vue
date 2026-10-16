<!-- Lesson 18.2: a core's data load and popularity. For each of two cores set how many of
     the 6 validators assure it, and the report's exported segments: popularity, whether the
     report became available, and the load worked out in parts. Computed in core-load.ts. -->
<script setup lang="ts">
import { ref } from "vue";
import { ASSURED, available, BUNDLE, dataLoad, pages, SEGMENT_SIZE, VALIDATORS } from "./core-load.ts";

const assurers = ref([...ASSURED]);
const segments = ref(3);
const set = (k: number, v: number) => { const a = [...assurers.value]; a[k] = v; assurers.value = a; };
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget core-load">
    <div class="readout" aria-live="polite">
      <div v-for="(n, k) in assurers" :key="k" class="tile"><span class="tile-label">core {{ k }}: popularity · load</span><span class="tile-value">{{ n }} · {{ available(n) ? fmt(dataLoad(BUNDLE, segments)) : 0 }}</span></div>
    </div>
    <p class="line">A load counts only a report that became available: more than two thirds of the {{ VALIDATORS }}, so at least 5. {{ segments }} segment{{ segments === 1 ? "" : "s" }} take ⌈{{ segments }} × 65 / 64⌉ = {{ pages(segments) }} page{{ pages(segments) === 1 ? "" : "s" }}: the segments, and a proof page for every 64. Popularity counts every assurance naming the core, enough or not.</p>
    <div v-for="(n, k) in assurers" :key="k" class="controls">
      <span class="muted">core {{ k }}: assured by</span>
      <button v-for="v in VALIDATORS + 1" :key="v" class="small num" :class="{ chosen: n === v - 1 }" :aria-pressed="n === v - 1" @click="set(k, v - 1)">{{ v - 1 }}</button>
    </div>
    <div class="controls">
      <span class="muted">exported segments</span>
      <button v-for="g in [0, 3, 64, 65, 130]" :key="g" class="small num" :class="{ chosen: segments === g }" @click="segments = g">{{ g }}</button>
    </div>
    <p v-for="(n, k) in assurers" :key="`s${k}`" class="sum">core {{ k }}: {{ available(n) ? `available: ${fmt(BUNDLE)} + ${fmt(SEGMENT_SIZE)} × ${pages(segments)} = ${fmt(dataLoad(BUNDLE, segments))}` : `${n} of ${VALIDATORS} isn't enough: not available, load 0` }}</p>
  </div>
</template>

<style scoped>
.core-load .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.num { min-width: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.sum { margin: 4px 0; font-family: var(--vp-font-family-mono); font-size: 13px; overflow-wrap: anywhere; }
</style>
