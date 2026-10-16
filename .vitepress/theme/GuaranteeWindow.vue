<!-- Lesson 12.4: set the block's slot τ′ and a guarantee's slot and see the two rotations
     the window covers, which assignment the guarantee answers to, and future_report_slot
     or report_epoch_before_last outside it; then set |κ′| and the core and see which cores
     are active now. Computed in guarantee-window.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { activeCores, assignmentOf, coreError, SIZES, slotError, windowStart, type Size } from "./guarantee-window.ts";

const size = ref<Size>("tiny");
const tau = ref(13);
const slot = ref(8);
const validators = ref(6);
const core = ref(0);
const R = computed(() => SIZES[size.value].R);
const start = computed(() => windowStart(size.value, tau.value));
const sErr = computed(() => slotError(size.value, tau.value, slot.value));
const cErr = computed(() => coreError(size.value, validators.value, core.value));
const active = computed(() => activeCores(size.value, validators.value));
const slots = computed(() => { const from = Math.max(0, start.value - R.value); return Array.from({ length: tau.value + R.value - from + 1 }, (_, i) => from + i); });
const setSize = (s: Size) => { size.value = s; const d = SIZES[s]; tau.value = s === "tiny" ? 13 : 1234; slot.value = s === "tiny" ? 8 : 1226; validators.value = d.validators; core.value = 0; };
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget guarantee-window">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">window, R = {{ R }}</span><span class="tile-value">{{ fmt(start) }}–{{ fmt(tau) }}</span></div>
      <div class="tile"><span class="tile-label">slot {{ fmt(slot) }} answers to</span><span class="tile-value">{{ sErr ? "–" : assignmentOf(size, tau, slot) }}</span></div>
      <div class="tile" :class="{ wrong: sErr }"><span class="tile-label">the slot rule</span><span class="tile-value">{{ sErr ?? "in the window" }}</span></div>
      <div class="tile" :class="{ wrong: cErr }"><span class="tile-label">core {{ core }} with |κ′| = {{ fmt(validators) }}</span><span class="tile-value">{{ cErr ?? "active" }}</span></div>
    </div>
    <p class="line">
      R(⌊{{ fmt(tau) }}/{{ R }}⌋ − 1) = {{ fmt(start) }} ≤ slot ≤ {{ fmt(tau) }}: this rotation or the last, never the future.
      {{ fmt(validators) }} validators keep ⌊{{ fmt(validators) }}/3⌋ = {{ fmt(Math.floor(validators / 3)) }} cores active{{ Math.floor(validators / 3) > SIZES[size].C ? `, capped at C = ${fmt(SIZES[size].C)}` : "" }}: cores 0 to {{ fmt(active - 1) }}, whatever slot a guarantee cites.
    </p>
    <div class="controls">
      <button v-for="s in (['tiny', 'full'] as Size[])" :key="s" class="small" :class="{ chosen: size === s }" :aria-pressed="size === s" @click="setSize(s)">{{ s }}: R = {{ SIZES[s].R }}, C = {{ fmt(SIZES[s].C) }}</button>
    </div>
    <div class="controls">
      <label class="num">τ′ <input v-model.number="tau" type="number" :min="R" aria-label="the block's slot" /></label>
      <label class="num">guarantee's slot <input v-model.number="slot" type="number" min="0" aria-label="the guarantee's slot" /></label>
      <label class="num">|κ′| <input v-model.number="validators" type="number" min="3" max="1023" aria-label="how many validators" /></label>
      <label class="num">core <input v-model.number="core" type="number" min="0" :max="SIZES[size].C" aria-label="the report's core" /></label>
    </div>
    <div v-if="size === 'tiny'" class="slots" aria-label="the slots around the block">
      <span v-for="s in slots" :key="s" class="slot" :class="{ last: s >= start && s < start + R, now: s >= start + R && s <= tau, future: s > tau, pick: s === slot, tau: s === tau }">{{ s }}</span>
    </div>
    <p class="legend">{{ size === "tiny" ? "The last rotation, this one up to τ′, and the future beyond it; the guarantee's slot is outlined." : "On full the window is 10 slots back from the rotation's start; the numbers are the same rule." }}</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; font-size: 16px; }
/* a refusal is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.num { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 7ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 14px; }
.slots { display: flex; flex-wrap: wrap; gap: 3px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.slot { min-width: 2.4em; padding: 6px 0; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 3px; background: var(--vp-c-bg-soft); opacity: 0.5; }
.slot.last { background: var(--bit-low); opacity: 1; }
.slot.now { background: var(--bit-top); opacity: 1; }
.slot.future { background: var(--changed); opacity: 0.7; }
.slot.pick { outline: 2px solid var(--vp-c-brand-1); outline-offset: 1px; font-weight: 700; }
.slot.tau { border: 2px solid var(--vp-c-text-1); }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
</style>
