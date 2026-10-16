<!-- Lesson 17.3: transfer from the tests' service 0. Pick a receiver, an amount and the gas
     for it, and transfer: refused (WHO, LOW, CASH) for 575 gas, or sent, the money leaving
     now and the receiver's balance waiting. Sends add up until you start again. Computed in
     transfer-send.ts. -->
<script setup lang="ts">
import { ref } from "vue";
import type { Sent } from "./transfer-send.ts";
import { MIN_MEMO_GAS, MINIMUM, RECEIVER_BALANCE, START, transfer } from "./transfer-send.ts";

const state = ref({ ...START, outbox: [...START.outbox] });
const dest = ref(1);
const amount = ref(30);
const gas = ref(25);
const last = ref<Sent | null>(null);
function go() { const r = transfer(state.value, dest.value, amount.value, gas.value); state.value = r.state; last.value = r; }
const reset = () => { state.value = { ...START, outbox: [] }; last.value = null; };
const WHY: Record<string, string> = {
  OK: "Sent. The amount left service 0 now; the gas was paid up front, for the work the receiver will do.",
  WHO: "WHO: there's no such service. Nothing sent, 575 gas for asking.",
  LOW: `LOW: the receiver wants at least ${MIN_MEMO_GAS} gas for a memo. Nothing sent, 575 gas for asking.`,
  CASH: `CASH: paying would leave service 0 below its minimum balance, ${MINIMUM}. Nothing sent, 575 gas.`,
};
</script>

<template>
  <div class="widget transfer-send">
    <div class="readout" aria-live="polite">
      <div class="tile" :class="{ bad: last && last.answer !== 'OK' }"><span class="tile-label">φ₇</span><span class="tile-value">{{ last ? last.answer : "—" }}</span></div>
      <div class="tile"><span class="tile-label">service 0's balance</span><span class="tile-value">{{ state.balance.toLocaleString("en-US") }}</span></div>
      <div class="tile"><span class="tile-label">gas charged · left</span><span class="tile-value">{{ last ? last.charged.toLocaleString("en-US") : "—" }} · {{ state.gasLeft.toLocaleString("en-US") }}</span></div>
    </div>
    <p class="line">{{ last ? WHY[last.answer] : `Service 0 has 1,000, and must keep its minimum balance, ${MINIMUM}. Pick a receiver, an amount and gas, and transfer.` }}</p>
    <div class="controls">
      <span class="muted">to</span>
      <button v-for="d in [1, 0, 5]" :key="d" class="small" :class="{ chosen: dest === d }" :aria-pressed="dest === d" @click="dest = d">service {{ d }}</button>
      <span class="muted">amount</span>
      <button v-for="a in [30, 40, 900]" :key="a" class="small" :class="{ chosen: amount === a }" :aria-pressed="amount === a" @click="amount = a">{{ a }}</button>
      <span class="muted">gas</span>
      <button v-for="g in [25, 10]" :key="g" class="small" :class="{ chosen: gas === g }" :aria-pressed="gas === g" @click="gas = g">{{ g }}</button>
    </div>
    <div class="controls">
      <button class="small go" @click="go">transfer ▶</button>
      <button class="small" @click="reset">start again</button>
    </div>
    <p class="row-says">the run's outbox: delivered next round, not now</p>
    <p class="mono">{{ state.outbox.length ? state.outbox.map((t) => `→ ${t.dest}: ${t.amount}, ${t.gas} gas`).join("; ") : "empty" }}</p>
    <p class="muted">service 1's balance this round: {{ RECEIVER_BALANCE.toLocaleString("en-US") }}, unchanged: the money arrives in the next round (lesson 17.4).</p>
  </div>
</template>

<style scoped>
.transfer-send .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.row-says { margin: 8px 0 2px; font-size: 12px; color: var(--vp-c-text-2); }
.mono { margin: 0 0 4px; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
