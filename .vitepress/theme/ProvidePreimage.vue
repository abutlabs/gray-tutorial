<!-- Lesson 14.1: a block at slot 8 carries preimages. Tap one: the key it lands on, the
     request found there, its history before and after, and the history's bytes; two of
     them find no waiting request and are skipped. Computed in provide-preimage.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { historyBytes, keyOf, MEANS, PREIMAGES, provide, SLOT } from "./provide-preimage.ts";

const picked = ref(0);
const p = computed(() => PREIMAGES[picked.value]);
const r = computed(() => provide(p.value));
const show = (h: number[] | null) => (h === null ? "none" : `[${h.join(", ")}]`);
</script>

<template>
  <div class="widget provide-preimage">
    <div class="readout" aria-live="polite">
      <div class="tile wide"><span class="tile-label">the request's key</span><span class="tile-value key">{{ keyOf(p) }}</span></div>
      <div class="tile"><span class="tile-label">history before</span><span class="tile-value">{{ show(p.history) }}</span></div>
      <div class="tile" :class="{ turn: r.provided, wrong: !r.provided }"><span class="tile-label">after block {{ SLOT }}</span><span class="tile-value">{{ show(r.after) }}</span></div>
      <div class="tile"><span class="tile-label">as bytes</span><span class="tile-value bytes">{{ r.after === null ? "–" : historyBytes(r.after) }}</span></div>
    </div>
    <p class="line">
      {{ r.provided ? "Providable" : "Not providable" }}: {{ r.why }}.
      <template v-if="p.history !== null"> Before, {{ MEANS(p.history) }} (<code class="bytes">{{ historyBytes(p.history) }}</code>).</template>
      <template v-if="r.provided"> After, {{ MEANS(r.after!) }}.</template>
    </p>
    <p class="row-says">block {{ SLOT }}'s preimages, and two more to try</p>
    <div class="row" role="group" aria-label="the preimages">
      <button v-for="(x, i) in PREIMAGES" :key="i" class="small chip" :class="{ chosen: i === picked, skipped: !provide(x).provided }" :aria-pressed="i === picked" @click="picked = i">service {{ x.service }} · {{ x.bytes }} bytes · {{ x.hash }}</button>
    </div>
    <p class="legend">The data proves itself: its hash is in the key, so other bytes find no request. A history is a list of slots: <code class="bytes">00</code> is <code>[]</code>, waiting.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.tile.wide .tile-value { min-width: 24ch; font-size: 14px; overflow-wrap: anywhere; }
.tile.turn { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
/* a skipped preimage changes nothing, and that's worth seeing: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.row { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.chip.skipped { border-style: dashed; }
.legend { margin: 10px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6; }
</style>
