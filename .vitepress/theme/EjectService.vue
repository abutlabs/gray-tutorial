<!-- Lesson 17.7: eject, on the tests' setup: service 1 named service 0 as its ejector and
     forgot its one preimage at slot 10. Pick the target and the slot, eject: the check that
     fails, or the balances moving and service 1 gone. Computed in eject-service.ts. -->
<script setup lang="ts">
import { ref } from "vue";
import type { Result } from "./eject-service.ts";
import { eject, START } from "./eject-service.ts";

const state = ref({ ...START, one: START.one && { ...START.one } });
const d = ref(1);
const t = ref(100);
const last = ref<Result | null>(null);
function go() { const r = eject(state.value, d.value, t.value); state.value = r.state; last.value = r; }
const reset = () => { state.value = { ...START, one: START.one && { ...START.one } }; last.value = null; };
</script>

<template>
  <div class="widget eject-service">
    <div class="readout" aria-live="polite">
      <div class="tile" :class="{ bad: last && last.answer !== 'OK' }"><span class="tile-label">φ₇</span><span class="tile-value">{{ last ? last.answer : "—" }}</span></div>
      <div class="tile"><span class="tile-label">service 0's balance</span><span class="tile-value">{{ state.balance0.toLocaleString("en-US") }}</span></div>
      <div class="tile"><span class="tile-label">service 1</span><span class="tile-value">{{ state.one ? state.one.balance.toLocaleString("en-US") : "gone" }}</span></div>
    </div>
    <p class="line">{{ last ? `${last.answer}: ${last.why}.` : "Service 1's code hash is service 0's id, 32 zero bytes; it keeps one 20-byte request, provided at 5 and forgotten at 10. D = 32 on tiny." }}</p>
    <div class="controls">
      <span class="muted">eject</span>
      <button v-for="x in [1, 0, 5]" :key="x" class="small" :class="{ chosen: d === x }" :aria-pressed="d === x" @click="d = x">service {{ x }}</button>
      <span class="muted">at slot</span>
      <button v-for="s in [40, 42, 43, 100]" :key="s" class="small" :class="{ chosen: t === s }" :aria-pressed="t === s" @click="t = s">{{ s }}</button>
    </div>
    <div class="controls">
      <button class="small go" @click="go">eject ▶</button>
      <button class="small" @click="reset">start again</button>
    </div>
  </div>
</template>

<style scoped>
.eject-service .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
</style>
