<!-- Lesson 12.5: a report against the chain. Pick which recent block it anchors on, nudge
     its state root, belt root or slot, say whether its package was seen before, and set
     its results' gas: the readout names the first rule broken, in the code's order, or
     "accepted". Computed in report-anchor.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { RECENT, REPORT_GAS, reportError, RULES, START, type Report } from "./report-anchor.ts";

const r = ref<Report>({ ...START, gas: [...START.gas] as [number, number] });
const result = computed(() => reportError(r.value));
const block = computed(() => RECENT.find((b) => b.slot === r.value.anchor));
const fmt = (n: number) => n.toLocaleString("en-US");
const set = (patch: Partial<Report>) => { r.value = { ...r.value, ...patch }; };
</script>

<template>
  <div class="widget report-anchor">
    <div class="readout" aria-live="polite">
      <div class="tile wide" :class="{ wrong: result }"><span class="tile-label">the report is</span><span class="tile-value">{{ result ? result.error : "accepted" }}</span></div>
      <div class="tile"><span class="tile-label">anchor</span><span class="tile-value">{{ r.anchor === null ? "unknown" : `slot ${r.anchor}` }}</span></div>
      <div class="tile"><span class="tile-label">gas, together</span><span class="tile-value">{{ fmt(r.gas[0] + r.gas[1]) }}</span></div>
    </div>
    <p class="line">
      <template v-if="result">{{ result.says }}: broken, and named first in the code's order. The vector: <code>{{ result.vector }}</code>.</template>
      <template v-else>Anchored on slot {{ block!.slot }}, header <code class="hash">{{ block!.header_hash }}</code>, with its state root, belt root and slot; a new package; {{ fmt(r.gas[0] + r.gas[1]) }} gas, under G_A = {{ fmt(REPORT_GAS) }}.</template>
    </p>
    <p class="row-says">anchored on which recent block (β_H†, lesson 9.2's eight)</p>
    <div class="row" role="group" aria-label="the anchor">
      <button v-for="b in RECENT" :key="b.slot" class="small" :class="{ chosen: r.anchor === b.slot }" :aria-pressed="r.anchor === b.slot" @click="set({ anchor: b.slot })">slot {{ b.slot }}</button>
      <button class="small" :class="{ chosen: r.anchor === null }" :aria-pressed="r.anchor === null" @click="set({ anchor: null })">a block nobody remembers</button>
    </div>
    <p class="row-says">its context, against that block</p>
    <div class="row">
      <button class="small" :class="{ chosen: !r.rootMatches }" :aria-pressed="!r.rootMatches" @click="set({ rootMatches: !r.rootMatches })">state root: {{ r.rootMatches ? "the block's" : "nudged" }}</button>
      <button class="small" :class="{ chosen: !r.beltMatches }" :aria-pressed="!r.beltMatches" @click="set({ beltMatches: !r.beltMatches })">belt root: {{ r.beltMatches ? "the block's" : "nudged" }}</button>
      <button class="small" :class="{ chosen: !r.slotMatches }" :aria-pressed="!r.slotMatches" @click="set({ slotMatches: !r.slotMatches })">slot: {{ r.slotMatches ? "the block's" : "nudged" }}</button>
    </div>
    <p class="row-says">its package</p>
    <div class="row" role="group" aria-label="the package">
      <button v-for="p in (['new', 'reported', 'pipeline'] as const)" :key="p" class="small" :class="{ chosen: r.package === p }" :aria-pressed="r.package === p" @click="set({ package: p })">{{ p === "new" ? "new" : p === "reported" ? "reported two blocks ago" : "in the pipeline" }}</button>
    </div>
    <p class="row-says">its two results' accumulation gas</p>
    <div class="row">
      <label v-for="k in 2" :key="k" class="num">result {{ k }} <input :value="r.gas[k - 1]" type="number" min="0" step="1000000" aria-label="gas" @input="(e) => { const g = [...r.gas] as [number, number]; g[k - 1] = Number((e.target as HTMLInputElement).value); set({ gas: g }); }" /></label>
      <button class="small" @click="set({ gas: [6_000_000, 5_000_000] })">6M + 5M (the question)</button>
    </div>
    <ol class="rules">
      <li v-for="x in RULES" :key="x.error" :class="{ broken: result?.error === x.error }">{{ x.says }} <code>{{ x.error }}</code></li>
    </ol>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.tile.wide .tile-value { min-width: 20ch; font-size: 18px; }
/* a refusal is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; overflow-wrap: anywhere; }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.row button.small { min-height: 32px; }
.num { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 11ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 13px; }
.rules { margin: 10px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.7; }
.rules li.broken { color: var(--changed-line); font-weight: 600; }
.rules code { font-size: 12px; }
</style>
