<!-- Lesson 7.1: set τ, the slot of the block before, and this block's slot, on tiny or full,
     and see each slot's epoch and phase, whether the epoch turns over, and the four η rows
     sliding down one (η₃ dropped) or staying. Computed in epoch-turn.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { entropyHistory, EPOCH_LENGTH, epochOf, historyIn, newEpoch, phaseOf, PRESETS, type Size } from "./epoch-turn.ts";

const size = ref<Size>("tiny");
const tau = ref(11);
const slot = ref(12);
const E = computed(() => EPOCH_LENGTH[size.value]);
const isNew = computed(() => newEpoch(size.value, tau.value, slot.value));
const e = computed(() => epochOf(size.value, tau.value));
const e2 = computed(() => epochOf(size.value, slot.value));
/** The η rows before the block: η₀ fresh, the history as the trace has it in τ's epoch (tiny only shows real values). */
const before = computed<[string, string, string, string]>(() => ["η₀, stirred every block", ...(size.value === "tiny" ? historyIn(e.value) : ["—", "—", "—"] as [string, string, string])]);
const after = computed(() => entropyHistory(before.value, isNew.value));
const pick = (p: { tau: number; slot: number }) => { tau.value = p.tau; slot.value = p.slot; };
const setSize = (s: Size) => { size.value = s; pick(PRESETS[s][0]); };
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget epoch-turn">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">τ = {{ fmt(tau) }}: epoch, phase</span><span class="tile-value">{{ e }}, {{ phaseOf(size, tau) }}</span></div>
      <div class="tile"><span class="tile-label">slot {{ fmt(slot) }}: epoch, phase</span><span class="tile-value">{{ e2 }}, {{ phaseOf(size, slot) }}</span></div>
      <div class="tile" :class="{ turn: isNew }"><span class="tile-label">e′ &gt; e: a new epoch</span><span class="tile-value">{{ isNew ? "yes" : "no" }}</span></div>
      <div class="tile"><span class="tile-label">E</span><span class="tile-value">{{ fmt(E) }}</span></div>
    </div>
    <p class="line">
      e = ⌊{{ fmt(slot) }} / {{ fmt(E) }}⌋ = {{ e2 }}, m = {{ fmt(slot) }} mod {{ fmt(E) }} = {{ phaseOf(size, slot) }}.
      <template v-if="isNew">Epoch {{ e2 }} is greater than the epoch of the block before, {{ e }}: the header carries an epoch mark, and the entropy history moves along one, the oldest forgotten.</template>
      <template v-else>The block before was in the same epoch, so nothing turns: no epoch mark, and η₁ to η₃ stay as they are.</template>
    </p>
    <div class="controls" role="group" aria-label="the size">
      <button v-for="s in (['tiny', 'full'] as Size[])" :key="s" class="small" :class="{ chosen: size === s }" :aria-pressed="size === s" @click="setSize(s)">{{ s }}: E = {{ fmt(EPOCH_LENGTH[s]) }}</button>
    </div>
    <div class="controls">
      <label class="num">τ <input v-model.number="tau" type="number" min="0" :max="slot - 1" aria-label="the slot of the block before" /></label>
      <label class="num">slot <input v-model.number="slot" type="number" :min="tau + 1" aria-label="this block's slot" /></label>
      <button v-for="p in PRESETS[size]" :key="p.says" class="small" :class="{ chosen: tau === p.tau && slot === p.slot }" :aria-pressed="tau === p.tau && slot === p.slot" @click="pick(p)">{{ p.says }}</button>
    </div>
    <table class="eta">
      <thead><tr><th></th><th>before the block</th><th>after</th></tr></thead>
      <tbody>
        <tr><td>η₀</td><td>{{ before[0] }}</td><td>stirred again (Part 8)</td></tr>
        <tr v-for="k in 3" :key="k" :class="{ moved: isNew }"><td>η{{ ['₁', '₂', '₃'][k - 1] }}</td><td class="hash">{{ before[k] }}</td><td class="hash">{{ after[k - 1] }}</td></tr>
      </tbody>
    </table>
    <p class="legend">{{ size === "tiny" ? "The η values are the trace's: the η₀ that retired when each epoch of the safrole trace began, as bin/epochs.ts prints them." : "On full the trace has no values to show; the rule is the same." }}</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.tile.turn { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.num { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 8ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 14px; }
.eta { margin: 0; font-size: 13px; }
.eta th, .eta td { padding: 3px 8px; }
.eta td.hash { font-family: var(--vp-font-family-mono); font-size: 12px; }
.eta tr.moved td:last-child { background: var(--vp-c-brand-soft); }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
</style>
