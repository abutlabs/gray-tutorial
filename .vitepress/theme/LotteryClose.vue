<!-- Lesson 8.4: set τ, this block's slot and how many tickets γ_A holds, and see whether the
     lottery closes now, whether the block carries the tickets mark, and who seals the next
     epoch, with the failing condition named. Tiny, E = 12, Y = 10. Computed in
     lottery-close.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { E, epochOf, hasMark, phaseOf, PRESETS, verdict, Y } from "./lottery-close.ts";

const before = ref(9);
const after = ref(10);
const tickets = ref(12);
const v = computed(() => verdict(before.value, after.value, tickets.value));
const mark = computed(() => hasMark(before.value, after.value, tickets.value));
const pick = (p: typeof PRESETS[number]) => { before.value = p.before; after.value = p.after; tickets.value = p.tickets; };
const chosen = (p: typeof PRESETS[number]) => before.value === p.before && after.value === p.after && tickets.value === p.tickets;
</script>

<template>
  <div class="widget lottery-close">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">τ = {{ before }}: e, m</span><span class="tile-value">{{ epochOf(before) }}, {{ phaseOf(before) }}</span></div>
      <div class="tile"><span class="tile-label">slot {{ after }}: e′, m′</span><span class="tile-value">{{ epochOf(after) }}, {{ phaseOf(after) }}</span></div>
      <div class="tile"><span class="tile-label">γ_A holds</span><span class="tile-value">{{ tickets }} of {{ E }}</span></div>
      <div class="tile" :class="{ turn: mark }"><span class="tile-label">tickets mark</span><span class="tile-value">{{ mark ? "yes" : "no" }}</span></div>
    </div>
    <p class="line">
      <b>Mark:</b> {{ v.mark }}. <b>Sealers:</b> {{ v.sealer }}.
      <span class="muted">The lottery closes at Y = {{ Y }}: the mark goes in the block with m &lt; Y ≤ m′; the winners seal an epoch that follows on directly from a lottery that closed full.</span>
    </p>
    <div class="controls">
      <label class="num">τ <input v-model.number="before" type="number" min="0" :max="after - 1" aria-label="the slot of the block before" /></label>
      <label class="num">slot <input v-model.number="after" type="number" :min="before + 1" aria-label="this block's slot" /></label>
      <label class="num">tickets <input v-model.number="tickets" type="number" min="0" :max="E" aria-label="how many tickets the lottery holds" /></label>
    </div>
    <div class="controls">
      <button v-for="p in PRESETS" :key="p.says" class="small" :class="{ chosen: chosen(p) }" :aria-pressed="chosen(p)" @click="pick(p)">{{ p.says }}</button>
    </div>
    <div class="phases" aria-label="the phases of an epoch">
      <span v-for="m in E" :key="m" class="phase" :class="{ open: m - 1 < Y, before: phaseOf(before) === m - 1 && epochOf(before) === epochOf(after), after: phaseOf(after) === m - 1 }">{{ m - 1 }}</span>
    </div>
    <p class="legend">Phases 0 to {{ Y - 1 }} take tickets; from {{ Y }} the lottery is closed. τ and the block's slot are marked where they fall in the same epoch.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; }
.tile.turn { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 6.4em; }
.muted { color: var(--vp-c-text-2); }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.num { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 7ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 14px; }
.phases { display: flex; flex-wrap: wrap; gap: 3px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.phase { min-width: 2.2em; padding: 6px 0; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 3px; background: var(--vp-c-bg-soft); opacity: 0.6; }
.phase.open { background: var(--bit-low); border-color: var(--bit-low-line); }
.phase.before { opacity: 1; border: 2px solid var(--vp-c-text-2); }
.phase.after { opacity: 1; border: 2px solid var(--vp-c-brand-1); font-weight: 700; }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
</style>
